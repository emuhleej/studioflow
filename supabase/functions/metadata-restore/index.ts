import { GetObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { adminClient, requireOwner } from '../_shared/auth.ts';
import { b2Bucket, b2Client } from '../_shared/b2.ts';
import { errorResponse, json, options } from '../_shared/cors.ts';

const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const RESTORE_BATCH_SIZE = 100;

const restoreCollections = [
  ['projects', 'projects'],
  ['series', 'series'],
  ['episodes', 'episodes'],
  ['scripts', 'script_versions'],
  ['scenes', 'scenes'],
  ['shots', 'shots'],
  ['entities', 'entities'],
  ['assets', 'assets'],
  ['prompts', 'prompt_versions'],
  ['generations', 'generation_records'],
  ['generationInputs', 'generation_input_assets'],
  ['generationEvents', 'generation_events'],
  ['generationBudgetSettings', 'generation_budget_settings'],
  ['assetLinks', 'asset_links'],
  ['timeEntries', 'time_entries'],
  ['costEntries', 'cost_entries'],
  ['publications', 'publications'],
  ['captures', 'captures'],
] as const;

type RestoreCollection = (typeof restoreCollections)[number][0];

interface BackupContent {
  schemaVersion: number;
  ownerId: string;
  createdAt: string;
  workspace: Record<string, unknown>;
  infrastructure?: Record<string, unknown>;
}

function decodeKey(value: string): Uint8Array {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 32)
    throw new Error('BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return bytes;
}

async function decrypt(envelope: Uint8Array): Promise<string> {
  if (envelope.byteLength < 29) throw new Error('The encrypted backup envelope is invalid.');
  const keyValue = Deno.env.get('BACKUP_ENCRYPTION_KEY');
  if (!keyValue) throw new Error('Missing required secret: BACKUP_ENCRYPTION_KEY');
  const key = await crypto.subtle.importKey(
    'raw',
    decodeKey(keyValue),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: envelope.slice(0, 12) },
    key,
    envelope.slice(12)
  );
  return new TextDecoder().decode(plaintext);
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toDatabaseRecord(record: Record<string, unknown>, ownerId: string) {
  const converted = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [toSnakeCase(key), value])
  );
  converted.owner_id = ownerId;
  return converted;
}

function requireRecords(container: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const records = container[key];
  if (!Array.isArray(records)) throw new Error(`Backup collection ${key} is invalid.`);
  if (
    !records.every(
      (record) =>
        typeof record === 'object' &&
        record !== null &&
        typeof (record as Record<string, unknown>).id === 'string'
    )
  ) {
    throw new Error(`Backup collection ${key} contains an invalid record.`);
  }
  return records as Record<string, unknown>[];
}

function parseBackup(value: unknown, ownerId: string): BackupContent {
  if (!value || typeof value !== 'object') throw new Error('The decrypted backup is invalid.');
  const content = value as Partial<BackupContent>;
  if (content.schemaVersion !== 2) throw new Error('The encrypted backup is not schema version 2.');
  if (content.ownerId !== ownerId) throw new Error('The encrypted backup owner does not match.');
  if (typeof content.createdAt !== 'string') throw new Error('The backup timestamp is invalid.');
  if (!content.workspace || typeof content.workspace !== 'object') {
    throw new Error('The backup workspace is invalid.');
  }
  if (content.workspace.ownerId !== ownerId || content.workspace.version !== 2) {
    throw new Error('The backup workspace identity is invalid.');
  }
  for (const [key] of restoreCollections) requireRecords(content.workspace, key);
  return content as BackupContent;
}

function conflictTarget(collection: RestoreCollection): string {
  return collection === 'generationBudgetSettings' ? 'owner_id' : 'id';
}

async function restoreRows(
  table: string,
  collection: RestoreCollection,
  records: Record<string, unknown>[],
  ownerId: string
): Promise<number> {
  const admin = adminClient();
  let checked = 0;
  for (let index = 0; index < records.length; index += RESTORE_BATCH_SIZE) {
    const batch = records.slice(index, index + RESTORE_BATCH_SIZE).map((record) => {
      const converted = toDatabaseRecord(record, ownerId);
      if (collection === 'generationBudgetSettings') converted.generation_enabled = false;
      return converted;
    });
    const ids = batch.map((record) => String(record.id));
    const existingQuery = admin.from(table).select('id').eq('owner_id', ownerId);
    const { data: existing, error: existingError } =
      collection === 'generationBudgetSettings'
        ? await existingQuery.limit(1)
        : await existingQuery.in('id', ids);
    if (existingError) throw new Error(`Restore stopped at ${collection}: ${existingError.message}`);
    const existingIds = new Set((existing ?? []).map((record) => String(record.id)));
    const missing =
      collection === 'generationBudgetSettings' && existingIds.size > 0
        ? []
        : batch.filter((record) => !existingIds.has(String(record.id)));
    if (!missing.length) {
      checked += batch.length;
      continue;
    }
    const { error } = await admin.from(table).upsert(missing, {
      onConflict: conflictTarget(collection),
      ignoreDuplicates: true,
    });
    if (error) throw new Error(`Restore stopped at ${collection}: ${error.message}`);
    checked += batch.length;
  }
  return checked;
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { user, admin } = await requireOwner(request);
    const { data: backup, error: backupError } = await admin
      .from('backup_runs')
      .select('storage_key, bytes, created_at')
      .eq('owner_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (backupError) throw backupError;
    if (!backup) throw new Error('No completed encrypted backup was found.');
    if (
      typeof backup.storage_key !== 'string' ||
      !backup.storage_key.startsWith(`owners/${user.id}/backups/`)
    ) {
      throw new Error('The backup object path is invalid.');
    }
    if (Number(backup.bytes) <= 0 || Number(backup.bytes) > MAX_BACKUP_BYTES) {
      throw new Error('The backup exceeds the restore safety limit.');
    }

    const object = await b2Client().send(
      new GetObjectCommand({ Bucket: b2Bucket(), Key: backup.storage_key })
    );
    if (!object.Body) throw new Error('The encrypted backup object is empty.');
    if (Number(object.ContentLength ?? 0) > MAX_BACKUP_BYTES) {
      throw new Error('The backup exceeds the restore safety limit.');
    }
    const encrypted = await object.Body.transformToByteArray();
    if (encrypted.byteLength !== Number(backup.bytes)) {
      throw new Error('The encrypted backup size does not match its database record.');
    }
    const content = parseBackup(JSON.parse(await decrypt(encrypted)) as unknown, user.id);

    const counts: Partial<Record<RestoreCollection | 'uploadSessions', number>> = {};
    for (const [collection, table] of restoreCollections) {
      const records = requireRecords(content.workspace, collection);
      counts[collection] = await restoreRows(table, collection, records, user.id);
    }

    const uploadSessions = content.infrastructure
      ? requireRecords(content.infrastructure, 'upload_sessions')
      : [];
    counts.uploadSessions = await restoreRows(
      'upload_sessions',
      'assets',
      uploadSessions,
      user.id
    );

    return json(request, {
      restored: true,
      schemaVersion: content.schemaVersion,
      backupCreatedAt: content.createdAt,
      recordsChecked: Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0),
      collections: counts,
      mode: 'non-destructive',
      generationEnabled: false,
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
