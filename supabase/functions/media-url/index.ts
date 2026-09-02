import { GetObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";
import { z } from "npm:zod@4";
import { requireOwner } from "../_shared/auth.ts";
import { b2Bucket, b2Client } from "../_shared/b2.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  disposition: z.enum(["inline", "attachment"]).default("inline"),
});

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { admin, user } = await requireOwner(request);
    const { assetId, disposition } = inputSchema.parse(await request.json());
    const { data: asset, error } = await admin
      .from("assets")
      .select("storage_key, filename, mime_type")
      .eq("id", assetId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!asset) throw new Error("Media asset not found.");
    const dispositionName = asset.filename.replace(/["\\\r\n]/g, "_");
    const url = await getSignedUrl(
      b2Client(),
      new GetObjectCommand({
        Bucket: b2Bucket(),
        Key: asset.storage_key,
        ResponseContentType: asset.mime_type,
        ResponseContentDisposition: `${disposition}; filename="${dispositionName}"`,
      }),
      { expiresIn: 10 * 60 },
    );
    return json(request, { url, expiresInSeconds: 600 });
  } catch (error) {
    return errorResponse(request, error);
  }
});
