import { describe, expect, it } from 'vitest';
import type { NormalizedGenerationRequest } from './generation-provider';
import { createRunwayPreparationProvider, RUNWAY_FIRST_VIDEO_PREFLIGHT } from './runway-pricing';

const videoRequest: NormalizedGenerationRequest = {
  generationId: 'generation-video',
  clientRequestId: 'request-video',
  mediaKind: 'video',
  promptVersionId: 'prompt-video',
  prompt: 'A private fictional scene.',
  references: [{ assetId: 'asset-start', role: 'start_image' }],
  settings: {
    aspectRatio: '9:16',
    qualityTier: 'draft',
    durationSeconds: 5,
    outputCount: 1,
  },
  model: 'gen4_turbo',
};

describe('Runway browser preparation pricing', () => {
  it('locks the first video to one five-second vertical Gen-4 Turbo request', () => {
    const provider = createRunwayPreparationProvider(() => '2026-09-10T12:00:00.000Z');
    const capabilities = provider.capabilities();
    const videoModel = capabilities.models.find((model) => model.mediaKind === 'video');

    expect(videoModel).toEqual({
      id: RUNWAY_FIRST_VIDEO_PREFLIGHT.model,
      mediaKind: 'video',
      aspectRatios: ['9:16'],
      durations: [5],
      supportsReferences: true,
      supportsCancellation: true,
    });
    expect(capabilities.maxOutputs).toBe(1);
  });

  it('reserves exactly 25 credits, $0.25, and 200 MB for the first video', () => {
    const provider = createRunwayPreparationProvider(() => '2026-09-10T12:00:00.000Z');

    expect(provider.estimate(videoRequest)).toEqual({
      maximumCostMicros: 250_000,
      providerCredits: 25,
      estimatedOutputBytes: 200_000_000,
      pricingSnapshot: {
        provider: 'runway',
        model: 'gen4_turbo',
        currency: 'USD',
        unit: 'second',
        unitCostMicros: 50_000,
        creditsPerUnit: 5,
        capturedAt: '2026-09-10T12:00:00.000Z',
      },
    });
  });
});
