import { z } from 'npm:zod@4';
import { requireOwner } from '../_shared/auth.ts';
import { errorResponse, json, options } from '../_shared/cors.ts';
import {
  loadGenerationRow,
  nextGenerationPoll,
  runwayRequestContext,
} from '../_shared/generation-service.ts';
import { RUNWAY_API_VERSION } from '../_shared/runway.ts';

const inputSchema = z.object({ generationId: z.string().uuid() }).strict();

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  try {
    const { admin, user } = await requireOwner(request);
    const { generationId } = inputSchema.parse(await request.json());
    const generation = await loadGenerationRow(admin, generationId, user.id);
    if (generation.operational_status !== 'draft') {
      return json(request, { accepted: false, status: generation.operational_status });
    }

    const { data: budget, error: budgetError } = await admin
      .from('generation_budget_settings')
      .select('generation_enabled')
      .eq('owner_id', user.id)
      .single();
    if (budgetError) throw budgetError;
    if (!budget?.generation_enabled) throw new Error('Managed provider generation is disabled.');

    // Preparing private references happens before the submission marker. A failure here cannot create a provider charge.
    const { provider, request: normalizedRequest } = await runwayRequestContext(admin, generation);
    const estimate = provider.estimate(normalizedRequest);
    const { error: estimateError } = await admin
      .from('generation_records')
      .update({
        api_version: RUNWAY_API_VERSION,
        model_version: normalizedRequest.model,
        estimated_cost_micros: estimate.maximumCostMicros,
        provider_credit_units: estimate.providerCredits,
        estimated_output_bytes: estimate.estimatedOutputBytes,
        pricing_snapshot: estimate.pricingSnapshot,
      })
      .eq('id', generation.id)
      .eq('owner_id', user.id)
      .eq('operational_status', 'draft');
    if (estimateError) throw estimateError;

    const claimId = crypto.randomUUID();
    const { data: claimed, error: claimError } = await admin.rpc('claim_generation_submission', {
      target_generation_id: generation.id,
      requested_claim_id: claimId,
      target_owner_id: user.id,
    });
    if (claimError) throw claimError;
    if (!claimed) return json(request, { accepted: false, status: 'already_claimed' });

    const { data: marked, error: markerError } = await admin.rpc(
      'mark_generation_submission_started',
      {
        target_generation_id: generation.id,
        requested_claim_id: claimId,
        target_owner_id: user.id,
      }
    );
    if (markerError || !marked)
      throw markerError ?? new Error('Generation submission marker was not recorded.');

    const job = await provider.create(normalizedRequest);
    const { error: updateError } = await admin
      .from('generation_records')
      .update({
        operational_status: 'queued',
        provider_job_id: job.providerJobId,
        submission_claim_id: null,
        submission_claim_expires_at: null,
        next_poll_at: nextGenerationPoll(0),
      })
      .eq('id', generation.id)
      .eq('owner_id', user.id)
      .eq('operational_status', 'submitting')
      .eq('submission_claim_id', claimId);
    if (updateError) throw updateError;
    return json(request, { accepted: true, status: 'queued' });
  } catch (error) {
    return errorResponse(request, error);
  }
});
