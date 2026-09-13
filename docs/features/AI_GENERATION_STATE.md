# AI Image and Video Generation — Implementation State

## Status

ACTIVE — AI-5 COMPLETE; PR #12 RELEASE-CANDIDATE REVIEW ACTIVE

## Purpose

Give StudioFlow an owner-controlled, provider-neutral path from an immutable prompt and approved private references to a privately stored image or video, with bounded spending, complete provenance, recoverable asynchronous state, and no browser-held provider secrets.

## Approved V1 Scope

- Additive managed-generation records alongside the existing manual provenance log.
- Provider-neutral requests, capability declarations, cost estimates, job state, and normalized results.
- Deterministic account-free image/video simulation in the fictional demo.
- Persisted request/daily/monthly budget rules, cost/output reservations, one-active-job enforcement, immutable prepared-intent identity, and append-only lifecycle history.
- Mocked Runway image and image-to-video translation.
- Owner-authenticated generation start/cancel source and internal-only recovery/ingest source.
- Exact-host, no-redirect, declared-length, MIME-checked generated-output ingest into private B2, using one bounded payload through 8 MiB or sequential 8 MiB multipart parts for larger results.
- Foreground refresh, closed-browser recovery, cancellation, `submission_unknown`, and exactly-once asset/link/cost completion.
- Backward-compatible import/export and encrypted backup coverage.

## Explicitly Out of Scope

- Purchasing additional Runway credits or making an unconfirmed provider request.
- Continuous idle reconciliation; the approved design is on-demand and pauses itself when no managed work remains.
- Leaving `generation_enabled` on after an explicitly approved request.
- Automatic or batch generation.
- Direct browser-to-provider requests or display of provider temporary URLs.
- OpenAI image/video adapters, other providers, automatic posting, analytics imports, the full editor, or production deployment.

## Files Involved

- `src/lib/generation-provider.ts`
- `src/lib/managed-generation.ts`
- `src/lib/runway-pricing.ts`
- `src/lib/runway-pricing.test.ts`
- `src/lib/remote-repository.ts`
- `src/lib/generated-output-transfer.ts`
- `src/lib/generated-output-transfer.test.ts`
- `src/state/use-generation-manager.ts`
- `src/state/studio-context.ts`
- `src/state/studio-store.tsx`
- `src/components/generation-history-panel.tsx`
- `src/components/generation-history-panel.test.tsx`
- `tests/e2e/workspace.spec.ts`
- `src/types.ts`
- `src/state/workspace-persistence.ts`
- `src/lib/remote-repository.ts`
- `supabase/migrations/20260903010643_managed_generation_foundation.sql`
- `supabase/migrations/20260910225759_generation_reconciliation_schedule.sql`
- `supabase/functions/_shared/generated-output.ts`
- `supabase/functions/_shared/generated-output-storage.ts`
- `supabase/functions/_shared/generation-service.ts`
- `supabase/functions/_shared/runway.ts`
- `supabase/functions/_shared/b2.ts`
- `supabase/functions/generation-start/index.ts`
- `supabase/functions/generation-cancel/index.ts`
- `supabase/functions/generation-reconcile/index.ts`
- `supabase/functions/generation-ingest/index.ts`
- `supabase/functions/metadata-backup/index.ts`
- `supabase/functions/metadata-restore/index.ts`
- `supabase/tests/database/managed_generation.test.sql`
- `docs/superpowers/specs/2026-09-10-memory-safe-video-transfer-design.md`
- `docs/superpowers/plans/2026-09-10-memory-safe-video-transfer-implementation.md`

## Data / Persistence

`generation_records` remains backward compatible with manual `recorded` rows and now carries managed execution mode, media kind, operational status, immutable request identity, provider job/version fields, frozen settings/pricing, calculated/provider-reported costs, cost/output reservations, timestamps, attempts, failures, and submission claims.

`generation_input_assets` stores ordered private asset IDs and `reference_image`/`start_image` roles. `generation_events` is append-only lifecycle history. `generation_budget_settings` is singleton-owner scoped and cannot be enabled by the browser. `assets.source_generation_id` and `cost_entries.source_generation_id` enforce one generated asset and one cost per managed request. Provider credentials and signed/temporary URLs are never persisted.

Demo persistence normalizes older workspaces and creates disabled default budget settings. Workspace export/restore and encrypted metadata backup use version 2 collections while retaining version 1 readability.

## Integration Status

- Fictional demo: integrated and account-free; image/video simulation uses the fake provider and creates a labeled private-placeholder record at $0.00.
- Private browser workspace: managed collections load through the existing repository; active rows refresh every 15 seconds; owner-approved image and five-second video preparation/start plus managed-review updates use the existing application command layer.
- Supabase schema: additive migration applied to the hosted project; generated types refreshed; all 22 public tables have RLS enabled; the singleton settings row is disabled.
- Backblaze B2: the existing private storage path is retained. One generated PNG and one generated five-second MP4 were copied from Runway into the private owner prefix and are available only through StudioFlow's short-lived authenticated preview path.
- Runway: one StudioFlow-scoped key, an exact output-host allowlist, and an independent internal-job credential remain only in Supabase Edge Function secrets. Gate 3 submitted exactly one `gen4_image_turbo` image, and AI-4 submitted exactly one `gen4_turbo` five-second video after action-time confirmation. The video used 25 promotional credits/$0.25; no retry or additional request was made.
- Scheduled recovery: `pg_cron`/`pg_net`, the once-per-minute inactive-while-idle job, service-only controls, the atomic claim wrapper, and the Edge/Vault credential pair are configured. The updated start/reconcile functions are active. An empty live invocation succeeded and paused the schedule; generation remained disabled and no provider request was created.
- Generated-video transfer: the hosted function copied the approved 497,698-byte MP4 through the bounded single-payload path, then created one private asset, one canonical generation link, and one cost entry. Because the result was smaller than 8 MiB, the deployed multipart branch remains intentionally unexercised.
- AI-4 read-only preflight: current Runway documentation still lists `gen4_turbo` for image-to-video at 5 credits per second. StudioFlow's locked first request remains one five-second, 9:16, 720p clip from one approved private start image, so the exact maximum is 25 credits/$0.25. Runway now accepts flexible Gen-4 Turbo durations from 2–10 seconds, but this checkpoint did not change the approved five-second design. The 9:16 output maps to `720:1280`; the start image must use a supported image type and an aspect ratio from 0.5 through 2.358. Successful task output URLs are temporary and expire within 24–48 hours, so StudioFlow must copy the result immediately into private B2 and never expose the provider URL. See [Runway pricing](https://docs.dev.runwayml.com/guides/pricing/), [available models](https://docs.dev.runwayml.com/guides/models/), [input rules](https://docs.dev.runwayml.com/assets/inputs/), [output rules](https://docs.dev.runwayml.com/assets/outputs/), and the [API changelog](https://docs.dev.runwayml.com/api-details/api_changelog/).
- AI-4 budget preflight: the hosted per-video request cap is $0.30, the daily cap is $2.00, the monthly cap is $10.00, the generated-output limit is 250 MB, and the existing video estimate/reservation is 200 MB. At the check, monthly settled generation cost was $0.02 with no active cost or output reservation. The proposed $0.25 request fits those limits. Generation remained disabled; no active or uncertain job existed; and the scheduler remained inactive. The previously observed 498-credit promotional balance was not re-read from Runway during this credential-free preflight and must be checked again immediately before any request.
- Repository: final head `2c49ebbefe0a0cc8b5e1a94f2810f0d0a634f26c` passed StudioFlow CI and PR #6 was merged into `main` as `2d6b5df70593bef82065137553de248f7f7b121e`.
- Netlify/production: Auto Publishing remains locked; the merge did not publish production.

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
- Hosted migration history, schema lint, generated database types, RLS/table inventory, generation-switch state, and security/performance advisors verified after application.
- GitHub application, secret, browser, and database-security checks pass on the AI-1/AI-2 branch; final-head StudioFlow CI run `33787517971` concluded successfully and PR #6 is merged.
- AI-3 Gate 2 credential setup: the exact Supabase secret name is present once and `generation_enabled` remains false.
- AI-3 first-image preflight: one immutable prompt and optional active project-image reference feed the existing fake-provider path. The image form now offers reviewed one-output spending choices: Muse Image at 1 credit/$0.01 or Gen-4 Image Turbo at 2 credits/$0.02. The browser display and server adapter derive reservations from the selected allowlisted model, unknown models fail closed, and confirmation resets when the choice changes. A visibly selected first private reference now counts as selected instead of producing a false missing-reference error. This adjustment is local only; it has not been deployed and made no provider request.
- AI-3 deployment/configuration gate: configured the strict output-host allowlist from Runway's current official output example, generated a distinct internal-job secret, and deployed `generation-start`, `generation-cancel`, `generation-ingest`, and `generation-reconcile` with their reviewed custom authentication. All three required secret names are present exactly once, all four functions are active, unauthenticated POST requests return HTTP 401, and the live generation switch remains off. `generation-ingest` was redeployed during Gate 3 with the verified Deno/B2 compatibility repair.
- AI-3 Gate 3 live image: rechecked current official pricing/input/output rules, used one deliberately fictional private reference and immutable prompt, displayed and approved the exact 2-credit/$0.02 maximum, submitted exactly one request, and immediately returned `generation_enabled` to false after Runway accepted it.
- Live recovery and private completion: temporary reconciliation recovered the asynchronous result without a scheduler or second provider request. Two Deno/B2 compatibility defects were isolated and fixed: optional AWS checksum calculation is no longer forced for the flowing body, and the strictly size-bounded still image is materialized as bytes before B2 upload. The retry reused the completed provider result and spent no additional credits.
- Live provenance and review: one completed managed generation owns one private generated asset, one canonical asset link, one two-cent cost entry, one private reference input, and selected generation/asset review decisions. Cost and portal credits were manually reconciled; all reservations are released, zero managed jobs are active, and the generation switch is off.
- Managed-review cloud save: completed managed records now update only the allowed review fields instead of using an insert-capable upsert that correctly trips the database's inert-draft guard. Non-`Error` cloud responses also retain their actual message in the rollback notice.
- Playwright shutdown repair: `npm run test:e2e` now starts and closes Vite through the project-owned Node runner instead of relying on a Windows process-tree termination command that this host denies. The focused four-viewport generation workflow returned exit code 0 and released port 4174 without manual termination.
- Gate 3 verification: repository formatting, TypeScript, ESLint, all 105 unit/component tests, all six production-lock tests, and the production build pass. The complete Playwright suite passed all 40 scenarios in 3.3 minutes, exited with code 0, and left no listener on port 4174. The build retains its existing informational large-chunk warning.
- Scheduled-reconciliation foundation: added an additive hosted migration for `pg_cron`, `pg_net`, an inactive on-demand job, service-only activation, and atomic claim-plus-activation. Authenticated clients cannot control the job, `generation_enabled=false`, and zero managed jobs remain active. Hosted TypeScript definitions were regenerated. The local application verification still passes 105 tests and the production build.
- Scheduled-reconciliation deployment: rotated the independent internal-job secret without displaying or saving it locally, synchronized its matching value and the project URL through Supabase Vault, deployed only the updated `generation-start` and `generation-reconcile` functions, and reconfirmed HTTP 401 denial for unauthenticated callers.
- Empty scheduled rehearsal: manually activated the service-only cron control with zero active or uncertain jobs. Cron run 1 succeeded, the reconciler returned the schedule to inactive, `generation_enabled` stayed false, and the managed-generation record count remained unchanged. Runway was not contacted.
- Memory-safe video-transfer source: replaced complete-result materialization with a provider-neutral bounded orchestrator and Edge-only B2 adapter. Results through 8 MiB use one payload; larger results use ordered sequential 8 MiB parts. The transfer verifies exact bytes and generation/type/length identity, reuses exact completed objects, refuses conflicts, and attempts cleanup after multipart failure.
- Memory-safe transfer verification: focused transfer/security coverage passes 18 tests. Full local verification passes TypeScript, ESLint, all 118 unit/component tests across 27 files, all six production-lock tests, and the production build. Playwright and pgTAP were not required because no UI or schema changed. No deployment, hosted storage write, provider request, or credit use occurred.
- Hosted ingest deployment verification: deployed only `generation-ingest` as active hosted version 10, inspected the deployed source bundle for the transfer orchestrator and Edge B2 adapter, confirmed the entrypoint has no complete-output `arrayBuffer()` call, and received HTTP 401 from an unauthenticated POST. Before and after the check, `generation_enabled=false`, zero active or uncertain managed jobs existed, and the reconciliation schedule remained inactive. No Runway request, B2 object write, credit use, Netlify deployment, or production release occurred.
- AI-4 five-second read-only preflight: rechecked current official model, price, input, output, duration, and retention rules; froze the proposed one-request maximum at 25 credits/$0.25; and confirmed that it fits the hosted request, daily, monthly, and generated-output limits. No source code, provider state, secret, B2 object, Netlify deployment, or production release changed.
- AI-4 local video preparation and confirmation: generalized the browser command for image or video, added a separate five-second private-video action, locked it to one `gen4_turbo` output at 9:16/`720:1280` from exactly one private start image, displayed the immutable 25-credit/$0.25 maximum and 200 MB reservation, and kept submission disabled until exact confirmation. Pricing, component, and fake-provider browser coverage passes without contacting an external service.
- AI-4 action-time safety check: current Runway pricing remains 5 credits per second for `gen4_turbo`, the portal shows 498 promotional credits with auto-billing off, and the five-second maximum remains 25 credits/$0.25. Hosted generation is disabled with zero active or uncertain jobs, zero cost/output reservations, an inactive scheduler, $0.02 settled this month, and approximately 1.1 MB of recorded assets. The $0.30 request, $2 daily, $10 monthly, and 250 MB output limits fit the proposed request. No provider request or external mutation occurred.
- AI-4 live video: one confirmed `gen4_turbo` request completed without retry. StudioFlow privately ingested a 497,698-byte MP4, verified authenticated playback at 720×1280 for 5.04 seconds, saved those media details, recorded five lifecycle events, settled one $0.25 cost entry, created one canonical generation link, released all reservations, disabled generation, and returned the scheduler to inactive.
- AI-5 production-memory integration: every shot now offers a direct generation handoff. StudioFlow compiles the series, episode, scene, shot, assigned-character, assigned/named-location, named-prop, and project-style fragments into a new immutable prompt version before opening the existing confirmed generation gate. The shot workspace exposes location and character assignment, and each managed attempt can expand to show its full immutable prompt, private inputs, request shape, settled cost, complete lifecycle, and result.
- AI-5 cost visibility: Creator HQ continues to total canonical cost entries and now identifies the generated-result subtotal and count. The live database contains exactly one $0.25 video cost row for the completed video generation; the episode total changed from $0.02 to $0.27 as expected.
- AI-5 encrypted recovery: deployed schema-version-2 backup writing and an owner-authenticated restore function that accepts no caller-supplied records, decrypts only the latest completed owner backup from private B2, checks existing IDs before inserting only missing rows, and forces generation off. The live restore rehearsal completed without deleting or overwriting records; database counts, the completed video/cost/history, disabled generation, zero active jobs, and the inactive scheduler remained intact.
- Release review and publication: PR #12 packages the current AI workflow. Its exact Netlify preview opened the owner workspace, displayed both generation attempts and the $0.27 total, and loaded the private 5.04-second 720×1280 video without a media error. Exact deployment `6aa46fb62a2a6f0008071ccd` for commit `d5a56856ff8e50caf162fefbb3ae0efb0eb22f5f` is now published and locked at the production URL.

## Partially Implemented

- The sequential multipart branch is deployed and mock-verified but was not used by the first live video because that output was only 497,698 bytes.

## Not Started

- Additional AI providers and batch generation remain future work, not production-core release requirements.

## Broken / Needs Verification

- None in the verified still-image or first-video path.
- The configured provider output hostname remains deliberately fail-closed; a future hostname change will stop ingest until separately reviewed. The new B2 multipart adapter is deployed but has not yet executed against hosted B2.
- A real output larger than 8 MiB is still needed to exercise hosted multipart transfer; the bounded single-payload path completed successfully.

## Locked Decisions

- The UI/domain model remains provider-neutral; provider translation is server-only.
- The real-generation switch remains false between requests and may be enabled only for a separately approved, exactly bounded provider action.
- The browser never receives provider credentials, provider-only signed references, or temporary output URLs.
- Ordinary uploads remain direct browser-to-B2 transfers; only one bounded generated output may stream through internal Edge ingest.
- The first video remains five seconds with the existing 200 MB reservation. Generated output uses sequential 8 MiB parts, no parallel uploads, a 100-second deadline, exact-match reuse, and conflict refusal.
- Scheduled recovery uses its own server-only credential and accepts no caller identifiers.
- Ambiguous submissions/cancellation charges require owner review and never auto-retry.
- Costs, reservations, assets, and canonical links are idempotent and database-enforced.
- Every later production deployment remains a separate approval gate; the currently approved deploy is locked.

## Known Risks

- Runway model names, pricing, accepted ratios, input rules, output hosts, and retention can change; recheck them immediately before every separately approved live request.
- Runway now documents flexible 2–10 second Gen-4 Turbo durations. StudioFlow deliberately retains the approved five-second first-video envelope; changing to a shorter duration is a separate product/cost decision.
- The current Supabase free Edge runtime envelope may be too small for some provider outputs even below the ordinary 2 GB media allowance; live testing must remain deliberately small.
- The deployed multipart adapter still requires one future output larger than 8 MiB; do not purchase or generate a larger result solely to force that branch.
- Provider cancellation does not prove a refund.
- A provider may accept a request while the response is lost; the reserved `submission_unknown` state is required protection, not an error to auto-clear.

## Remaining Verification

- Signed-out responsive and health review passed for the exact candidate at desktop, iPad landscape, iPad portrait, and phone sizes. Candidate owner authentication, all five protected workspace routes, and the retained private 5.04-second 720 × 1280 B2 video also passed before publication. Exact deployment `6aa46fb62a2a6f0008071ccd` is now published and locked. The production signed-out shell and `/health` endpoint pass without browser warnings or errors, and the owner reports that production owner login and non-owner denial pass. Private-media expiry verification remains. Generation remains disabled. Multipart execution remains a later opportunistic check when an already-approved output naturally exceeds 8 MiB.

## Exact Next Implementation Task

Confirm the raw B2 object is private and a copied production media URL expires after its 10-minute lifetime. Do not publish a later commit or submit another provider request without separate approval.

## Remaining Implementation Order

1. Confirm the raw B2 object URL fails without its signature.
2. Confirm a copied signed production media URL fails after 10 minutes and StudioFlow can request a fresh one for the owner.
