import { UploadPartCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";
import { z } from "npm:zod@4";
import { requireOwner } from "../_shared/auth.ts";
import { b2Bucket, b2Client } from "../_shared/b2.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1),
  partNumber: z.number().int().min(1).max(10_000),
});

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { admin, user } = await requireOwner(request);
    const input = inputSchema.parse(await request.json());
    const { data: session, error } = await admin
      .from("upload_sessions")
      .select("upload_id, state, expires_at, assets!inner(storage_key)")
      .eq("asset_id", input.assetId)
      .eq("owner_id", user.id)
      .single();
    if (error || !session) throw new Error("Upload session not found.");
    if (session.upload_id !== input.uploadId || session.state === "completed" || new Date(session.expires_at) < new Date()) {
      throw new Error("The multipart upload session is invalid or expired.");
    }
    const asset = session.assets as unknown as { storage_key: string };
    const uploadUrl = await getSignedUrl(
      b2Client(),
      new UploadPartCommand({
        Bucket: b2Bucket(),
        Key: asset.storage_key,
        UploadId: input.uploadId,
        PartNumber: input.partNumber,
      }),
      { expiresIn: 15 * 60 },
    );
    await admin.from("upload_sessions").update({ state: "uploading" }).eq("asset_id", input.assetId).eq("owner_id", user.id);
    return json(request, { uploadUrl });
  } catch (error) {
    return errorResponse(request, error);
  }
});
