import { AbortMultipartUploadCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { z } from "npm:zod@4";
import { requireOwner } from "../_shared/auth.ts";
import { b2Bucket, b2Client } from "../_shared/b2.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";

const inputSchema = z.object({ assetId: z.string().uuid() });

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { admin, user } = await requireOwner(request);
    const { assetId } = inputSchema.parse(await request.json());
    const { data: session, error } = await admin
      .from("upload_sessions")
      .select("upload_id, mode, state, assets!inner(storage_key)")
      .eq("asset_id", assetId)
      .eq("owner_id", user.id)
      .single();
    if (error || !session) throw new Error("Upload session not found.");
    if (session.state === "completed") throw new Error("A completed upload must be moved to trash before permanent deletion.");

    const asset = session.assets as unknown as { storage_key: string };
    const client = b2Client();
    const bucket = b2Bucket();
    if (session.mode === "multipart" && session.upload_id) {
      await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: asset.storage_key, UploadId: session.upload_id }));
    }
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.storage_key })).catch(() => undefined);
    const { error: deleteError } = await admin.from("assets").delete().eq("id", assetId).eq("owner_id", user.id);
    if (deleteError) throw deleteError;
    return json(request, { cancelled: true });
  } catch (error) {
    return errorResponse(request, error);
  }
});
