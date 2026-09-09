import type {
  Asset,
  CostEntry,
  GenerationEvent,
  GenerationInputAsset,
  GenerationMediaKind,
  GenerationOperationalStatus,
  GenerationRecord,
  GenerationRequestSettings,
  WorkspaceData,
} from '../types';
import {
  FAKE_PROVIDER_ID,
  type GenerationProvider,
  type NormalizedGenerationRequest,
  type ProviderJobState,
} from './generation-provider';

export const ACTIVE_GENERATION_STATUSES: GenerationOperationalStatus[] = [
  'submitting',
  'queued',
  'running',
  'saving',
  'cancel_requested',
  'submission_unknown',
];

const transitions: Record<GenerationOperationalStatus, GenerationOperationalStatus[]> = {
  recorded: [],
  draft: ['submitting', 'cancelled'],
  submitting: ['draft', 'queued', 'failed', 'submission_unknown', 'cancel_requested'],
  queued: ['running', 'saving', 'failed', 'cancel_requested', 'cancelled', 'submission_unknown'],
  running: ['saving', 'failed', 'cancel_requested', 'cancelled', 'submission_unknown'],
  saving: ['completed', 'failed', 'cancel_requested'],
  completed: [],
  failed: [],
  cancel_requested: ['running', 'failed', 'cancelled', 'submission_unknown'],
  cancelled: [],
  submission_unknown: ['failed', 'cancelled'],
};

export interface PrepareManagedGenerationInput {
  episodeId: string;
  shotId?: string | undefined;
  promptVersionId: string;
  mediaKind: GenerationMediaKind;
  model: string;
  settings: GenerationRequestSettings;
  references: Array<{ assetId: string; role: GenerationInputAsset['role'] }>;
}

export interface ManagedGenerationCreation {
  generation: GenerationRecord;
  inputs: GenerationInputAsset[];
  event: GenerationEvent;
}

interface RuntimeFactory {
  id: () => string;
  now: () => string;
}

const defaultRuntime: RuntimeFactory = {
  id: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

function baseRecord(ownerId: string, runtime: RuntimeFactory) {
  const timestamp = runtime.now();
  return { id: runtime.id(), ownerId, createdAt: timestamp, updatedAt: timestamp };
}

export function isGenerationTransitionAllowed(
  from: GenerationOperationalStatus,
  to: GenerationOperationalStatus
): boolean {
  return transitions[from].includes(to);
}

export function getGenerationProjectId(
  workspace: WorkspaceData,
  generation: GenerationRecord
): string | undefined {
  const episode = workspace.episodes.find((item) => item.id === generation.episodeId);
  const series = episode
    ? workspace.series.find((item) => item.id === episode.seriesId)
    : undefined;
  return series?.projectId;
}

export function prepareManagedGeneration(
  workspace: WorkspaceData,
  input: PrepareManagedGenerationInput,
  provider: GenerationProvider,
  runtime: RuntimeFactory = defaultRuntime
): ManagedGenerationCreation {
  const episode = workspace.episodes.find((item) => item.id === input.episodeId);
  if (!episode) throw new Error('Episode not found.');
  const series = workspace.series.find((item) => item.id === episode.seriesId);
  if (!series) throw new Error('Episode series not found.');
  const prompt = workspace.prompts.find(
    (item) => item.id === input.promptVersionId && item.episodeId === input.episodeId
  );
  if (!prompt) throw new Error('Choose an immutable prompt version from this episode.');
  if (prompt.shotId && prompt.shotId !== input.shotId)
    throw new Error('The generation shot must match the prompt version.');
  if (input.shotId) {
    const shot = workspace.shots.find((item) => item.id === input.shotId);
    const scene = shot ? workspace.scenes.find((item) => item.id === shot.sceneId) : undefined;
    if (!scene || scene.episodeId !== input.episodeId)
      throw new Error('Choose a shot from this episode.');
  }
  if (input.settings.outputCount !== 1)
    throw new Error('StudioFlow permits one generated output per request.');
  if (
    input.mediaKind === 'video' &&
    !input.references.some((reference) => reference.role === 'start_image')
  ) {
    throw new Error('Video simulation requires one approved starting image.');
  }

  const capabilities = provider.capabilities();
  const model = capabilities.models.find(
    (candidate) => candidate.id === input.model && candidate.mediaKind === input.mediaKind
  );
  if (!model) throw new Error('Choose a model that supports this media type.');
  if (!model.aspectRatios.includes(input.settings.aspectRatio))
    throw new Error('The model does not support this aspect ratio.');
  if (
    input.mediaKind === 'video' &&
    !model.durations.includes(input.settings.durationSeconds ?? 0)
  ) {
    throw new Error('Choose a supported video duration.');
  }

  const budget = workspace.generationBudgetSettings[0];
  if (!budget) throw new Error('Generation budget settings are missing.');
  const seenReferences = new Set<string>();
  for (const reference of input.references) {
    const dedupeKey = `${reference.assetId}:${reference.role}`;
    if (seenReferences.has(dedupeKey))
      throw new Error('The same reference role cannot be added twice.');
    seenReferences.add(dedupeKey);
    const asset = workspace.assets.find((candidate) => candidate.id === reference.assetId);
    if (
      !asset ||
      asset.projectId !== series.projectId ||
      asset.kind !== 'image' ||
      asset.deletedAt
    ) {
      throw new Error('References must be active images from this project.');
    }
    if (asset.bytes > budget.referenceImageLimitBytes)
      throw new Error('Reference images must be 16 MB or smaller.');
    if (reference.role === 'start_image' && input.mediaKind !== 'video') {
      throw new Error('A start image is only valid for video generation.');
    }
  }

  const generationBase = baseRecord(workspace.ownerId, runtime);
  const normalizedRequest: NormalizedGenerationRequest = {
    generationId: generationBase.id,
    clientRequestId: runtime.id(),
    mediaKind: input.mediaKind,
    promptVersionId: prompt.id,
    prompt: prompt.content,
    references: input.references,
    settings: input.settings,
    model: input.model,
  };
  const estimate = provider.estimate(normalizedRequest);
  const generation: GenerationRecord = {
    ...generationBase,
    episodeId: input.episodeId,
    shotId: input.shotId,
    promptVersionId: prompt.id,
    executionMode: 'managed',
    mediaKind: input.mediaKind,
    operationalStatus: 'draft',
    clientRequestId: normalizedRequest.clientRequestId,
    provider: capabilities.providerId,
    model: input.model,
    requestSettings: input.settings,
    estimatedCostMicros: estimate.maximumCostMicros,
    reservedMaxCostMicros: 0,
    pricingSnapshot: estimate.pricingSnapshot,
    providerCreditUnits: estimate.providerCredits,
    estimatedOutputBytes: estimate.estimatedOutputBytes,
    reservedOutputBytes: 0,
    pollAttempts: 0,
    ingestAttempts: 0,
    costCents: 0,
    durationSeconds: input.settings.durationSeconds,
    outcome: 'unreviewed',
    assetIds: [],
    notes: 'Account-free StudioFlow simulation.',
  };
  const inputs = input.references.map((reference, position): GenerationInputAsset => ({
    ...baseRecord(workspace.ownerId, runtime),
    generationId: generation.id,
    assetId: reference.assetId,
    role: reference.role,
    position,
  }));
  const event: GenerationEvent = {
    ...baseRecord(workspace.ownerId, runtime),
    generationId: generation.id,
    eventType: 'prepared',
    toStatus: 'draft',
    message: 'Managed generation prepared without contacting a provider.',
    detail: { provider: generation.provider, mediaKind: input.mediaKind },
  };
  return { generation, inputs, event };
}

function appendStatusEvent(
  workspace: WorkspaceData,
  generation: GenerationRecord,
  fromStatus: GenerationOperationalStatus,
  toStatus: GenerationOperationalStatus,
  message: string,
  runtime: RuntimeFactory,
  detail: GenerationEvent['detail'] = {}
): GenerationEvent[] {
  return [
    ...workspace.generationEvents,
    {
      ...baseRecord(workspace.ownerId, runtime),
      generationId: generation.id,
      eventType: 'status_changed',
      fromStatus,
      toStatus,
      message,
      detail,
    },
  ];
}

function updateGeneration(
  workspace: WorkspaceData,
  generationId: string,
  updater: (generation: GenerationRecord) => GenerationRecord
): WorkspaceData {
  return {
    ...workspace,
    generations: workspace.generations.map((generation) =>
      generation.id === generationId ? updater(generation) : generation
    ),
  };
}

export function claimManagedGeneration(
  workspace: WorkspaceData,
  generationId: string,
  claimId: string,
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation || generation.executionMode !== 'managed')
    throw new Error('Managed generation not found.');
  if (generation.operationalStatus !== 'draft') return workspace;
  const budget = workspace.generationBudgetSettings[0];
  if (!budget) throw new Error('Generation budget settings are missing.');
  if (generation.provider !== FAKE_PROVIDER_ID && !budget.generationEnabled) {
    throw new Error('Managed provider generation is disabled.');
  }
  if (generation.provider === FAKE_PROVIDER_ID && generation.estimatedCostMicros !== 0) {
    throw new Error('The fake provider must remain free.');
  }
  const active = workspace.generations.find(
    (item) =>
      item.id !== generation.id &&
      item.executionMode === 'managed' &&
      ACTIVE_GENERATION_STATUSES.includes(item.operationalStatus)
  );
  if (active) throw new Error('Finish the active generation before starting another.');
  const requestLimit =
    generation.mediaKind === 'video' ? budget.maxVideoRequestMicros : budget.maxImageRequestMicros;
  if (generation.estimatedCostMicros > requestLimit)
    throw new Error('Generation exceeds the per-request spending limit.');

  const nowValue = new Date(runtime.now());
  const costExposure = (candidate: GenerationRecord) =>
    candidate.calculatedCostMicros ??
    (ACTIVE_GENERATION_STATUSES.includes(candidate.operationalStatus)
      ? candidate.reservedMaxCostMicros
      : 0);
  const dailyExposure = workspace.generations
    .filter(
      (item) =>
        item.id !== generation.id &&
        item.executionMode === 'managed' &&
        new Date(item.createdAt).toDateString() === nowValue.toDateString()
    )
    .reduce((sum, item) => sum + costExposure(item), 0);
  const monthlyExposure = workspace.generations
    .filter((item) => item.id !== generation.id && item.executionMode === 'managed')
    .filter((item) => {
      const created = new Date(item.createdAt);
      return (
        created.getUTCFullYear() === nowValue.getUTCFullYear() &&
        created.getUTCMonth() === nowValue.getUTCMonth()
      );
    })
    .reduce((sum, item) => sum + costExposure(item), 0);
  if (dailyExposure + generation.estimatedCostMicros > budget.dailyLimitMicros)
    throw new Error('Generation exceeds the daily spending limit.');
  if (monthlyExposure + generation.estimatedCostMicros > budget.monthlyLimitMicros)
    throw new Error('Generation exceeds the monthly spending limit.');

  const usedBytes = workspace.assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const reservedBytes = workspace.generations
    .filter(
      (item) =>
        item.id !== generation.id && ACTIVE_GENERATION_STATUSES.includes(item.operationalStatus)
    )
    .reduce((sum, item) => sum + item.reservedOutputBytes, 0);
  if (
    generation.estimatedOutputBytes > budget.generatedOutputLimitBytes ||
    usedBytes + reservedBytes + generation.estimatedOutputBytes > 9_000_000_000
  ) {
    throw new Error('Generation exceeds the private storage safety limit.');
  }

  const timestamp = runtime.now();
  const claimExpires = new Date(timestamp);
  claimExpires.setMinutes(claimExpires.getMinutes() + 2);
  const claimed = {
    ...generation,
    operationalStatus: 'submitting' as const,
    reservedMaxCostMicros: generation.estimatedCostMicros,
    reservedOutputBytes: generation.estimatedOutputBytes,
    submissionClaimId: claimId,
    submissionClaimExpiresAt: claimExpires.toISOString(),
    submittedAt: timestamp,
    failureCode: undefined,
    failureMessage: undefined,
    updatedAt: timestamp,
  };
  const updated = updateGeneration(workspace, generation.id, () => claimed);
  return {
    ...updated,
    generationEvents: appendStatusEvent(
      workspace,
      generation,
      'draft',
      'submitting',
      'Generation claim reserved safely.',
      runtime
    ),
  };
}

export function markProviderSubmissionStarted(
  workspace: WorkspaceData,
  generationId: string,
  claimId: string,
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (
    !generation ||
    generation.operationalStatus !== 'submitting' ||
    generation.submissionClaimId !== claimId
  ) {
    throw new Error('The generation claim is no longer current.');
  }
  const timestamp = runtime.now();
  const updated = updateGeneration(workspace, generationId, (item) => ({
    ...item,
    providerSubmissionStartedAt: timestamp,
    updatedAt: timestamp,
  }));
  return {
    ...updated,
    generationEvents: [
      ...workspace.generationEvents,
      {
        ...baseRecord(workspace.ownerId, runtime),
        generationId,
        eventType: 'submission_started',
        fromStatus: 'submitting',
        toStatus: 'submitting',
        message: 'Provider submission began.',
        detail: {},
      },
    ],
  };
}

export function transitionManagedGeneration(
  workspace: WorkspaceData,
  generationId: string,
  toStatus: GenerationOperationalStatus,
  patch: Partial<GenerationRecord> = {},
  message = 'Generation status changed.',
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation || generation.executionMode !== 'managed')
    throw new Error('Managed generation not found.');
  if (generation.operationalStatus === toStatus) return workspace;
  if (!isGenerationTransitionAllowed(generation.operationalStatus, toStatus)) {
    throw new Error(
      `Invalid generation transition from ${generation.operationalStatus} to ${toStatus}.`
    );
  }
  const timestamp = runtime.now();
  const next: GenerationRecord = {
    ...generation,
    ...patch,
    operationalStatus: toStatus,
    updatedAt: timestamp,
    reservedMaxCostMicros: ['failed', 'cancelled', 'completed'].includes(toStatus)
      ? 0
      : (patch.reservedMaxCostMicros ?? generation.reservedMaxCostMicros),
    reservedOutputBytes: ['failed', 'cancelled', 'completed'].includes(toStatus)
      ? 0
      : (patch.reservedOutputBytes ?? generation.reservedOutputBytes),
    completedAt: ['failed', 'cancelled', 'completed'].includes(toStatus)
      ? timestamp
      : generation.completedAt,
  };
  const updated = updateGeneration(workspace, generationId, () => next);
  return {
    ...updated,
    generationEvents: appendStatusEvent(
      workspace,
      generation,
      generation.operationalStatus,
      toStatus,
      message,
      runtime
    ),
  };
}

export function attachProviderJob(
  workspace: WorkspaceData,
  generationId: string,
  providerJobId: string,
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  return transitionManagedGeneration(
    workspace,
    generationId,
    'queued',
    {
      providerJobId,
      submissionClaimId: undefined,
      submissionClaimExpiresAt: undefined,
      nextPollAt: runtime.now(),
    },
    'Provider accepted the generation job.',
    runtime
  );
}

export function completeManagedGeneration(
  workspace: WorkspaceData,
  generationId: string,
  result: ProviderJobState,
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation || generation.executionMode !== 'managed')
    throw new Error('Managed generation not found.');
  if (generation.operationalStatus === 'completed') return workspace;
  if (generation.operationalStatus !== 'saving')
    throw new Error('Generation must be saving before it can complete.');
  if (!result.output) throw new Error('The provider result has no output metadata.');
  const projectId = getGenerationProjectId(workspace, generation);
  if (!projectId || !generation.mediaKind)
    throw new Error('Generation project context is missing.');

  const existingAsset = workspace.assets.find(
    (asset) => asset.storageKey === `fake://${generation.id}`
  );
  const asset: Asset = existingAsset ?? {
    ...baseRecord(workspace.ownerId, runtime),
    projectId,
    episodeId: generation.episodeId,
    kind: generation.mediaKind,
    filename: result.output.filename,
    mimeType: result.output.mimeType,
    bytes: result.output.bytes,
    durationSeconds:
      generation.mediaKind === 'video'
        ? (generation.requestSettings.durationSeconds ?? null)
        : null,
    width: null,
    height: null,
    storageKey: `fake://${generation.id}`,
    reviewStatus: 'unreviewed',
    source: 'generation',
    sourceGenerationId: generation.id,
    notes: 'Simulated output. No AI provider was contacted.',
  };
  const existingLink = workspace.assetLinks.find(
    (link) =>
      link.targetType === 'generation' &&
      link.targetId === generation.id &&
      link.assetId === asset.id
  );
  const assetLink = existingLink ?? {
    ...baseRecord(workspace.ownerId, runtime),
    assetId: asset.id,
    targetType: 'generation' as const,
    targetId: generation.id,
  };
  const calculatedCostMicros = generation.estimatedCostMicros;
  const existingCost = workspace.costEntries.find(
    (entry) => entry.sourceGenerationId === generation.id
  );
  const cost: CostEntry = existingCost ?? {
    ...baseRecord(workspace.ownerId, runtime),
    episodeId: generation.episodeId,
    sourceGenerationId: generation.id,
    category: generation.mediaKind,
    amountCents: Math.round(calculatedCostMicros / 10_000),
    provider: generation.provider,
    note: 'Managed generation charge recorded once.',
    occurredOn: runtime.now().slice(0, 10),
  };
  const withRelationships: WorkspaceData = {
    ...workspace,
    assets: existingAsset ? workspace.assets : [...workspace.assets, asset],
    assetLinks: existingLink ? workspace.assetLinks : [...workspace.assetLinks, assetLink],
    costEntries: existingCost ? workspace.costEntries : [...workspace.costEntries, cost],
    generations: workspace.generations.map((item) =>
      item.id === generation.id
        ? {
            ...item,
            assetIds: item.assetIds.includes(asset.id)
              ? item.assetIds
              : [...item.assetIds, asset.id],
            calculatedCostMicros,
            costCents: cost.amountCents,
            ingestAttempts: item.ingestAttempts + 1,
          }
        : item
    ),
  };
  return transitionManagedGeneration(
    withRelationships,
    generation.id,
    'completed',
    {
      calculatedCostMicros,
      costCents: cost.amountCents,
      completedAt: runtime.now(),
    },
    'Generated output was saved and linked exactly once.',
    runtime
  );
}

export function recoverInterruptedSubmission(
  workspace: WorkspaceData,
  generationId: string,
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation || generation.operationalStatus !== 'submitting') return workspace;
  if (generation.submissionClaimExpiresAt && generation.submissionClaimExpiresAt > runtime.now())
    return workspace;
  if (!generation.providerSubmissionStartedAt) {
    return transitionManagedGeneration(
      workspace,
      generationId,
      'draft',
      {
        submissionClaimId: undefined,
        submissionClaimExpiresAt: undefined,
        reservedMaxCostMicros: 0,
        reservedOutputBytes: 0,
      },
      'Expired pre-submission claim was released safely.',
      runtime
    );
  }
  return transitionManagedGeneration(
    workspace,
    generationId,
    'submission_unknown',
    {
      submissionClaimId: undefined,
      submissionClaimExpiresAt: undefined,
      failureCode: 'submission_response_lost',
      failureMessage: 'Provider submission may have occurred; owner review is required.',
    },
    'Submission outcome is unknown; reservations remain held.',
    runtime
  );
}

export function resolveSubmissionUnknown(
  workspace: WorkspaceData,
  generationId: string,
  outcome: 'no_charge' | 'confirmed_charge',
  confirmedCostMicros = 0,
  runtime: RuntimeFactory = defaultRuntime
): WorkspaceData {
  const generation = workspace.generations.find((item) => item.id === generationId);
  if (!generation || generation.operationalStatus !== 'submission_unknown') {
    throw new Error('This generation does not require an unknown-submission decision.');
  }
  if (
    !Number.isSafeInteger(confirmedCostMicros) ||
    confirmedCostMicros < 0 ||
    confirmedCostMicros > generation.reservedMaxCostMicros
  ) {
    throw new Error('Confirmed cost must fit inside the reserved maximum.');
  }
  const charged = outcome === 'confirmed_charge';
  let next = workspace;
  if (
    charged &&
    generation.mediaKind &&
    !workspace.costEntries.some((entry) => entry.sourceGenerationId === generation.id)
  ) {
    next = {
      ...workspace,
      costEntries: [
        ...workspace.costEntries,
        {
          ...baseRecord(workspace.ownerId, runtime),
          episodeId: generation.episodeId,
          sourceGenerationId: generation.id,
          category: generation.mediaKind,
          amountCents: Math.round(confirmedCostMicros / 10_000),
          provider: generation.provider,
          note: 'Charge confirmed manually after an unknown submission response.',
          occurredOn: runtime.now().slice(0, 10),
        },
      ],
    };
  }
  return transitionManagedGeneration(
    next,
    generation.id,
    charged ? 'failed' : 'cancelled',
    {
      calculatedCostMicros: charged ? confirmedCostMicros : 0,
      costCents: charged ? Math.round(confirmedCostMicros / 10_000) : 0,
      failureCode: charged ? 'submission_charge_confirmed' : 'submission_not_charged',
      failureMessage: charged
        ? 'Provider charge was confirmed without a recoverable result.'
        : undefined,
    },
    charged
      ? 'Unknown submission was closed with a confirmed charge.'
      : 'Unknown submission was confirmed as not charged.',
    runtime
  );
}
