# AI Image and Video Generation — Implementation State

## Status

PAUSED — AI-1 AND AI-2 COMPLETE; AI-3 REQUIRES A NEW OWNER APPROVAL

## Purpose

Give StudioFlow an owner-controlled, provider-neutral path from an immutable prompt and approved private references to a privately stored image or video, with bounded spending, complete provenance, recoverable asynchronous state, and no browser-held provider secrets.

## Approved V1 Scope

- Additive managed-generation records alongside the existing manual provenance log.
- Provider-neutral requests, capability declarations, cost estimates, job state, and normalized results.
- Deterministic account-free image/video simulation in the fictional demo.
- Persisted request/daily/monthly budget rules, cost/output reservations, one-active-job enforcement, immutable prepared-intent identity, and append-only lifecycle history.
- Mocked Runway image and image-to-video translation.
- Owner-authenticated generation start/cancel source and internal-only recovery/ingest source.
- Exact-host, no-redirect, declared-length, MIME-checked bounded generated-output streaming into private B2.
- Foreground refresh, closed-browser recovery, cancellation, `submission_unknown`, and exactly-once asset/link/cost completion.
- Backward-compatible import/export and encrypted backup coverage.

## Explicitly Out of Scope

- A Runway account, organization, prepaid balance, API key, or live provider request.
- Deploying or scheduling the generation Edge Functions.
- Enabling `generation_enabled`.
- Automatic or batch generation.
- Direct browser-to-provider requests or display of provider temporary URLs.
- OpenAI image/video adapters, other providers, automatic posting, analytics imports, the full editor, or production deployment.

## Files Involved

- `src/lib/generation-provider.ts`
- `src/lib/managed-generation.ts`
- `src/state/use-generation-manager.ts`
- `src/components/generation-history-panel.tsx`
- `src/types.ts`
- `src/state/workspace-persistence.ts`
- `src/lib/remote-repository.ts`
- `supabase/migrations/20260903010643_managed_generation_foundation.sql`
- `supabase/functions/_shared/generated-output.ts`
- `supabase/functions/_shared/generation-service.ts`
- `supabase/functions/_shared/runway.ts`
- `supabase/functions/generation-start/index.ts`
- `supabase/functions/generation-cancel/index.ts`
- `supabase/functions/generation-reconcile/index.ts`
- `supabase/functions/generation-ingest/index.ts`
- `supabase/functions/metadata-backup/index.ts`
- `supabase/tests/database/managed_generation.test.sql`

## Data / Persistence

`generation_records` remains backward compatible with manual `recorded` rows and now carries managed execution mode, media kind, operational status, immutable request identity, provider job/version fields, frozen settings/pricing, calculated/provider-reported costs, cost/output reservations, timestamps, attempts, failures, and submission claims.

`generation_input_assets` stores ordered private asset IDs and `reference_image`/`start_image` roles. `generation_events` is append-only lifecycle history. `generation_budget_settings` is singleton-owner scoped and cannot be enabled by the browser. `assets.source_generation_id` and `cost_entries.source_generation_id` enforce one generated asset and one cost per managed request. Provider credentials and signed/temporary URLs are never persisted.

Demo persistence normalizes older workspaces and creates disabled default budget settings. Workspace export/restore and encrypted metadata backup use version 2 collections while retaining version 1 readability.

## Integration Status

- Fictional demo: integrated and account-free; image/video simulation uses the fake provider and creates a labeled private-placeholder record at $0.00.
- Private browser workspace: managed collections load through the existing repository; active rows refresh every 15 seconds.
- Supabase schema: additive migration prepared and covered by isolated pgTAP.
- Backblaze B2: existing private storage path retained; generated-output ingest is source-only and not deployed.
- Runway: adapter and HTTP behavior mocked only; no account, key, request, origin, timeout, output, or charge has been live-verified.
- Netlify/production: unchanged and locked.

## Complete

- Provider-neutral contracts and deterministic fake provider.
- Image/video preparation validation, immutable prompt/reference provenance, and capability checks.
- Atomic spending/storage claim rules and one-active-job constraint.
- Explicit lifecycle transitions, interruption recovery, foreground refresh, cancellation, and owner-attention state.
- Account-free simulator UI with responsive/touch coverage and reload persistence.
- Runway-shaped request/status/cancel adapter under mocked HTTP.
- Provider-only signed-reference validation and exact-host bounded-output stream validation.
- Internal generation-ID-only ingest and no-caller-ID reconciler source.
- Exactly-once generated asset, canonical link, and generation-linked cost completion rules.
- Version 2 import/export/backup model and version 1 normalization.
- Permanent architecture, security, and decision documentation for the two narrow server exceptions.

## Partially Implemented

- The generation Edge Functions are implemented as source but intentionally undeployed and unscheduled.
- The Runway adapter is mock-verified but has no live credential/provider compatibility evidence.
- Encrypted backup supports the version 2 collections in source; a new live version 2 backup/restore rehearsal is deferred until the next approved external-services gate.

## Not Started

- AI-3 account/balance, API-key secret, first paid still image, private reference fetch proof, and manual portal cost reconciliation.
- AI-4 first image-to-video generation.
- AI-5 additional providers or workflow expansion.

## Broken / Needs Verification

- None in the account-free browser/domain path.
- Current provider output hostnames, real signed-reference fetching, live Edge runtime limits, Runway response compatibility, and provider cost behavior are deliberately unverified until AI-3.

## Locked Decisions

- The UI/domain model remains provider-neutral; provider translation is server-only.
- The real-generation switch remains false until a separately approved paid-test gate.
- The browser never receives provider credentials, provider-only signed references, or temporary output URLs.
- Ordinary uploads remain direct browser-to-B2 transfers; only one bounded generated output may stream through internal Edge ingest.
- Scheduled recovery uses its own server-only credential and accepts no caller identifiers.
- Ambiguous submissions/cancellation charges require owner review and never auto-retry.
- Costs, reservations, assets, and canonical links are idempotent and database-enforced.
- Production deployment remains a separate approval gate.

## Known Risks

- Runway model names, pricing, accepted ratios, input rules, output hosts, and retention can change before AI-3.
- The current Supabase free Edge runtime envelope may be too small for some provider outputs even below the ordinary 2 GB media allowance; live testing must remain deliberately small.
- Provider cancellation does not prove a refund.
- A provider may accept a request while the response is lost; the reserved `submission_unknown` state is required protection, not an error to auto-clear.

## Remaining Verification

- Live provider/account/API/Edge/B2 compatibility is reserved for AI-3 and requires separate approvals.
- Rehearse one encrypted version 2 metadata backup/restore after the managed schema is present and before production release.
- Verify one deliberately fictional private reference can be fetched by Runway without exposing its signed URL.

## Exact Next Implementation Task

Obtain explicit owner approval for AI-3 Gate 1: create the Runway Developer Portal account/organization and purchase the minimum prepaid balance. Do not begin API-key creation or any provider request.

## Remaining Implementation Order

1. AI-3 Gate 1 account and prepaid balance approval.
2. AI-3 Gate 2 API-key and Supabase server-secret approval.
3. First lowest-cost still image with separate exact-charge approval.
4. AI-4 shortest image-to-video request with a separate exact-charge approval.
