import { describe, expect, it } from 'vitest';
import { demoWorkspace } from '../data/demo';
import { createFakeGenerationProvider, type GenerationProvider } from './generation-provider';
import {
  attachProviderJob,
  claimManagedGeneration,
  completeManagedGeneration,
  isGenerationTransitionAllowed,
  markProviderSubmissionStarted,
  prepareManagedGeneration,
  recoverInterruptedSubmission,
  resolveSubmissionUnknown,
  transitionManagedGeneration,
} from './managed-generation';

function runtime(at = '2026-09-02T12:00:00.000Z', start = 0) {
  let sequence = start;
  return {
    now: () => at,
    id: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  };
}

function preparedWorkspace(provider: GenerationProvider = createFakeGenerationProvider()) {
  const workspace = structuredClone(demoWorkspace);
  const clock = runtime();
  const creation = prepareManagedGeneration(
    workspace,
    {
      episodeId: 'episode-fridge',
      shotId: 'shot-1',
      promptVersionId: 'prompt-shot-one-v2',
      mediaKind: 'image',
      model: provider.capabilities().models.find((model) => model.mediaKind === 'image')!.id,
      settings: { aspectRatio: '9:16', qualityTier: 'draft', outputCount: 1 },
      references: [{ assetId: 'asset-fridge-ref', role: 'reference_image' }],
    },
    provider,
    clock
  );
  return {
    provider,
    generationId: creation.generation.id,
    workspace: {
      ...workspace,
      generations: [...workspace.generations, creation.generation],
      generationInputs: [...workspace.generationInputs, ...creation.inputs],
      generationEvents: [...workspace.generationEvents, creation.event],
    },
  };
}

describe('managed generation orchestration', () => {
  it('prepares immutable provenance with ordered reference roles and a frozen free estimate', () => {
    const { workspace, generationId } = preparedWorkspace();
    const generation = workspace.generations.find((item) => item.id === generationId)!;
    expect(generation).toMatchObject({
      executionMode: 'managed',
      operationalStatus: 'draft',
      provider: 'studioflow-fake',
      model: 'fake-image-v1',
      estimatedCostMicros: 0,
      reservedMaxCostMicros: 0,
    });
    expect(workspace.generationInputs.at(-1)).toMatchObject({
      generationId,
      assetId: 'asset-fridge-ref',
      role: 'reference_image',
      position: 0,
    });
  });

  it('rejects cross-project and oversized reference images before a job is created', () => {
    const workspace = structuredClone(demoWorkspace);
    workspace.assets.find((asset) => asset.id === 'asset-fridge-ref')!.bytes = 16_000_001;
    expect(() =>
      prepareManagedGeneration(
        workspace,
        {
          episodeId: 'episode-fridge',
          promptVersionId: 'prompt-shot-one-v2',
          shotId: 'shot-1',
          mediaKind: 'image',
          model: 'fake-image-v1',
          settings: { aspectRatio: '9:16', qualityTier: 'draft', outputCount: 1 },
          references: [{ assetId: 'asset-fridge-ref', role: 'reference_image' }],
        },
        createFakeGenerationProvider()
      )
    ).toThrow('16 MB or smaller');
  });

  it('claims once, prevents a concurrent job, and requires the matching submission marker', () => {
    const first = preparedWorkspace();
    const claimed = claimManagedGeneration(
      first.workspace,
      first.generationId,
      'claim-one',
      runtime()
    );
    expect(claimManagedGeneration(claimed, first.generationId, 'claim-two', runtime())).toBe(
      claimed
    );
    expect(() =>
      markProviderSubmissionStarted(claimed, first.generationId, 'wrong-claim', runtime())
    ).toThrow('no longer current');

    const secondCreation = prepareManagedGeneration(
      claimed,
      {
        episodeId: 'episode-fridge',
        shotId: 'shot-1',
        promptVersionId: 'prompt-shot-one-v2',
        mediaKind: 'image',
        model: 'fake-image-v1',
        settings: { aspectRatio: '9:16', qualityTier: 'draft', outputCount: 1 },
        references: [],
      },
      first.provider,
      runtime('2026-09-02T12:01:00.000Z', 100)
    );
    const withSecond = {
      ...claimed,
      generations: [...claimed.generations, secondCreation.generation],
    };
    expect(() =>
      claimManagedGeneration(withSecond, secondCreation.generation.id, 'second', runtime())
    ).toThrow('active generation');
  });

  it('runs the fake lifecycle to one placeholder asset, link, and zero-cost entry', async () => {
    const prepared = preparedWorkspace();
    let workspace = claimManagedGeneration(
      prepared.workspace,
      prepared.generationId,
      'claim',
      runtime()
    );
    workspace = markProviderSubmissionStarted(workspace, prepared.generationId, 'claim', runtime());
    const job = await prepared.provider.create({
      generationId: prepared.generationId,
      clientRequestId: workspace.generations.find((item) => item.id === prepared.generationId)!
        .clientRequestId!,
      mediaKind: 'image',
      promptVersionId: 'prompt-shot-one-v2',
      prompt: 'Fictional refrigerator argument.',
      references: [{ assetId: 'asset-fridge-ref', role: 'reference_image' }],
      settings: { aspectRatio: '9:16', qualityTier: 'draft', outputCount: 1 },
      model: 'fake-image-v1',
    });
    workspace = attachProviderJob(workspace, prepared.generationId, job.providerJobId, runtime());
    workspace = transitionManagedGeneration(
      workspace,
      prepared.generationId,
      'running',
      {},
      'running',
      runtime()
    );
    workspace = transitionManagedGeneration(
      workspace,
      prepared.generationId,
      'saving',
      {},
      'saving',
      runtime()
    );
    const completed = completeManagedGeneration(
      workspace,
      prepared.generationId,
      await prepared.provider.retrieve(job.providerJobId),
      runtime()
    );
    const repeated = completeManagedGeneration(
      completed,
      prepared.generationId,
      await prepared.provider.retrieve(job.providerJobId),
      runtime()
    );

    expect(
      repeated.assets.filter((asset) => asset.sourceGenerationId === prepared.generationId)
    ).toHaveLength(1);
    expect(
      repeated.assetLinks.filter(
        (link) => link.targetType === 'generation' && link.targetId === prepared.generationId
      )
    ).toHaveLength(1);
    expect(
      repeated.costEntries.filter((entry) => entry.sourceGenerationId === prepared.generationId)
    ).toHaveLength(1);
    expect(repeated.generations.find((item) => item.id === prepared.generationId)).toMatchObject({
      operationalStatus: 'completed',
      calculatedCostMicros: 0,
      costCents: 0,
      reservedMaxCostMicros: 0,
      reservedOutputBytes: 0,
    });
  });

  it('recovers an expired pre-request claim without charge or reservation', () => {
    const prepared = preparedWorkspace();
    const claimed = claimManagedGeneration(
      prepared.workspace,
      prepared.generationId,
      'claim',
      runtime('2026-09-02T12:00:00.000Z')
    );
    const recovered = recoverInterruptedSubmission(
      claimed,
      prepared.generationId,
      runtime('2026-09-02T12:03:00.000Z')
    );
    expect(recovered.generations.find((item) => item.id === prepared.generationId)).toMatchObject({
      operationalStatus: 'draft',
      reservedMaxCostMicros: 0,
      reservedOutputBytes: 0,
    });
  });

  it('keeps reservations when a submitted request becomes unknown and settles a confirmed charge once', () => {
    const paidProvider: GenerationProvider = {
      ...createFakeGenerationProvider(),
      capabilities: () => ({
        ...createFakeGenerationProvider().capabilities(),
        providerId: 'runway',
        models: [
          {
            id: 'paid-image',
            mediaKind: 'image',
            aspectRatios: ['9:16'],
            durations: [],
            supportsReferences: true,
            supportsCancellation: true,
          },
        ],
      }),
      estimate: (request) => ({
        maximumCostMicros: 20_000,
        providerCredits: 2,
        estimatedOutputBytes: 1_000,
        pricingSnapshot: {
          provider: 'runway',
          model: request.model,
          currency: 'USD',
          unit: 'request',
          unitCostMicros: 20_000,
          creditsPerUnit: 2,
          capturedAt: '2026-09-02T12:00:00.000Z',
        },
      }),
    };
    const prepared = preparedWorkspace(paidProvider);
    prepared.workspace.generationBudgetSettings[0].generationEnabled = true;
    let workspace = claimManagedGeneration(
      prepared.workspace,
      prepared.generationId,
      'claim',
      runtime('2026-09-02T12:00:00.000Z')
    );
    workspace = markProviderSubmissionStarted(
      workspace,
      prepared.generationId,
      'claim',
      runtime('2026-09-02T12:00:01.000Z')
    );
    workspace = recoverInterruptedSubmission(
      workspace,
      prepared.generationId,
      runtime('2026-09-02T12:03:00.000Z')
    );
    expect(workspace.generations.find((item) => item.id === prepared.generationId)).toMatchObject({
      operationalStatus: 'submission_unknown',
      reservedMaxCostMicros: 20_000,
      reservedOutputBytes: 1_000,
    });

    const settled = resolveSubmissionUnknown(
      workspace,
      prepared.generationId,
      'confirmed_charge',
      20_000,
      runtime()
    );
    expect(
      settled.costEntries.filter((entry) => entry.sourceGenerationId === prepared.generationId)
    ).toHaveLength(1);
    expect(settled.generations.find((item) => item.id === prepared.generationId)).toMatchObject({
      operationalStatus: 'failed',
      costCents: 2,
    });
  });

  it('keeps lifecycle rules explicit', () => {
    expect(isGenerationTransitionAllowed('draft', 'submitting')).toBe(true);
    expect(isGenerationTransitionAllowed('running', 'completed')).toBe(false);
    expect(isGenerationTransitionAllowed('cancel_requested', 'submission_unknown')).toBe(true);
  });
});
