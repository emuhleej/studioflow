import type {
  GenerationPreparationProvider,
  NormalizedGenerationRequest,
} from './generation-provider';

export const RUNWAY_CREDIT_COST_MICROS = 10_000;

export const RUNWAY_FIRST_IMAGE_PREFLIGHT = {
  provider: 'runway',
  providerLabel: 'Runway Dev',
  model: 'gen4_image_turbo',
  modelLabel: 'Gen-4 Image Turbo',
  outputCount: 1,
  providerCredits: 2,
  maximumCostMicros: 2 * RUNWAY_CREDIT_COST_MICROS,
  estimatedOutputBytes: 20_000_000,
  reviewedOn: '2026-09-10',
  reviewedOnLabel: 'September 10, 2026',
} as const;

export const RUNWAY_FIRST_VIDEO_PREFLIGHT = {
  provider: 'runway',
  providerLabel: 'Runway Dev',
  model: 'gen4_turbo',
  modelLabel: 'Gen-4 Turbo',
  outputCount: 1,
  durationSeconds: 5,
  aspectRatio: '9:16',
  outputRatio: '720:1280',
  creditsPerSecond: 5,
  providerCredits: 25,
  maximumCostMicros: 25 * RUNWAY_CREDIT_COST_MICROS,
  estimatedOutputBytes: 200_000_000,
  reviewedOn: '2026-09-10',
  reviewedOnLabel: 'September 10, 2026',
} as const;

export function createRunwayPreparationProvider(
  clock: () => string = () => new Date().toISOString()
): GenerationPreparationProvider {
  return {
    capabilities: () => ({
      providerId: RUNWAY_FIRST_IMAGE_PREFLIGHT.provider,
      label: RUNWAY_FIRST_IMAGE_PREFLIGHT.providerLabel,
      mediaKinds: ['image', 'video'],
      models: [
        {
          id: RUNWAY_FIRST_IMAGE_PREFLIGHT.model,
          mediaKind: 'image',
          aspectRatios: ['9:16', '16:9', '1:1'],
          durations: [],
          supportsReferences: true,
          supportsCancellation: true,
        },
        {
          id: RUNWAY_FIRST_VIDEO_PREFLIGHT.model,
          mediaKind: 'video',
          aspectRatios: [RUNWAY_FIRST_VIDEO_PREFLIGHT.aspectRatio],
          durations: [RUNWAY_FIRST_VIDEO_PREFLIGHT.durationSeconds],
          supportsReferences: true,
          supportsCancellation: true,
        },
      ],
      maxOutputs: 1,
    }),
    estimate: (request: NormalizedGenerationRequest) => {
      const isVideo = request.mediaKind === 'video';
      return {
        maximumCostMicros: isVideo
          ? RUNWAY_FIRST_VIDEO_PREFLIGHT.maximumCostMicros
          : RUNWAY_FIRST_IMAGE_PREFLIGHT.maximumCostMicros,
        providerCredits: isVideo
          ? RUNWAY_FIRST_VIDEO_PREFLIGHT.providerCredits
          : RUNWAY_FIRST_IMAGE_PREFLIGHT.providerCredits,
        estimatedOutputBytes: isVideo
          ? RUNWAY_FIRST_VIDEO_PREFLIGHT.estimatedOutputBytes
          : RUNWAY_FIRST_IMAGE_PREFLIGHT.estimatedOutputBytes,
        pricingSnapshot: {
          provider: RUNWAY_FIRST_IMAGE_PREFLIGHT.provider,
          model: request.model,
          currency: 'USD',
          unit: isVideo ? 'second' : 'request',
          unitCostMicros: isVideo
            ? RUNWAY_FIRST_VIDEO_PREFLIGHT.creditsPerSecond * RUNWAY_CREDIT_COST_MICROS
            : RUNWAY_FIRST_IMAGE_PREFLIGHT.maximumCostMicros,
          creditsPerUnit: isVideo
            ? RUNWAY_FIRST_VIDEO_PREFLIGHT.creditsPerSecond
            : RUNWAY_FIRST_IMAGE_PREFLIGHT.providerCredits,
          capturedAt: clock(),
        },
      };
    },
  };
}
