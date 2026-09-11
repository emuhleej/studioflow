import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
  UploadPartCommand,
} from 'npm:@aws-sdk/client-s3@3';
import type { GeneratedOutputStorage } from '../../../src/lib/generated-output-transfer.ts';

const generationMetadataKey = 'studioflow-generation-id';
const abortCleanupTimeoutMs = 10_000;

function sendOptions(signal: AbortSignal | undefined): { abortSignal?: AbortSignal } {
  return signal ? { abortSignal: signal } : {};
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

export function generatedOutputStorage(client: S3Client, bucket: string): GeneratedOutputStorage {
  return {
    async inspect(storageKey, signal) {
      try {
        const object = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: storageKey }),
          sendOptions(signal)
        );
        return {
          bytes: Number(object.ContentLength),
          contentType: object.ContentType ?? '',
          generationId: object.Metadata?.[generationMetadataKey] ?? null,
        };
      } catch (error) {
        if (isMissingObject(error)) return null;
        throw error;
      }
    },

    async putObject(input) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.storageKey,
          Body: input.body,
          ContentLength: input.body.byteLength,
          ContentType: input.contentType,
          Metadata: { [generationMetadataKey]: input.generationId },
        }),
        sendOptions(input.signal)
      );
    },

    async createMultipart(input) {
      const created = await client.send(
        new CreateMultipartUploadCommand({
          Bucket: bucket,
          Key: input.storageKey,
          ContentType: input.contentType,
          Metadata: { [generationMetadataKey]: input.generationId },
        }),
        sendOptions(input.signal)
      );
      if (!created.UploadId) {
        throw new Error('Generated output multipart setup did not return an upload ID.');
      }
      return { uploadId: created.UploadId };
    },

    async uploadPart(input) {
      const uploaded = await client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: input.storageKey,
          UploadId: input.uploadId,
          PartNumber: input.partNumber,
          Body: input.body,
          ContentLength: input.body.byteLength,
        }),
        sendOptions(input.signal)
      );
      if (!uploaded.ETag) {
        throw new Error('Generated output part upload did not return an ETag.');
      }
      return { etag: uploaded.ETag };
    },

    async completeMultipart(input) {
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: input.storageKey,
          UploadId: input.uploadId,
          MultipartUpload: {
            Parts: input.parts.map((part) => ({
              ETag: part.etag,
              PartNumber: part.partNumber,
            })),
          },
        }),
        sendOptions(input.signal)
      );
    },

    async abortMultipart(input) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), abortCleanupTimeoutMs);
      try {
        await client.send(
          new AbortMultipartUploadCommand({
            Bucket: bucket,
            Key: input.storageKey,
            UploadId: input.uploadId,
          }),
          { abortSignal: controller.signal }
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
