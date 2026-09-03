import type {
  CostEstimate,
  GenerationProvider,
  NormalizedGenerationRequest,
  NormalizedGenerationResult,
  ProviderCapabilities,
  ProviderJob,
  ProviderJobState,
} from '../../../src/lib/generation-provider.ts';
import { validateSignedReferenceUrl } from './generated-output.ts';

const API_VERSION = '2024-11-06';
const API_ORIGIN = 'https://api.dev.runwayml.com';

interface RunwayTask {
  id: string;
  status: 'PENDING' | 'THROTTLED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  createdAt?: string;
  output?: string[];
  failure?: string;
  failureCode?: string;
}

export interface RunwayReferenceResolver {
  resolve(assetId: string): Promise<string>;
  allowedHost: string;
}

function ratioFor(request: NormalizedGenerationRequest): string {
  if (request.settings.aspectRatio === '9:16')
    return request.mediaKind === 'image' ? '720:1280' : '720:1280';
  if (request.settings.aspectRatio === '1:1') return '960:960';
  return request.mediaKind === 'image' ? '1280:720' : '1280:720';
}

function normalizedStatus(status: RunwayTask['status']): ProviderJobState['status'] {
  if (status === 'RUNNING') return 'running';
  if (status === 'SUCCEEDED') return 'succeeded';
  if (status === 'FAILED') return 'failed';
  if (status === 'CANCELED') return 'cancelled';
  return 'queued';
}

export class RunwayGenerationProvider implements GenerationProvider {
  constructor(
    private readonly secret: string,
    private readonly references: RunwayReferenceResolver,
    private readonly fetcher: typeof fetch = fetch,
    private readonly clock: () => string = () => new Date().toISOString()
  ) {
    if (!secret) throw new Error('Runway server credential is missing.');
  }

  capabilities(): ProviderCapabilities {
    return {
      providerId: 'runway',
      label: 'Runway Dev',
      mediaKinds: ['image', 'video'],
      models: [
        {
          id: 'gen4_image_turbo',
          mediaKind: 'image',
          aspectRatios: ['9:16', '16:9', '1:1'],
          durations: [],
          supportsReferences: true,
          supportsCancellation: true,
        },
        {
          id: 'gen4_turbo',
          mediaKind: 'video',
          aspectRatios: ['9:16', '16:9', '1:1'],
          durations: [5, 10],
          supportsReferences: true,
          supportsCancellation: true,
        },
      ],
      maxOutputs: 1,
    };
  }

  estimate(request: NormalizedGenerationRequest): CostEstimate {
    const videoSeconds =
      request.mediaKind === 'video' ? (request.settings.durationSeconds ?? 0) : 0;
    const providerCredits = request.mediaKind === 'image' ? 2 : videoSeconds * 5;
    return {
      maximumCostMicros: providerCredits * 10_000,
      providerCredits,
      estimatedOutputBytes: request.mediaKind === 'image' ? 20_000_000 : 200_000_000,
      pricingSnapshot: {
        provider: 'runway',
        model: request.model,
        currency: 'USD',
        unit: request.mediaKind === 'image' ? 'request' : 'second',
        unitCostMicros: request.mediaKind === 'image' ? 20_000 : 50_000,
        creditsPerUnit: request.mediaKind === 'image' ? 2 : 5,
        capturedAt: this.clock(),
      },
    };
  }

  async create(request: NormalizedGenerationRequest): Promise<ProviderJob> {
    const referenceUrls = await Promise.all(
      request.references.map(async (reference) => {
        const value = await this.references.resolve(reference.assetId);
        validateSignedReferenceUrl(value, this.references.allowedHost);
        return { ...reference, value };
      })
    );
    const endpoint = request.mediaKind === 'image' ? '/v1/text_to_image' : '/v1/image_to_video';
    const body =
      request.mediaKind === 'image'
        ? {
            model: request.model,
            promptText: request.prompt,
            ratio: ratioFor(request),
            referenceImages: referenceUrls.map((reference, index) => ({
              uri: reference.value,
              tag: `Reference${index + 1}`,
            })),
          }
        : {
            model: request.model,
            promptText: request.prompt,
            promptImage: referenceUrls.find((reference) => reference.role === 'start_image')?.value,
            ratio: ratioFor(request),
            duration: request.settings.durationSeconds,
          };
    const task = await this.request<RunwayTask>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return {
      providerJobId: task.id,
      status: normalizedStatus(task.status),
      createdAt: task.createdAt ?? this.clock(),
    };
  }

  async retrieve(providerJobId: string): Promise<ProviderJobState> {
    const task = await this.retrieveRaw(providerJobId);
    return {
      providerJobId: task.id,
      status: normalizedStatus(task.status),
      createdAt: task.createdAt ?? this.clock(),
      failureCode: task.failureCode,
      failureMessage: task.failure,
    };
  }

  async retrieveOutput(
    providerJobId: string
  ): Promise<{ state: ProviderJobState; temporaryUrl: string }> {
    const task = await this.retrieveRaw(providerJobId);
    const temporaryUrl = task.output?.[0];
    if (task.status !== 'SUCCEEDED' || !temporaryUrl)
      throw new Error('Runway task has no completed output.');
    return {
      state: {
        providerJobId: task.id,
        status: 'succeeded',
        createdAt: task.createdAt ?? this.clock(),
      },
      temporaryUrl,
    };
  }

  async cancel(providerJobId: string): Promise<void> {
    await this.request(`/v1/tasks/${encodeURIComponent(providerJobId)}`, { method: 'DELETE' });
  }

  normalizeResult(job: ProviderJobState): NormalizedGenerationResult {
    return {
      status: job.status,
      failureCode: job.failureCode,
      failureMessage: job.failureMessage,
      output: job.output,
    };
  }

  private retrieveRaw(providerJobId: string): Promise<RunwayTask> {
    return this.request(`/v1/tasks/${encodeURIComponent(providerJobId)}`, { method: 'GET' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${API_ORIGIN}${path}`, {
      ...init,
      redirect: 'manual',
      headers: {
        authorization: `Bearer ${this.secret}`,
        'content-type': 'application/json',
        'x-runway-version': API_VERSION,
      },
    });
    if (!response.ok) throw new Error(`Runway request failed with HTTP ${response.status}.`);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

export { API_VERSION as RUNWAY_API_VERSION };
