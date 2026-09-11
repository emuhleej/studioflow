import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  attachProviderJob,
  claimManagedGeneration,
  completeManagedGeneration,
  markProviderSubmissionStarted,
  prepareManagedGeneration,
  recoverInterruptedSubmission,
  resolveSubmissionUnknown,
  transitionManagedGeneration,
  type PrepareManagedGenerationInput,
} from '../lib/managed-generation';
import {
  createFakeGenerationProvider,
  FAKE_PROVIDER_ID,
  type NormalizedGenerationRequest,
} from '../lib/generation-provider';
import { loadRemoteWorkspace, upsertRemoteRecord } from '../lib/remote-repository';
import { createRunwayPreparationProvider } from '../lib/runway-pricing';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { GenerationRecord, GenerationRequestSettings, WorkspaceData } from '../types';
import type { Notice } from './studio-context';
import { saveWithRetry } from './cloud-save';

interface GenerationManagerOptions {
  data: WorkspaceData;
  isDemo: boolean;
  user: User | null;
  getWorkspace: () => WorkspaceData;
  setWorkspace: Dispatch<SetStateAction<WorkspaceData>>;
  setNotice: Dispatch<SetStateAction<Notice>>;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function isRequestSettings(
  value: GenerationRecord['requestSettings']
): value is GenerationRequestSettings {
  return (
    'outputCount' in value &&
    value.outputCount === 1 &&
    'aspectRatio' in value &&
    'qualityTier' in value
  );
}

function requestFor(
  workspace: WorkspaceData,
  generation: GenerationRecord
): NormalizedGenerationRequest {
  const prompt = workspace.prompts.find((item) => item.id === generation.promptVersionId);
  if (
    !prompt ||
    !generation.clientRequestId ||
    !generation.mediaKind ||
    !isRequestSettings(generation.requestSettings)
  ) {
    throw new Error('Managed generation request data is incomplete.');
  }
  return {
    generationId: generation.id,
    clientRequestId: generation.clientRequestId,
    mediaKind: generation.mediaKind,
    promptVersionId: prompt.id,
    prompt: prompt.content,
    references: workspace.generationInputs
      .filter((input) => input.generationId === generation.id)
      .sort((left, right) => left.position - right.position)
      .map((input) => ({ assetId: input.assetId, role: input.role })),
    settings: generation.requestSettings,
    model: generation.model,
  };
}

export function useGenerationManager({
  data,
  isDemo,
  user,
  getWorkspace,
  setWorkspace,
  setNotice,
}: GenerationManagerOptions) {
  const activeRuns = useRef(new Set<string>());
  const provider = useRef(createFakeGenerationProvider()).current;
  const runwayPreparationProvider = useRef(createRunwayPreparationProvider()).current;

  const persistStep = useCallback(
    (next: WorkspaceData): WorkspaceData => {
      setWorkspace(next);
      return next;
    },
    [setWorkspace]
  );

  const finishFakeRun = useCallback(
    async (generationId: string) => {
      if (activeRuns.current.has(generationId)) return;
      activeRuns.current.add(generationId);
      try {
        let workspace = getWorkspace();
        let generation = workspace.generations.find((item) => item.id === generationId);
        if (!generation || generation.provider !== FAKE_PROVIDER_ID) return;

        if (generation.operationalStatus === 'submitting') {
          workspace = persistStep(recoverInterruptedSubmission(workspace, generationId));
          generation = workspace.generations.find((item) => item.id === generationId);
          if (
            !generation ||
            generation.operationalStatus === 'draft' ||
            generation.operationalStatus === 'submission_unknown'
          )
            return;
        }
        if (generation.operationalStatus === 'cancel_requested') {
          if (generation.providerJobId) await provider.cancel(generation.providerJobId);
          persistStep(
            transitionManagedGeneration(
              workspace,
              generationId,
              'cancelled',
              {},
              'Simulation cancelled without a provider charge.'
            )
          );
          return;
        }
        if (!generation.providerJobId) return;
        if (generation.operationalStatus === 'queued') {
          workspace = persistStep(
            transitionManagedGeneration(
              workspace,
              generationId,
              'running',
              {
                startedAt: new Date().toISOString(),
                pollAttempts: generation.pollAttempts + 1,
              },
              'Simulation entered the running state.'
            )
          );
          await wait(120);
        }
        generation = workspace.generations.find((item) => item.id === generationId);
        if (generation?.operationalStatus === 'running') {
          workspace = persistStep(
            transitionManagedGeneration(
              workspace,
              generationId,
              'saving',
              {},
              'Simulation output is being saved.'
            )
          );
          await wait(120);
        }
        generation = workspace.generations.find((item) => item.id === generationId);
        if (generation?.operationalStatus === 'saving') {
          const result = await provider.retrieve(generation.providerJobId ?? '');
          workspace = persistStep(completeManagedGeneration(workspace, generationId, result));
          setNotice({
            tone: 'success',
            message:
              'Simulation completed. No AI provider was contacted and the recorded cost is $0.00.',
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'The generation simulation could not finish.';
        setNotice({ tone: 'error', message });
      } finally {
        activeRuns.current.delete(generationId);
      }
    },
    [getWorkspace, persistStep, provider, setNotice]
  );

  const simulateGeneration = useCallback(
    async (input: PrepareManagedGenerationInput): Promise<string> => {
      if (!isDemo)
        throw new Error(
          'Account-free simulation is available only in the fictional demo workspace.'
        );
      let workspace = getWorkspace();
      const creation = prepareManagedGeneration(workspace, input, provider);
      workspace = persistStep({
        ...workspace,
        generations: [...workspace.generations, creation.generation],
        generationInputs: [...workspace.generationInputs, ...creation.inputs],
        generationEvents: [...workspace.generationEvents, creation.event],
      });
      const claimId = crypto.randomUUID();
      workspace = persistStep(claimManagedGeneration(workspace, creation.generation.id, claimId));
      workspace = persistStep(
        markProviderSubmissionStarted(workspace, creation.generation.id, claimId)
      );
      const request = requestFor(workspace, creation.generation);
      const job = await provider.create(request);
      persistStep(attachProviderJob(workspace, creation.generation.id, job.providerJobId));
      await wait(120);
      void finishFakeRun(creation.generation.id);
      return creation.generation.id;
    },
    [finishFakeRun, getWorkspace, isDemo, persistStep, provider]
  );

  const startRunwayGeneration = useCallback(
    async (input: PrepareManagedGenerationInput): Promise<string> => {
      if (isDemo) throw new Error('Live Runway generation is unavailable in the fictional demo.');
      if (!user || !supabase) throw new Error('Sign in as the StudioFlow owner before generating.');
      const requiredRole = input.mediaKind === 'video' ? 'start_image' : 'reference_image';
      if (input.references.length !== 1 || input.references[0]?.role !== requiredRole) {
        throw new Error(
          `The first live ${input.mediaKind} requires exactly one approved private ${
            input.mediaKind === 'video' ? 'starting' : 'reference'
          } image.`
        );
      }

      const creation = prepareManagedGeneration(getWorkspace(), input, runwayPreparationProvider);

      await saveWithRetry(() => upsertRemoteRecord('generations', creation.generation));
      for (const reference of creation.inputs) {
        await saveWithRetry(() => upsertRemoteRecord('generationInputs', reference));
      }

      setWorkspace((current) => ({
        ...current,
        generations: [...current.generations, creation.generation],
        generationInputs: [...current.generationInputs, ...creation.inputs],
        generationEvents: [...current.generationEvents, creation.event],
      }));

      const { data: response, error } = await supabase.functions.invoke('generation-start', {
        body: { generationId: creation.generation.id },
      });

      try {
        const remote = await loadRemoteWorkspace(user);
        setWorkspace(remote);
      } catch {
        setNotice({
          tone: 'info',
          message: 'Generation started, but status refresh will retry automatically.',
        });
      }

      if (error) {
        throw new Error(
          'The provider submission response was not confirmed. Do not retry this request; StudioFlow will reconcile its saved lifecycle.'
        );
      }
      const result = response as { accepted?: boolean; status?: string } | null;
      if (!result?.accepted) {
        throw new Error(`Generation was not started (${result?.status ?? 'unknown status'}).`);
      }

      setNotice({
        tone: 'success',
        message: `One private Runway ${input.mediaKind} request started. StudioFlow is tracking its lifecycle.`,
      });
      return creation.generation.id;
    },
    [getWorkspace, isDemo, runwayPreparationProvider, setNotice, setWorkspace, user]
  );

  const cancelManagedGeneration = useCallback(
    async (generationId: string) => {
      let workspace = getWorkspace();
      const generation = workspace.generations.find((item) => item.id === generationId);
      if (!generation || generation.executionMode !== 'managed')
        throw new Error('Managed generation not found.');
      if (!isDemo && generation.provider !== FAKE_PROVIDER_ID) {
        if (!user || !supabase) throw new Error('Sign in as the StudioFlow owner to cancel.');
        const { error } = await supabase.functions.invoke('generation-cancel', {
          body: { generationId },
        });
        if (error) throw new Error('The generation cancellation could not be confirmed.');
        setWorkspace(await loadRemoteWorkspace(user));
        setNotice({ tone: 'info', message: 'Cancellation was sent to the generation provider.' });
        return;
      }
      if (generation.operationalStatus === 'draft') {
        persistStep(
          transitionManagedGeneration(
            workspace,
            generationId,
            'cancelled',
            {},
            'Prepared generation was cancelled.'
          )
        );
        return;
      }
      if (
        !['submitting', 'queued', 'running', 'saving', 'cancel_requested'].includes(
          generation.operationalStatus
        )
      )
        return;
      if (generation.operationalStatus !== 'cancel_requested') {
        workspace = persistStep(
          transitionManagedGeneration(
            workspace,
            generationId,
            'cancel_requested',
            {},
            'Cancellation requested.'
          )
        );
      }
      if (generation.provider === FAKE_PROVIDER_ID) {
        if (generation.providerJobId) await provider.cancel(generation.providerJobId);
        persistStep(
          transitionManagedGeneration(
            workspace,
            generationId,
            'cancelled',
            {},
            'Simulation cancelled without a provider charge.'
          )
        );
        setNotice({ tone: 'info', message: 'Simulation cancelled. No provider was contacted.' });
      }
    },
    [getWorkspace, isDemo, persistStep, provider, setNotice, setWorkspace, user]
  );

  const resolveUnknownSubmission = useCallback(
    (generationId: string, outcome: 'no_charge' | 'confirmed_charge', confirmedCostMicros = 0) => {
      persistStep(
        resolveSubmissionUnknown(getWorkspace(), generationId, outcome, confirmedCostMicros)
      );
    },
    [getWorkspace, persistStep]
  );

  const activeFingerprint = data.generations
    .filter(
      (generation) =>
        generation.executionMode === 'managed' && generation.provider === FAKE_PROVIDER_ID
    )
    .map((generation) => `${generation.id}:${generation.operationalStatus}:${generation.updatedAt}`)
    .join('|');

  useEffect(() => {
    if (!isDemo) return;
    for (const generation of getWorkspace().generations) {
      if (
        generation.executionMode === 'managed' &&
        generation.provider === FAKE_PROVIDER_ID &&
        ['submitting', 'queued', 'running', 'saving', 'cancel_requested'].includes(
          generation.operationalStatus
        )
      ) {
        void finishFakeRun(generation.id);
      }
    }
  }, [activeFingerprint, finishFakeRun, getWorkspace, isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    const recovery = window.setInterval(() => {
      for (const generation of getWorkspace().generations) {
        if (
          generation.executionMode === 'managed' &&
          generation.provider === FAKE_PROVIDER_ID &&
          generation.operationalStatus === 'submitting'
        ) {
          void finishFakeRun(generation.id);
        }
      }
    }, 15_000);
    return () => window.clearInterval(recovery);
  }, [finishFakeRun, getWorkspace, isDemo]);

  useEffect(() => {
    if (isDemo || !user) return;
    const hasManagedWork = data.generations.some(
      (generation) =>
        generation.executionMode === 'managed' &&
        ['queued', 'running', 'saving', 'cancel_requested', 'submission_unknown'].includes(
          generation.operationalStatus
        )
    );
    if (!hasManagedWork) return;
    const refresh = window.setInterval(() => {
      void loadRemoteWorkspace(user)
        .then((remote) => {
          setWorkspace((current) => ({
            ...current,
            generations: remote.generations,
            generationInputs: remote.generationInputs,
            generationEvents: remote.generationEvents,
            generationBudgetSettings: remote.generationBudgetSettings,
            assets: remote.assets,
            assetLinks: remote.assetLinks,
            costEntries: remote.costEntries,
          }));
        })
        .catch(() => {
          setNotice({
            tone: 'info',
            message: 'Generation status refresh will retry automatically.',
          });
        });
    }, 15_000);
    return () => window.clearInterval(refresh);
  }, [data.generations, isDemo, setNotice, setWorkspace, user]);

  return {
    simulateGeneration,
    startRunwayGeneration,
    cancelManagedGeneration,
    resolveUnknownSubmission,
  };
}
