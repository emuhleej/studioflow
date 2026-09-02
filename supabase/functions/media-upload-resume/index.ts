import { ListPartsCommand, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";
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
      .select("upload_id, mode, part_size, state, expires_at, assets!inner(storage_key)")
      .eq("asset_id", assetId)
      .eq("owner_id", user.id)
      .single();
    if (error || !session) throw new Error("Upload session not found.");
    if (new Date(session.expires_at) < new Date()) throw new Error("This upload session expired.");
    if (session.state === "cancelled") throw new Error("This upload was cancelled.");
    if (session.state === "completed") {
      return json(request, { mode: session.mode, state: session.state, completed: true });
    }
    const asset = session.assets as unknown as { storage_key: string };
    const client = b2Client();
    const bucket = b2Bucket();

    if (session.mode === "single") {
      const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: asset.storage_key }), { expiresIn: 15 * 60 });
      return json(request, { mode: "single", state: session.state, uploadUrl });
    }
    if (!session.upload_id) throw new Error("Multipart upload ID is missing.");
    const listed = await client.send(new ListPartsCommand({ Bucket: bucket, Key: asset.storage_key, UploadId: session.upload_id }));
    const completedParts = (listed.Parts ?? [])
      .filter((part): part is typeof part & { ETag: string; PartNumber: number } => Boolean(part.ETag) && Number.isInteger(part.PartNumber))
      .map((part) => ({ ETag: part.ETag.replaceAll('"', ""), PartNumber: part.PartNumber }));
    await admin.from("upload_sessions").update({ completed_parts: completedParts }).eq("asset_id", assetId).eq("owner_id", user.id);
    return json(request, {
      mode: "multipart",
      state: session.state,
      uploadId: session.upload_id,
      partSize: session.part_size,
      completedParts,
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
