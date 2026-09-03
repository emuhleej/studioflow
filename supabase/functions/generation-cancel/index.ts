import { z } from "npm:zod@4";
import { requireOwner } from "../_shared/auth.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";
import { loadGenerationRow, nextGenerationPoll, runwayStatusProvider } from "../_shared/generation-service.ts";

const inputSchema = z.object({ generationId: z.string().uuid() }).strict();

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { admin, user } = await requireOwner(request);
    const { generationId } = inputSchema.parse(await request.json());
    const generation = await loadGenerationRow(admin, generationId, user.id);
    if (["completed", "failed", "cancelled", "submission_unknown"].includes(generation.operational_status)) {
      return json(request, { requested: false, status: generation.operational_status });
    }
    if (generation.operational_status === "draft") {
      const { error } = await admin.from("generation_records").update({
        operational_status: "cancelled",
        reserved_max_cost_micros: 0,
        reserved_output_bytes: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", generation.id).eq("owner_id", user.id).eq("operational_status", "draft");
      if (error) throw error;
      return json(request, { requested: true, status: "cancelled" });
    }
    if (generation.operational_status === "submitting" && !generation.provider_job_id) {
      return json(request, { requested: false, status: "submitting" });
    }

    const { error: requestError } = await admin.from("generation_records").update({
      operational_status: "cancel_requested",
      next_poll_at: nextGenerationPoll(0),
    }).eq("id", generation.id).eq("owner_id", user.id)
      .in("operational_status", ["submitting", "queued", "running", "saving"]);
    if (requestError) throw requestError;
    if (generation.provider_job_id) await runwayStatusProvider().cancel(generation.provider_job_id);
    return json(request, { requested: true, status: "cancel_requested" });
  } catch (error) {
    return errorResponse(request, error);
  }
});
