import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { BaseRecord, WorkspaceData } from '../types';

export type WorkspaceArrayKey = Exclude<keyof WorkspaceData, 'version' | 'ownerId'>;

const tableByKey: Record<WorkspaceArrayKey, string> = {
  projects: 'projects',
  series: 'series',
  episodes: 'episodes',
  scripts: 'script_versions',
  scenes: 'scenes',
  shots: 'shots',
  entities: 'entities',
  assets: 'assets',
  assetLinks: 'asset_links',
  prompts: 'prompt_versions',
  generations: 'generation_records',
  generationInputs: 'generation_input_assets',
  generationEvents: 'generation_events',
  generationBudgetSettings: 'generation_budget_settings',
  timeEntries: 'time_entries',
  costEntries: 'cost_entries',
  publications: 'publications',
  captures: 'captures',
};

const keyByTable = Object.fromEntries(
  Object.entries(tableByKey).map(([key, table]) => [table, key])
) as Record<string, WorkspaceArrayKey>;

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function convertKeys(
  record: Record<string, unknown>,
  transform: (value: string) => string
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [transform(key), value]));
}

export function toDatabaseRecord(record: Record<string, unknown>): Record<string, unknown> {
  return convertKeys(record, toSnakeCase);
}

export function fromDatabaseRecord<T>(record: Record<string, unknown>): T {
  return convertKeys(record, toCamelCase) as T;
}

export function getRemoteUpsertOptions(
  key: WorkspaceArrayKey
): { onConflict: string; ignoreDuplicates?: boolean } | undefined {
  if (key === 'assetLinks') return { onConflict: 'asset_id,target_type,target_id' };
  if (key === 'generationInputs') return { onConflict: 'generation_id,asset_id,role' };
  if (key === 'generationEvents') return { onConflict: 'id', ignoreDuplicates: true };
  if (key === 'generationBudgetSettings') return { onConflict: 'owner_id' };
  return undefined;
}

export async function loadRemoteWorkspace(user: User): Promise<WorkspaceData> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const client = supabase;

  const data: WorkspaceData = {
    version: 2,
    ownerId: user.id,
    projects: [],
    series: [],
    episodes: [],
    scripts: [],
    scenes: [],
    shots: [],
    entities: [],
    assets: [],
    assetLinks: [],
    prompts: [],
    generations: [],
    generationInputs: [],
    generationEvents: [],
    generationBudgetSettings: [],
    timeEntries: [],
    costEntries: [],
    publications: [],
    captures: [],
  };

  const results = await Promise.all(
    Object.values(tableByKey).map(async (table) => {
      const response = await client.from(table).select('*');
      if (response.error) throw response.error;
      return { table, rows: response.data ?? [] };
    })
  );

  for (const { table, rows } of results) {
    const key = keyByTable[table];
    (data[key] as unknown[]) = rows.map((row) => fromDatabaseRecord(row));
  }

  return data;
}

export async function upsertRemoteRecord(
  key: WorkspaceArrayKey,
  record: BaseRecord
): Promise<void> {
  if (!supabase) return;
  const databaseRecord = toDatabaseRecord(record as unknown as Record<string, unknown>);
  const options = getRemoteUpsertOptions(key);
  const { error } = options
    ? await supabase.from(tableByKey[key]).upsert(databaseRecord, options)
    : await supabase.from(tableByKey[key]).upsert(databaseRecord);
  if (error) throw error;
}

export async function permanentlyDeleteRemoteRecord(
  key: WorkspaceArrayKey,
  id: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(tableByKey[key]).delete().eq('id', id);
  if (error) throw error;
}
