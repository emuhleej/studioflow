import { PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { adminClient, isBackupJob, requireOwner } from "../_shared/auth.ts";
import { b2Bucket, b2Client, camelRecord, UPLOAD_BLOCK_BYTES } from "../_shared/b2.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";

const workspaceTables = {
  projects: "projects",
  series: "series",
  episodes: "episodes",
  scripts: "script_versions",
  scenes: "scenes",
  shots: "shots",
  entities: "entities",
  assets: "assets",
  assetLinks: "asset_links",
  prompts: "prompt_versions",
  generations: "generation_records",
  generationInputs: "generation_input_assets",
  generationEvents: "generation_events",
  generationBudgetSettings: "generation_budget_settings",
  timeEntries: "time_entries",
  costEntries: "cost_entries",
  publications: "publications",
  captures: "captures",
} as const;

const infrastructureTables = ["upload_sessions"] as const;

function decodeKey(value: string): Uint8Array {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 32) throw new Error("BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return bytes;
}

async function encrypt(payload: string): Promise<Uint8Array> {
  const keyValue = Deno.env.get("BACKUP_ENCRYPTION_KEY");
  if (!keyValue) throw new Error("Missing required secret: BACKUP_ENCRYPTION_KEY");
  const key = await crypto.subtle.importKey("raw", decodeKey(keyValue), { name: "AES-GCM" }, false, ["encrypt"]);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode(payload)));
  const envelope = new Uint8Array(nonce.byteLength + ciphertext.byteLength);
  envelope.set(nonce);
  envelope.set(ciphertext, nonce.byteLength);
  return envelope;
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const scheduled = isBackupJob(request);
    const authenticated = scheduled ? null : await requireOwner(request);
    const admin = authenticated?.admin ?? adminClient();
    const ownerIds = authenticated
      ? [authenticated.user.id]
      : ((await admin.from("app_owners").select("user_id")).data ?? []).map((owner) => owner.user_id as string);
    if (!ownerIds.length) throw new Error("No StudioFlow owner is configured.");

    const results: Array<{ ownerId: string; storageKey: string; bytes: number }> = [];
    for (const ownerId of ownerIds) {
      const workspace: Record<string, unknown> = { version: 2, ownerId };
      for (const [key, table] of Object.entries(workspaceTables)) {
        const { data, error } = await admin.from(table).select("*").eq("owner_id", ownerId);
        if (error) throw error;
        workspace[key] = (data ?? []).map((record) => camelRecord(record));
      }
      const infrastructure: Record<string, unknown> = {};
      for (const table of infrastructureTables) {
        const { data, error } = await admin.from(table).select("*").eq("owner_id", ownerId);
        if (error) throw error;
        infrastructure[table] = data ?? [];
      }
      const content = {
        schemaVersion: 2,
        ownerId,
        createdAt: new Date().toISOString(),
        workspace,
        infrastructure,
      };
      const encrypted = await encrypt(JSON.stringify(content));

      const { data: assets } = await admin.from("assets").select("bytes").eq("owner_id", ownerId);
      const { data: priorBackups } = await admin.from("backup_runs").select("bytes").eq("owner_id", ownerId).eq("status", "completed");
      const usedBytes = [...(assets ?? []), ...(priorBackups ?? [])].reduce((sum, record) => sum + Number(record.bytes), 0);
      if (usedBytes + encrypted.byteLength > UPLOAD_BLOCK_BYTES) throw new Error("The 9 GB storage safety cap prevents this backup.");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const storageKey = `owners/${ownerId}/backups/studioflow-${timestamp}.json.aesgcm`;
      await b2Client().send(new PutObjectCommand({
        Bucket: b2Bucket(),
        Key: storageKey,
        Body: encrypted,
        ContentType: "application/octet-stream",
        Metadata: { algorithm: "AES-256-GCM", envelope: "12-byte-nonce-plus-ciphertext", schema: "2" },
      }));
      const { error: recordError } = await admin.from("backup_runs").insert({
        owner_id: ownerId,
        storage_key: storageKey,
        bytes: encrypted.byteLength,
        status: "completed",
      });
      if (recordError) throw recordError;
      results.push({ ownerId, storageKey, bytes: encrypted.byteLength });
    }
    return json(request, { backedUp: results.length, backups: results });
  } catch (error) {
    return errorResponse(request, error);
  }
});
