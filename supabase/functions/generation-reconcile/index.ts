import { adminClient, requireGenerationJob } from "../_shared/auth.ts";
import { errorResponse, json, options } from "../_shared/cors.ts";
import { nextGenerationPoll, runwayStatusProvider } from "../_shared/generation-service.ts";

function safeProviderText(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/https?:\/\/\S+/gi, "[provider URL removed]").slice(0, 1_000);
}

async function invokeIngest(generationId: string): Promise<void> {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("GENERATION_JOB_SECRET");
  if (!baseUrl || !secret) throw new Error("Generation ingest service configuration is incomplete.");
  const response = await fetch(`${baseUrl}/functions/v1/generation-ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-generation-job-secret": secret },
    body: JSON.stringify({ generationId }),
    redirect: "manual",
  });
  if (!response.ok) throw new Error(`Generated-output ingest failed with HTTP ${response.status}.`);
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    requireGenerationJob(request);
    const admin = adminClient();
    const { data: recovered, error: recoveryError } = await admin.rpc("recover_stale_generation_claims");
    if (recoveryError) throw recoveryError;

    const { data: owner, error: ownerError } = await admin.from("app_owners").select("user_id").limit(1).single();
    if (ownerError || !owner) throw new Error("No StudioFlow owner is configured.");

    const now = new Date().toISOString();
    const { data: due, error: dueError } = await admin
      .from("generation_records")
      .select("id, owner_id, operational_status, provider_job_id, poll_attempts, ingest_attempts, estimated_cost_micros")
      .eq("execution_mode", "managed")
      .eq("provider", "runway")
      .eq("owner_id", owner.user_id)
      .in("operational_status", ["queued", "running", "saving", "cancel_requested"])
      .or(`next_poll_at.is.null,next_poll_at.lte.${now}`)
      .order("next_poll_at", { ascending: true, nullsFirst: true })
      .limit(10);
    if (dueError) throw dueError;

    let checked = 0;
    let ingestQueued = 0;
    let attentionRequired = 0;
    const provider = due?.length ? runwayStatusProvider() : null;
    for (const generation of due ?? []) {
      checked += 1;
      if (generation.operational_status === "saving") {
        try {
          await invokeIngest(generation.id);
        } catch {
          await admin.from("generation_records").update({
            ingest_attempts: Number(generation.ingest_attempts) + 1,
            next_poll_at: nextGenerationPoll(Number(generation.ingest_attempts) + 1),
          }).eq("id", generation.id).eq("owner_id", generation.owner_id).eq("operational_status", "saving");
        }
        ingestQueued += 1;
        continue;
      }
      if (!generation.provider_job_id || !provider) continue;
      if (generation.operational_status === "cancel_requested") {
        await provider.cancel(generation.provider_job_id);
      }
      const state = await provider.retrieve(generation.provider_job_id);
      const attempt = Number(generation.poll_attempts) + 1;
      if (state.status === "queued" || state.status === "running") {
        const nextStatus = state.status === "running" && generation.operational_status === "queued"
          ? "running"
          : generation.operational_status;
        await admin.from("generation_records").update({
          operational_status: nextStatus,
          poll_attempts: attempt,
          started_at: state.status === "running" ? new Date().toISOString() : undefined,
          next_poll_at: nextGenerationPoll(attempt),
        }).eq("id", generation.id).eq("owner_id", generation.owner_id)
          .eq("operational_status", generation.operational_status);
        continue;
      }
      if (state.status === "succeeded") {
        if (generation.operational_status === "cancel_requested") {
          const { error: resumeError } = await admin.from("generation_records").update({
            operational_status: "running",
            poll_attempts: attempt,
          }).eq("id", generation.id).eq("owner_id", generation.owner_id)
            .eq("operational_status", "cancel_requested");
          if (resumeError) throw resumeError;
        }
        const { error } = await admin.from("generation_records").update({
          operational_status: "saving",
          poll_attempts: attempt,
          next_poll_at: now,
        }).eq("id", generation.id).eq("owner_id", generation.owner_id)
          .in("operational_status", ["queued", "running"]);
        if (error) throw error;
        await invokeIngest(generation.id);
        ingestQueued += 1;
        continue;
      }
      if (state.status === "cancelled") {
        const { error } = await admin.rpc("finalize_generation_without_output", {
          target_generation_id: generation.id,
          target_owner_id: generation.owner_id,
          target_status: "submission_unknown",
          settled_cost_micros: null,
          target_failure_code: "cancellation_charge_unknown",
          target_failure_message: "Provider cancellation was confirmed; charge status requires owner review.",
        });
        if (error) throw error;
        attentionRequired += 1;
        continue;
      }
      const { error } = await admin.rpc("finalize_generation_without_output", {
        target_generation_id: generation.id,
        target_owner_id: generation.owner_id,
        target_status: "failed",
        settled_cost_micros: Number(generation.estimated_cost_micros),
        target_failure_code: safeProviderText(state.failureCode, "provider_failed"),
        target_failure_message: safeProviderText(state.failureMessage, "The provider generation failed without a saved output."),
      });
      if (error) throw error;
    }

    return json(request, {
      recoveredClaims: Number(recovered ?? 0),
      checked,
      ingestQueued,
      attentionRequired,
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
