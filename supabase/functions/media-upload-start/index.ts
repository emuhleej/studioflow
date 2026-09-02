import { CreateMultipartUploadCommand, DeleteObjectCommand, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";
import { z } from "npm:zod@4";
import { requireOwner } from "../_shared/auth.ts";
import {
  b2Bucket,
  b2Client,
  camelRecord,
  MEDIA_LIMIT_BYTES,
  mediaStorageKey,
  MULTIPART_PART_BYTES,
  MULTIPART_THRESHOLD_BYTES,
  UPLOAD_BLOCK_BYTES,
  validateMediaMime,
} from "../_shared/b2.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";

const inputSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  bytes: z.number().int().positive().max(MEDIA_LIMIT_BYTES),
  mimeType: z.string().trim().min(1).max(160),
  projectId: z.string().uuid(),
  episodeId: z.string().uuid().optional(),
  kind: z.enum(["image", "audio", "video"]),
});

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;

  try {
    const { admin, user } = await requireOwner(request);
    const input = inputSchema.parse(await request.json());
    validateMediaMime(input.kind, input.mimeType);

    const { data: existing, error: usageError } = await admin
      .from("assets")
      .select("bytes")
      .eq("owner_id", user.id);
    if (usageError) throw usageError;
    const mediaBytes = (existing ?? []).reduce((total, asset) => total + Number(asset.bytes), 0);

    const { data: backups, error: backupError } = await admin
      .from("backup_runs")
      .select("bytes")
      .eq("owner_id", user.id)
      .eq("status", "completed");
    if (backupError) throw backupError;
    const backupBytes = (backups ?? []).reduce((total, backup) => total + Number(backup.bytes), 0);
    if (mediaBytes + backupBytes + input.bytes > UPLOAD_BLOCK_BYTES) {
      throw new Error("StudioFlow's 9 GB storage safety cap would be exceeded.");
    }

    const assetId = crypto.randomUUID();
    const storageKey = mediaStorageKey(user.id, assetId, input.filename);
    const { data: asset, error: assetError } = await admin
      .from("assets")
      .insert({
        id: assetId,
        owner_id: user.id,
        project_id: input.projectId,
        episode_id: input.episodeId ?? null,
        kind: input.kind,
        filename: input.filename,
        mime_type: input.mimeType,
        bytes: input.bytes,
        storage_key: storageKey,
        review_status: "unreviewed",
        source: "upload",
        notes: "",
      })
      .select("*")
      .single();
    if (assetError) throw assetError;

    const client = b2Client();
    const bucket = b2Bucket();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    try {
      if (input.bytes <= MULTIPART_THRESHOLD_BYTES) {
        const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: storageKey }), {
          expiresIn: 15 * 60,
        });
        const { error: sessionError } = await admin.from("upload_sessions").insert({
          owner_id: user.id,
          asset_id: assetId,
          mode: "single",
          state: "started",
          expires_at: expiresAt,
        });
        if (sessionError) throw sessionError;
        return json(request, { asset: camelRecord(asset), mode: "single", uploadUrl });
      }

      const created = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: storageKey }));
      if (!created.UploadId) throw new Error("Backblaze did not return a multipart upload ID.");
      const { error: sessionError } = await admin.from("upload_sessions").insert({
        owner_id: user.id,
        asset_id: assetId,
        upload_id: created.UploadId,
        mode: "multipart",
        part_size: MULTIPART_PART_BYTES,
        state: "started",
        expires_at: expiresAt,
      });
      if (sessionError) throw sessionError;
      return json(request, {
        asset: camelRecord(asset),
        mode: "multipart",
        uploadId: created.UploadId,
        partSize: MULTIPART_PART_BYTES,
      });
    } catch (error) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })).catch(() => undefined);
      await admin.from("assets").delete().eq("id", assetId).eq("owner_id", user.id);
      throw error;
    }
  } catch (error) {
    return errorResponse(request, error);
  }
});
