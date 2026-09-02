import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3";
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
    const { data: asset, error } = await admin
      .from("assets")
      .select("storage_key, deleted_at")
      .eq("id", assetId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!asset) throw new Error("Media asset not found.");
    if (!asset.deleted_at) throw new Error("Media must be moved to trash before permanent deletion.");

    await b2Client().send(new DeleteObjectCommand({ Bucket: b2Bucket(), Key: asset.storage_key }));
    const { error: deleteError } = await admin.rpc("delete_asset_metadata", {
      target_asset_id: assetId,
      target_owner_id: user.id,
    });
    if (deleteError) throw deleteError;
    return json(request, { deleted: true });
  } catch (error) {
    return errorResponse(request, error);
  }
});
