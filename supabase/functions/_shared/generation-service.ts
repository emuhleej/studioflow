import { GetObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { GenerationRequestSettings } from '../../../src/types.ts';
import type { NormalizedGenerationRequest } from '../../../src/lib/generation-provider.ts';
import { b2Bucket, b2Client } from './b2.ts';
import { RunwayGenerationProvider, type RunwayReferenceResolver } from './runway.ts';

interface GenerationRow {
  id: string;
  owner_id: string;
  episode_id: string;
  shot_id: string | null;
  prompt_version_id: string;
  media_kind: 'image' | 'video';
  operational_status: string;
  client_request_id: string;
  provider: string;
  model: string;
  provider_job_id: string | null;
  request_settings: GenerationRequestSettings;
  estimated_cost_micros: number | string;
  estimated_output_bytes: number | string;
  reserved_output_bytes: number | string;
  poll_attempts: number;
  ingest_attempts: number;
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required generation service secret: ${name}`);
  return value;
}

export function runwayOutputHosts(): ReadonlySet<string> {
  const hosts = requiredEnvironment('RUNWAY_OUTPUT_HOSTS')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!hosts.length) throw new Error('At least one exact Runway output host must be configured.');
  return new Set(hosts);
}

export async function loadGenerationRow(
  admin: SupabaseClient,
  generationId: string,
  ownerId?: string
): Promise<GenerationRow> {
  let query = admin.from('generation_records').select('*').eq('id', generationId);
  if (ownerId) query = query.eq('owner_id', ownerId);
  const { data, error } = await query.single();
  if (error || !data) throw new Error('Managed generation not found.');
  const row = data as unknown as GenerationRow;
  if (
    row.provider !== 'runway' ||
    !row.prompt_version_id ||
    !row.client_request_id ||
    !row.media_kind
  ) {
    throw new Error('Managed Runway generation context is incomplete.');
  }
  return row;
}

async function loadSignedReferences(
  admin: SupabaseClient,
  generation: GenerationRow
): Promise<{
  resolver: RunwayReferenceResolver;
  references: NormalizedGenerationRequest['references'];
}> {
  const { data: inputs, error: inputError } = await admin
    .from('generation_input_assets')
    .select('asset_id, role, position')
    .eq('generation_id', generation.id)
    .eq('owner_id', generation.owner_id)
    .order('position');
  if (inputError) throw inputError;

  const signedByAsset = new Map<string, string>();
  const references: NormalizedGenerationRequest['references'] = [];
  const endpointHost = new URL(requiredEnvironment('B2_ENDPOINT')).hostname.toLowerCase();
  for (const input of inputs ?? []) {
    const { data: asset, error: assetError } = await admin
      .from('assets')
      .select('id, storage_key, kind, bytes, deleted_at')
      .eq('id', input.asset_id)
      .eq('owner_id', generation.owner_id)
      .single();
    if (
      assetError ||
      !asset ||
      asset.kind !== 'image' ||
      asset.deleted_at ||
      Number(asset.bytes) > 16_000_000
    ) {
      throw new Error('A generation reference is no longer an eligible private image.');
    }
    const signed = await getSignedUrl(
      b2Client(),
      new GetObjectCommand({ Bucket: b2Bucket(), Key: asset.storage_key }),
      { expiresIn: 5 * 60 }
    );
    signedByAsset.set(asset.id, signed);
    references.push({
      assetId: asset.id,
      role: input.role as 'reference_image' | 'start_image',
    });
  }

  return {
    resolver: {
      allowedHost: endpointHost,
      resolve: async (assetId) => {
        const value = signedByAsset.get(assetId);
        if (!value) throw new Error('Signed generation reference was not prepared.');
        return value;
      },
    },
    references,
  };
}

export async function runwayRequestContext(
  admin: SupabaseClient,
  generation: GenerationRow
): Promise<{ provider: RunwayGenerationProvider; request: NormalizedGenerationRequest }> {
  const { data: prompt, error: promptError } = await admin
    .from('prompt_versions')
    .select('id, content')
    .eq('id', generation.prompt_version_id)
    .eq('owner_id', generation.owner_id)
    .eq('episode_id', generation.episode_id)
    .single();
  if (promptError || !prompt) throw new Error('The immutable prompt version is unavailable.');
  const { resolver, references } = await loadSignedReferences(admin, generation);
  const provider = new RunwayGenerationProvider(
    requiredEnvironment('RUNWAYML_API_SECRET'),
    resolver
  );
  return {
    provider,
    request: {
      generationId: generation.id,
      clientRequestId: generation.client_request_id,
      mediaKind: generation.media_kind,
      promptVersionId: prompt.id,
      prompt: prompt.content,
      references,
      settings: generation.request_settings,
      model: generation.model,
    },
  };
}

export function runwayStatusProvider(): RunwayGenerationProvider {
  return new RunwayGenerationProvider(requiredEnvironment('RUNWAYML_API_SECRET'), {
    allowedHost: 'unused.invalid',
    resolve: async () => {
      throw new Error('Status reconciliation cannot resolve input references.');
    },
  });
}

export function nextGenerationPoll(attempt: number, now = Date.now()): string {
  const boundedAttempt = Math.max(0, Math.min(attempt, 6));
  const delaySeconds = Math.min(60, 5 * 2 ** boundedAttempt);
  return new Date(now + delaySeconds * 1_000).toISOString();
}
