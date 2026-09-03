import type {
  GenerationMediaKind,
  GenerationPricingSnapshot,
  GenerationRequestSettings,
} from "../types";

export type ProviderJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface ProviderCapabilities {
  providerId: string;
  label: string;
  mediaKinds: GenerationMediaKind[];
  models: Array<{
    id: string;
    mediaKind: GenerationMediaKind;
    aspectRatios: GenerationRequestSettings["aspectRatio"][];
    durations: number[];
    supportsReferences: boolean;
    supportsCancellation: boolean;
  }>;
  maxOutputs: 1;
}

export interface NormalizedGenerationRequest {
  generationId: string;
  clientRequestId: string;
  mediaKind: GenerationMediaKind;
  promptVersionId: string;
  prompt: string;
  references: Array<{ assetId: string; role: "reference_image" | "start_image" }>;
  settings: GenerationRequestSettings;
  model: string;
}

export interface CostEstimate {
  maximumCostMicros: number;
  providerCredits: number;
  estimatedOutputBytes: number;
  pricingSnapshot: GenerationPricingSnapshot;
}

export interface ProviderJob {
  providerJobId: string;
  status: ProviderJobStatus;
  createdAt: string;
}

export interface ProviderJobState extends ProviderJob {
  failureCode?: string;
  failureMessage?: string;
  output?: {
    filename: string;
    mimeType: "image/png" | "video/mp4";
    bytes: number;
  };
}

export interface NormalizedGenerationResult {
  status: ProviderJobStatus;
  failureCode?: string;
  failureMessage?: string;
  output?: ProviderJobState["output"];
}

export interface GenerationProvider {
  capabilities(): ProviderCapabilities;
  estimate(request: NormalizedGenerationRequest): CostEstimate;
  create(request: NormalizedGenerationRequest): Promise<ProviderJob>;
  retrieve(providerJobId: string): Promise<ProviderJobState>;
  cancel(providerJobId: string): Promise<void>;
  normalizeResult(job: ProviderJobState): NormalizedGenerationResult;
}

export const FAKE_PROVIDER_ID = "studioflow-fake";

export function createFakeGenerationProvider(clock: () => string = () => new Date().toISOString()): GenerationProvider {
  const cancelledJobs = new Set<string>();
  const mediaByJob = new Map<string, GenerationMediaKind>();

  return {
    capabilities: () => ({
      providerId: FAKE_PROVIDER_ID,
      label: "StudioFlow simulator",
      mediaKinds: ["image", "video"],
      models: [
        {
          id: "fake-image-v1",
          mediaKind: "image",
          aspectRatios: ["9:16", "16:9", "1:1"],
          durations: [],
          supportsReferences: true,
          supportsCancellation: true,
        },
        {
          id: "fake-video-v1",
          mediaKind: "video",
          aspectRatios: ["9:16", "16:9", "1:1"],
          durations: [5, 10],
          supportsReferences: true,
          supportsCancellation: true,
        },
      ],
      maxOutputs: 1,
    }),
    estimate: (request) => ({
      maximumCostMicros: 0,
      providerCredits: 0,
      estimatedOutputBytes: request.mediaKind === "image" ? 2_000_000 : 20_000_000,
      pricingSnapshot: {
        provider: FAKE_PROVIDER_ID,
        model: request.model,
        currency: "USD",
        unit: request.mediaKind === "image" ? "request" : "second",
        unitCostMicros: 0,
        creditsPerUnit: 0,
        capturedAt: clock(),
      },
    }),
    create: async (request) => {
      const providerJobId = `fake-${request.mediaKind}-${request.generationId}`;
      mediaByJob.set(providerJobId, request.mediaKind);
      return { providerJobId, status: "queued", createdAt: clock() };
    },
    retrieve: async (providerJobId) => {
      const mediaKind = mediaByJob.get(providerJobId) ?? (providerJobId.startsWith("fake-video-") ? "video" : "image");
      if (cancelledJobs.has(providerJobId)) {
        return { providerJobId, status: "cancelled", createdAt: clock() };
      }
      return {
        providerJobId,
        status: "succeeded",
        createdAt: clock(),
        output: mediaKind === "image"
          ? { filename: "studioflow-simulated-image.png", mimeType: "image/png", bytes: 2_048 }
          : { filename: "studioflow-simulated-video.mp4", mimeType: "video/mp4", bytes: 8_192 },
      };
    },
    cancel: async (providerJobId) => {
      cancelledJobs.add(providerJobId);
    },
    normalizeResult: (job) => ({
      status: job.status,
      failureCode: job.failureCode,
      failureMessage: job.failureMessage,
      output: job.output,
    }),
  };
}
