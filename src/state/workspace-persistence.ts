import { z } from 'zod';
import { demoWorkspace } from '../data/demo';
import type {
  BaseRecord,
  GenerationBudgetSettings,
  GenerationRecord,
  WorkspaceData,
} from '../types';
import type { EpisodeDraft } from './studio-context';
import { env } from '../lib/env';
import { isSupabaseConfigured } from '../lib/supabase';

const storageKey = 'studioflow-demo-workspace-v1';
const draftStorageKey = 'studioflow-episode-drafts-v1';

export const demoMode = env.VITE_DEMO_MODE || !isSupabaseConfigured;

export const workspaceCollectionKeys = [
  'projects',
  'series',
  'episodes',
  'scripts',
  'scenes',
  'shots',
  'entities',
  'assets',
  'prompts',
  'generations',
  'generationInputs',
  'generationEvents',
  'generationBudgetSettings',
  'assetLinks',
  'timeEntries',
  'costEntries',
  'publications',
  'captures',
] as const;

export function now(): string {
  return new Date().toISOString();
}

export function createId(): string {
  return crypto.randomUUID();
}

export function createBaseRecord(ownerId: string): BaseRecord {
  const timestamp = now();
  return { id: createId(), ownerId, createdAt: timestamp, updatedAt: timestamp };
}

export function freshDemo(): WorkspaceData {
  return structuredClone(demoWorkspace);
}

export function createDefaultGenerationBudgetSettings(ownerId: string): GenerationBudgetSettings {
  return {
    ...createBaseRecord(ownerId),
    generationEnabled: false,
    maxImageRequestMicros: 100_000,
    maxVideoRequestMicros: 300_000,
    dailyLimitMicros: 2_000_000,
    monthlyLimitMicros: 10_000_000,
    generatedOutputLimitBytes: 250_000_000,
    referenceImageLimitBytes: 16_000_000,
  };
}

function normalizeGeneration(record: GenerationRecord): GenerationRecord {
  const executionMode = record.executionMode ?? 'manual';
  return {
    ...record,
    executionMode,
    mediaKind: executionMode === 'managed' ? record.mediaKind : undefined,
    operationalStatus:
      record.operationalStatus ?? (executionMode === 'managed' ? 'draft' : 'recorded'),
    clientRequestId: executionMode === 'managed' ? record.clientRequestId : undefined,
    requestSettings: record.requestSettings ?? {},
    estimatedCostMicros: record.estimatedCostMicros ?? Math.max(0, record.costCents ?? 0) * 10_000,
    calculatedCostMicros: record.calculatedCostMicros,
    providerReportedCostMicros: record.providerReportedCostMicros,
    reservedMaxCostMicros: record.reservedMaxCostMicros ?? 0,
    pricingSnapshot: record.pricingSnapshot ?? {},
    estimatedOutputBytes: record.estimatedOutputBytes ?? 0,
    reservedOutputBytes: record.reservedOutputBytes ?? 0,
    pollAttempts: record.pollAttempts ?? 0,
    ingestAttempts: record.ingestAttempts ?? 0,
  };
}

export function normalizeWorkspace(workspace: WorkspaceData): WorkspaceData {
  const generationBudgetSettings = Array.isArray(workspace.generationBudgetSettings)
    ? workspace.generationBudgetSettings
    : [];
  return {
    ...workspace,
    assetLinks: Array.isArray(workspace.assetLinks) ? workspace.assetLinks : [],
    generations: Array.isArray(workspace.generations)
      ? workspace.generations.map(normalizeGeneration)
      : [],
    generationInputs: Array.isArray(workspace.generationInputs) ? workspace.generationInputs : [],
    generationEvents: Array.isArray(workspace.generationEvents) ? workspace.generationEvents : [],
    generationBudgetSettings: generationBudgetSettings.length
      ? generationBudgetSettings.map((settings) => ({
          ...settings,
          generationEnabled: settings.generationEnabled === true,
        }))
      : [createDefaultGenerationBudgetSettings(workspace.ownerId)],
  };
}

export function loadDemo(): WorkspaceData {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? normalizeWorkspace(JSON.parse(stored) as WorkspaceData) : freshDemo();
  } catch {
    return freshDemo();
  }
}

export function saveDemo(workspace: WorkspaceData): void {
  localStorage.setItem(storageKey, JSON.stringify(workspace));
}

export function loadEpisodeDrafts(): Record<string, EpisodeDraft> {
  try {
    const stored = localStorage.getItem(draftStorageKey);
    return stored ? (JSON.parse(stored) as Record<string, EpisodeDraft>) : {};
  } catch {
    return {};
  }
}

export function saveEpisodeDrafts(drafts: Record<string, EpisodeDraft>): void {
  localStorage.setItem(draftStorageKey, JSON.stringify(drafts));
}

const workspaceExportSchema = z.object({
  version: z.number(),
  ownerId: z.string(),
  projects: z.array(z.object({ id: z.string() }).passthrough()),
  series: z.array(z.object({ id: z.string() }).passthrough()),
  episodes: z.array(z.object({ id: z.string() }).passthrough()),
  scripts: z.array(z.object({ id: z.string() }).passthrough()),
  scenes: z.array(z.object({ id: z.string() }).passthrough()),
  shots: z.array(z.object({ id: z.string() }).passthrough()),
  entities: z.array(z.object({ id: z.string() }).passthrough()),
  assets: z.array(z.object({ id: z.string() }).passthrough()),
  assetLinks: z
    .array(z.object({ id: z.string() }).passthrough())
    .optional()
    .default([]),
  prompts: z.array(z.object({ id: z.string() }).passthrough()),
  generations: z.array(z.object({ id: z.string() }).passthrough()),
  generationInputs: z
    .array(z.object({ id: z.string() }).passthrough())
    .optional()
    .default([]),
  generationEvents: z
    .array(z.object({ id: z.string() }).passthrough())
    .optional()
    .default([]),
  generationBudgetSettings: z
    .array(z.object({ id: z.string() }).passthrough())
    .optional()
    .default([]),
  timeEntries: z.array(z.object({ id: z.string() }).passthrough()),
  costEntries: z.array(z.object({ id: z.string() }).passthrough()),
  publications: z.array(z.object({ id: z.string() }).passthrough()),
  captures: z.array(z.object({ id: z.string() }).passthrough()),
});

export function parseWorkspaceExport(parsed: unknown, ownerId: string): WorkspaceData {
  const imported = workspaceExportSchema.parse(parsed) as unknown as WorkspaceData;
  const normalized = normalizeWorkspace({ ...imported, ownerId });
  const mutableCollections = normalized as unknown as Record<string, BaseRecord[]>;
  for (const key of workspaceCollectionKeys) {
    const records = normalized[key] as BaseRecord[];
    mutableCollections[key] = records.map((record) => ({ ...record, ownerId }));
  }
  return normalized;
}
