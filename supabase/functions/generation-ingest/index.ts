import { z } from 'npm:zod@4';
import {
  GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS,
  transferGeneratedOutput,
} from '../../../src/lib/generated-output-transfer.ts';
import { adminClient, requireGenerationJob } from '../_shared/auth.ts';
import { b2Bucket, b2Client, mediaStorageKey } from '../_shared/b2.ts';
import { errorResponse, json, options } from '../_shared/cors.ts';
import { openBoundedGeneratedOutput } from '../_shared/generated-output.ts';
import { generatedOutputStorage } from '../_shared/generated-output-storage.ts';
import {
  loadGenerationRow,
  runwayOutputHosts,
  runwayStatusProvider,
} from '../_shared/generation-service.ts';

const inputSchema = z.object({ generationId: z.string().uuid() }).strict();

function extensionFor(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'video/quicktime') return 'mov';
  if (contentType === 'video/webm') return 'webm';
  if (contentType === 'video/x-matroska') return 'mkv';
  return 'mp4';
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    requireGenerationJob(request);
    const { generationId } = inputSchema.parse(await request.json());
    const admin = adminClient();
    const generation = await loadGenerationRow(admin, generationId);
    if (generation.operational_status === 'completed') {
      return json(request, { saved: true, alreadyCompleted: true });
    }
    if (generation.operational_status !== 'saving' || !generation.provider_job_id) {
      throw new Error('Generation is not ready for bounded output ingest.');
    }

    const provider = runwayStatusProvider();
    const { temporaryUrl } = await provider.retrieveOutput(generation.provider_job_id);
    const maximumBytes = Math.min(250_000_000, Number(generation.reserved_output_bytes));
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
      throw new Error('Generation has no valid output-byte reservation.');
    }
    const transferController = new AbortController();
    const transferStartedAt = Date.now();
    const transferDeadlineAt = transferStartedAt + GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS;
    const transferTimeout = setTimeout(
      () => transferController.abort(),
      GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS
    );
    let savedOutput: {
      filename: string;
      storageKey: string;
      contentType: string;
      contentLength: number;
    };
    try {
      const output = await openBoundedGeneratedOutput(temporaryUrl, {
        allowedHosts: runwayOutputHosts(),
        maximumBytes,
        signal: transferController.signal,
      });
      const filename = `runway-${generation.media_kind}-${generation.id}.${extensionFor(output.contentType)}`;
      const storageKey = mediaStorageKey(generation.owner_id, generation.id, filename);
      await transferGeneratedOutput({
        body: output.body,
        contentLength: output.contentLength,
        contentType: output.contentType,
        maximumBytes,
        storageKey,
        generationId: generation.id,
        storage: generatedOutputStorage(b2Client(), b2Bucket()),
        signal: transferController.signal,
        clock: { now: () => Date.now(), deadlineAt: transferDeadlineAt },
      });
      savedOutput = {
        filename,
        storageKey,
        contentType: output.contentType,
        contentLength: output.contentLength,
      };
    } finally {
      clearTimeout(transferTimeout);
    }

    const { data: assetId, error } = await admin.rpc('complete_generation_ingest', {
      target_generation_id: generation.id,
      target_owner_id: generation.owner_id,
      output_filename: savedOutput.filename,
      output_mime_type: savedOutput.contentType,
      output_bytes: savedOutput.contentLength,
      output_storage_key: savedOutput.storageKey,
    });
    if (error) throw error;
    return json(request, { saved: true, alreadyCompleted: false, assetId });
  } catch (error) {
    return errorResponse(request, error);
  }
});
