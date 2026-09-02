import { CompleteMultipartUploadCommand, HeadObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { z } from "npm:zod@4";
import { requireOwner } from "../_shared/auth.ts";
import { b2Bucket, b2Client } from "../_shared/b2.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1).optional(),
  parts: z.array(z.object({ ETag: z.string().min(1), PartNumber: z.number().int().positive() })).max(10_000).optional(),
});

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { admin, user } = await requireOwner(request);
    const input = inputSchema.parse(await request.json());
    const { data: session, error } = await admin
      .from("upload_sessions")
      .select("id, upload_id, mode, state, expires_at, assets!inner(storage_key, bytes)")
      .eq("asset_id", input.assetId)
      .eq("owner_id", user.id)
      .single();
    if (error || !session) throw new Error("Upload session not found.");
    if (session.state === "cancelled") throw new Error("This upload was cancelled.");
    if (session.state === "completed") return json(request, { completed: true, alreadyCompleted: true });
    if (new Date(session.expires_at) < new Date()) throw new Error("This upload session expired.");

    const asset = session.assets as unknown as { storage_key: string; bytes: number | string };
    const client = b2Client();
    const bucket = b2Bucket();

    if (session.mode === "multipart") {
      if (!input.uploadId || input.uploadId !== session.upload_id || !input.parts?.length) {
        throw new Error("Multipart completion details are incomplete.");
      }
      const parts = [...input.parts].sort((left, right) => left.PartNumber - right.PartNumber);
      await client.send(new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: asset.storage_key,
        UploadId: input.uploadId,
        MultipartUpload: { Parts: parts },
      }));
    }

    const uploaded = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: asset.storage_key }));
    if (Number(uploaded.ContentLength) !== Number(asset.bytes)) {
      throw new Error("Uploaded media size does not match the expected file size.");
    }
    const completedAt = new Date().toISOString();
    const { error: updateError } = await admin
      .from("upload_sessions")
      .update({ state: "completed", completed_at: completedAt, completed_parts: input.parts ?? [] })
      .eq("id", session.id)
      .eq("owner_id", user.id);
    if (updateError) throw updateError;
    return json(request, { completed: true });
  } catch (error) {
    return errorResponse(request, error);
  }
});
