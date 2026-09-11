# AI Image and Video Generation — Implementation Plan

## Status

AI-1 THROUGH AI-5 COMPLETE — RELEASE-CANDIDATE REVIEW NEXT

## Purpose

Add owner-controlled AI image and video generation without tying StudioFlow's interface, history, or stored data to one vendor. Every paid request must be deliberate, price-bounded, recoverable, owner-only inside StudioFlow, and traceable back to the exact prompt and production references that created it.

This plan extends the existing prompt versions, generation records, private B2 media, cost tracking, and production-memory systems. It does not replace them or create a second persistence path.

“Owner-only” describes StudioFlow and B2 access. The selected prompt, reference assets, and requested settings are transmitted to the configured AI provider for processing. Current provider privacy, retention, and data-use terms must be reviewed immediately before real creative material is submitted.

## Recommended First Provider

Start with **Runway Dev** for both still images and image-to-video.

Reasons:

- One provider account, organization, API key, and prepaid balance covers both media types.
- The same asynchronous task model supports image and video work.
- Gen-4 Image accepts reference images, which fits recurring characters and locations.
- Gen-4 Turbo can animate an already-approved still, giving StudioFlow a controllable image-first workflow.
- Current pricing is clear enough to calculate and display the maximum charge before submission.

Initial model defaults:

| Use                     | Initial model      | Current API price on 2026-09-10            |
| ----------------------- | ------------------ | ------------------------------------------ |
| Draft still             | `gen4_image_turbo` | 2 credits, approximately $0.02 per image   |
| Final still             | `gen4_image`       | 5 credits at 720p or 8 credits at 1080p    |
| Draft motion            | `gen4_turbo`       | 5 credits, approximately $0.05 per second  |
| Optional premium motion | `gen4.5`           | 12 credits, approximately $0.12 per second |

Runway prices API credits at $0.01 each. Gate 3 used 2 of the original 500 promotional credits, leaving 498; the owner made no purchase. Prices and model availability must be rechecked immediately before every additional live request. See [Runway pricing](https://docs.dev.runwayml.com/guides/pricing/), [Runway models](https://docs.dev.runwayml.com/guides/models/), and [Runway API setup](https://docs.dev.runwayml.com/guides/setup/).

Do not build the first video adapter around OpenAI Sora. Official OpenAI documentation marks the current video API deprecated and scheduled to shut down on September 24, 2026. OpenAI GPT Image 2 may be added later as an optional image adapter; it is not needed for the first implementation. See [OpenAI video API](https://developers.openai.com/api/reference/typescript/resources/videos/methods/create) and [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2).

## Account Needed

No new AI-provider account is needed for AI-1 or for the mocked connector work in AI-2; both continue using StudioFlow's already configured GitHub, Supabase, and B2 infrastructure. AI-3's three separate action-time approval gates are complete; they did not authorize later scheduling, video, or provider requests:

1. **Complete:** Runway Developer API access and 500 promotional credits were confirmed without a purchase.
2. **Complete:** one StudioFlow-scoped key was created and stored only as the Supabase Edge Function secret `RUNWAYML_API_SECRET`.
3. **Complete:** the exact first two-credit/$0.02 still-image request was approved after StudioFlow displayed its maximum charge.

The key is shown only once. Enter it directly into the Supabase Edge Function secret manager as `RUNWAYML_API_SECRET`. It must never appear in the browser bundle, Netlify variables, PostgreSQL rows, exports, logs, screenshots, chat, or Git.

The Runway Codex plugin is not required for StudioFlow's server integration.

## Approved Initial Scope

- Provider-neutral server adapter and normalized request types.
- Fake provider for account-free tests.
- One-at-a-time still-image generation.
- Approved-image-to-video generation with short initial clips.
- Exact prompt version and reference-asset provenance.
- Provider job lifecycle, foreground refresh, closed-browser recovery, cancellation, and failure history.
- Bounded server-side ingest of successful generated outputs into private B2 under the explicit exception below. Source uses one bounded payload through 8 MiB or sequential 8 MiB B2 multipart parts for larger results. The hosted bundle/authentication boundary is verified; actual B2 multipart execution remains part of the separately approved first-video action when applicable.
- Selected, rejected, and unreviewed decisions using the existing media/generation systems.
- Maximum-cost confirmation before every paid request.
- Per-request, daily, and monthly hard spending limits.
- Desktop, iPad, and phone support.

## Explicitly Out of Scope

- Automatic or unattended batch generation.
- Automatic model routing in V1.
- Provider keys in the browser.
- Direct display of temporary provider output URLs.
- Text-to-video as the default recurring-character workflow.
- Voice, music, lip-sync, avatar, or full editor integration.
- Automatic posting or social-performance imports.
- Production deployment as part of an AI implementation unit.

## Provider-Neutral Contract

The interface and database work with StudioFlow concepts. Only a server-side adapter translates them into provider-specific fields.

```ts
interface GenerationProvider {
  capabilities(): ProviderCapabilities;
  estimate(request: GenerationRequest): CostEstimate;
  create(request: GenerationRequest): Promise<ProviderJob>;
  retrieve(providerJobId: string): Promise<ProviderJobState>;
  cancel(providerJobId: string): Promise<void>;
  normalizeResult(job: ProviderJobState): NormalizedGenerationResult;
}
```

The normalized request contains:

- image or video media kind
- immutable prompt-version ID
- reference asset IDs and roles
- aspect ratio
- quality tier
- duration where applicable
- output count
- seed only when supported

Each adapter publishes capabilities. StudioFlow must not pretend every provider supports the same reference types, durations, ratios, editing modes, or cancellation behavior.

## Additive Data Changes

Preserve every current manual generation record and export. Extend `generation_records` additively with:

- execution mode: `manual` or `managed`
- nullable media kind
- operational status
- nullable client request ID with a partial unique index on `(owner_id, client_request_id)` when present
- provider job ID, API version, and nullable model version
- sanitized normalized request settings
- estimated and calculated cost in millionths of a dollar
- nonnegative reserved maximum cost in millionths of a dollar
- nullable provider-reported cost when the provider actually supplies it
- frozen pricing-rule snapshot used for the calculation
- provider credit units
- submitted, started, completed, and next-poll timestamps
- poll and ingest attempt counts
- nonnegative reserved output bytes
- safe failure code and message

Operational statuses:

`recorded`, `draft`, `submitting`, `queued`, `running`, `saving`, `completed`, `failed`, `cancel_requested`, `cancelled`, `submission_unknown`

The additive migration sets every existing row to `execution_mode=manual` and `operational_status=recorded`, leaving `media_kind` and `client_request_id` null. Manual records may remain outputless because they describe work performed outside StudioFlow. New managed records require a media kind and client request ID. Only managed `completed` records require a verified private-B2 result link. Import normalization applies the same defaults when older exports omit these fields; it preserves unknown stored fields under the existing compatibility rules.

Keep existing `cost_cents` as a backward-compatible rounded projection.

Add three owner-scoped structures:

- `generation_input_assets` for ordered input references and their roles
- `generation_events` for append-only lifecycle history
- `generation_budget_settings` for hard request, daily, and monthly limits

Add a nullable `source_generation_id` to `cost_entries` with a foreign key to `generation_records(id)` and a unique index where it is present. Database validation must require the cost entry and source generation to share owner, project, and episode context; deleting a source generation must not orphan or silently erase its cost provenance. A managed provider submission creates at most one linked cost entry when a charge is known or manually confirmed, whether it completed, failed, or was cancelled. This preserves Creator HQ's existing cost source, records chargeable failures, and prevents double counting. Estimated cost, persisted reserved maximum, calculated charge, and nullable provider-reported charge remain separate values.

The persisted `reserved_max_cost_micros` value participates in atomic request, daily, and monthly budget checks alongside settled generation-linked costs. It survives browser closure and scheduled reconciliation. Completion settles the known charge and releases the difference; confirmed no-charge, failure, or cancellation releases it according to the recovery rules below; `submission_unknown` keeps it reserved until the owner records an outcome.

`generation_enabled` is server-authoritative, defaults to `false`, and fails closed when its setting is absent or unreadable. The browser may display the setting but cannot override it. The same atomic database operation that claims a paid start must enforce this switch, the one-active-managed-generation limit, both reservations, and the allowed status transition.

The existing explicit `asset_links` relationship remains the canonical output-media link. Existing result-ID arrays remain synchronized for backward compatibility. New tables explicitly grant only required authenticated access, use owner RLS, and grant nothing to anonymous clients.

AI-1 must update export validation, import normalization, encrypted backup, and restore ordering for every new field and table before any real records exist.

## Generated-Output Ingest Exception

The current architecture correctly requires ordinary user uploads to transfer directly between the browser and B2; Supabase and Netlify do not proxy those bytes. Runway returns temporary result URLs that must be copied into owned storage and must not be exposed directly to the product, so AI generation needs one narrow architectural exception.

This exception was approved before AI-2 and is recorded in `CODEX.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/SECURITY.md`:

- It applies only to generated provider outputs, never ordinary uploads.
- A separate short-lived Supabase Edge invocation transfers the response into B2. Results through 8 MiB use one bounded payload; larger results use sequential 8 MiB multipart parts with no complete-video materialization or parallel uploads.
- It validates HTTPS, a direct HTTP 200 response, MIME type, `Content-Type`, `Content-Length`, elapsed time, and a conservative generated-output size limit before and during transfer.
- It fails safely when an output cannot fit inside the bounded ingest envelope; it never promises support for the ordinary 2 GB upload maximum.
- It never routes media bytes through Netlify.
- Provider output URLs are never returned to the browser, saved in PostgreSQL, exported, or logged.
- The ingest endpoint accepts only an internally authenticated generation ID, not a caller-supplied URL. It loads the stored provider job ID, retrieves and normalizes the current result through the adapter, and keeps the temporary URL in memory only.
- Redirects are disabled. The adapter permits only its documented exact HTTPS output hosts, rejects embedded credentials, IP literals, localhost, and private or link-local targets, and enforces response-header plus bounded byte limits before B2 completion.
- The transfer has a 100-second deadline, requires an exact byte count, attempts multipart abort after ordinary failures, reuses only an exact existing object, refuses conflicts, and verifies generation metadata, type, and length before database completion.

The hosted Supabase Edge limits were rechecked before the 2026-09-10 source implementation: 256 MB of memory, a 150-second free-plan wall-clock window, and a two-second CPU limit. Recheck them again before hosted verification and keep the first video within its existing 200 MB reservation. See [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits).

## Scheduled Recovery Authorization

Browser-started generation functions continue to require the existing owner bearer token. The scheduled reconciler cannot borrow a browser session, so it uses a separate internal-only authentication path:

- A scheduler-held service secret, stored in Supabase Vault or equivalent server-only configuration, authenticates the scheduled invocation.
- Browser requests and ordinary authenticated-user tokens are rejected at this endpoint.
- The reconciler accepts no caller-supplied owner ID, generation ID, provider job ID, or storage key. It selects due managed records itself, scoped to the singleton configured owner, then applies the same transition and budget rules as the interactive path.
- The internal secret is never returned to the browser, exported, logged, or stored in a repository file.
- `CODEX.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/SECURITY.md` must record this narrow exception before the scheduled function is implemented.

## Private Reference Transport

The browser sends only private StudioFlow asset IDs. After verifying the owner and asset relationship, the server adapter creates provider-only, short-lived signed B2 GET URLs for the selected reference images. These URLs:

- expire as soon as practical for the provider fetch window
- are passed only in the server-to-provider request
- are never returned to the browser, stored in PostgreSQL, exported, or logged
- must resolve directly over HTTPS with the provider-required 200 response, MIME type, length, and headers

AI-2 tests this contract with mocked HTTP. AI-3 must use one deliberately chosen fictional reference and verify that Runway can fetch it before private-reference compatibility is called live-verified.

## Safe Job Flow

1. The browser saves or selects an immutable prompt version and asks the owner-authenticated server to prepare a managed `draft`; no provider call or reservation occurs yet. The server creates the draft and its stable owner-scoped client request ID, which every retry for that visible intent reuses.
2. After displaying the exact maximum charge and receiving approval, the browser sends only that prepared generation ID to `generation-start`; it never sends credentials or arbitrary storage URLs.
3. The Edge Function verifies the authenticated sole owner and loads the draft plus every referenced record itself.
4. One PostgreSQL claim operation checks the server-authoritative `generation_enabled` flag, the allowed `draft` transition, a database-enforced one-active-managed-generation limit, B2-accounted bytes plus all live `reserved_output_bytes`, and request/daily/monthly settled costs plus active reservations. It then atomically transitions the draft to `submitting` and persists both reservations plus a short-lived submission claim. Nothing is paid unless that transaction commits.
5. Only the invocation receiving the successful submission claim may call the provider. Concurrent or repeated invocations return the existing generation without a provider call. Immediately before the call, the claimant records that provider submission is beginning; a crash before that marker safely releases the stale claim, while a crash after it becomes `submission_unknown` rather than triggering an automatic retry.
6. The successful claimant makes one provider-submission attempt and saves the returned job ID. It never automatically repeats an ambiguous creation request.
7. The browser reads status from Supabase; it never calls Runway directly.
8. Visible work refreshes every 10–15 seconds while eligible. A roughly one-minute internal-service-authenticated recovery function, implemented before the first paid test, selects and reconciles due unfinished work when the browser is closed.
9. A successful provider result enters `saving`; an internal-only bounded ingest invocation accepts the generation ID, retrieves the result through the provider adapter, and validates its allowed origin without redirects. It uses one bounded payload through 8 MiB or sequential 8 MiB B2 multipart parts above that threshold, with exact-length enforcement, a 100-second deadline, and best-effort cleanup.
10. StudioFlow verifies the B2 object, atomically replaces reserved output bytes with the asset's actual counted bytes, creates and links the asset, calculates cost from the frozen submission-time pricing rule, writes one generation-linked cost entry, settles `reserved_max_cost_micros`, and only then marks the managed generation `completed`. If actual bytes exceed the reservation, saving must first claim the additional headroom or fail safely without marking completion.

Runway tasks are asynchronous and the provider recommends polling no faster than every five seconds, with jitter and exponential backoff. See [Runway task polling](https://docs.dev.runwayml.com/api-details/sdks/).

Runway output URLs currently expire within 24–48 hours and should not be exposed directly in a product. StudioFlow must copy them into private B2 immediately and must never store the temporary URL. See [Runway output handling](https://docs.dev.runwayml.com/assets/outputs/).

Runway reference URLs must be HTTPS, return a direct 200 without redirects, and expose correct content headers. V1 limits URL-fed reference images to 16 MB even when StudioFlow's ordinary media allowance is larger. See [Runway input requirements](https://docs.dev.runwayml.com/assets/inputs/).

## Failure and Recovery Rules

- Never retry a paid creation request merely because the response was lost.
- If submission may have reached the provider but no job ID returned, use `submission_unknown`, hold the maximum cost and output-byte reservations, prohibit automatic resubmission, and require owner attention. Because there is no documented provider correlation key for a lost create response, automatic reconciliation must not pretend it can find that job.
- Safe status reads may retry with exponential backoff.
- Safety, invalid-input, and hard-budget failures do not auto-retry.
- For `submission_unknown`, the owner reviews the provider portal and records exactly one outcome: no charge, a confirmed charge, or still unknown. A no-charge outcome releases both reservations. A confirmed charge creates or reconciles the one linked cost entry, releases unused cost reservation, and releases output-byte headroom unless an output is recoverable. A still-unknown outcome remains visibly blocked with both reservations held; abandoning it requires an explicit owner decision recorded as an event.
- Runway documents that input-safety failures are not refunded, so do not auto-retry them. When a charge is known or manually confirmed, write or reconcile the linked cost entry even though no output exists, release any unused cost reservation, and release output-byte headroom. Do not assume cancellation produces a refund. See [Runway task failures](https://docs.dev.runwayml.com/errors/task-failures/).
- A B2 ingest failure leaves the record in `saving`; recovery retries storage without purchasing another generation.
- Terminal failure or confirmed cancellation releases output-byte headroom. Successful ingest atomically replaces the reservation with actual counted asset bytes. A managed completion always requires a verified private B2 asset link; a legacy/manual `recorded` row does not.
- Refreshing or closing the browser must not lose provider job state.
- Double-clicking Generate must resolve to the same stored generation, not two paid jobs.
- The unique `(owner_id, client_request_id)` record, atomic submission claim, and partial unique database rule allowing only one active managed generation are the authoritative duplicate-payment controls; browser button disabling is only usability.
- StudioFlow prevents duplicate local submissions, but it does not claim absolute exactly-once provider execution after an ambiguous network failure.

## Initial Spending Guardrails

- Provider auto-recharge off.
- Global `generation_enabled` switch set to `false` until the separately approved AI-3 live test.
- One running generation and one output per request.
- $0.10 maximum for an image request.
- $0.30 maximum for the initial video request.
- $2.00 daily hard limit.
- $10.00 monthly hard limit.
- Exact maximum-cost confirmation immediately before submission.
- No background batches and no automatic paid retries.

These are StudioFlow limits, separate from the provider's prepaid balance. The owner must approve any increase.

## Implementation Units

### AI-1 — Neutral foundation, no account and no spending

**Status: complete.** The additive managed-generation schema, normalized provider contract, deterministic fake provider, reservations, atomic claims, lifecycle/recovery rules, export/import/backup compatibility, account-free interface, and regression coverage are implemented. Real provider execution remains disabled.

- Add additive migrations, owner RLS, compatibility defaults, and generated types.
- Add normalized requests, capability declarations, frozen price estimates, persisted budget/storage reservations, prepared-intent identity, atomic submission claims, a one-active-job constraint, lifecycle transition rules, and generation-linked cost entries.
- Implement a deterministic fake provider.
- Add a global `generation_enabled` switch, initially `false`.
- Implement the scheduler/reconciler contract and simulated closed-browser recovery.
- Update export, import, encrypted backup, and restore compatibility for all new records.
- Run unit/component/browser checks locally, run isolated migration and pgTAP tests in GitHub Actions, then apply the reviewed additive migration to hosted Supabase, regenerate types, and rerun advisors. Docker remains unnecessary on this desktop.
- Test all provider orchestration flows without a Runway account or Runway/provider API call. Applying the reviewed migration, checking hosted advisors, and rehearsing the existing encrypted B2 backup still use StudioFlow's already approved infrastructure.

Stop after the fake provider proves the simulated orchestration lifecycle, including interruption recovery and backup/restore compatibility. Do not create an API key or paid request.

### AI-2 — Runway connector and recovery, no paid request

**Status: complete.** The bounded generated-output and internal-service authentication exceptions are recorded. The Runway-shaped adapter, signed-reference validation, generation-ID-only bounded ingest, internal reconciliation, foreground refresh, cancellation, `submission_unknown`, and duplicate-prevention paths are implemented and tested with mocks only. AI-2 itself ended with source-only functions and used no Runway credential or request; their later deployment is recorded under the separately approved AI-3 gate.

- Obtain approval for and record the bounded generated-output ingest and scheduled-service-authentication exceptions in `CODEX.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/SECURITY.md`.
- Implement the Runway adapter behind mocked HTTP responses.
- Implement private signed-reference transport and validation, generation-ID-only bounded streaming ingest with provider-origin and no-redirect enforcement, internal-only scheduled reconciliation, foreground refresh, cancellation, status retry rules, exact cost/storage-reservation release, and manual-attention `submission_unknown` handling.
- Prove that double submission, duplicate reconciliation, ingest failure, and browser closure cannot duplicate costs or assets.
- Keep `generation_enabled=false`; no provider request is submitted.

Stop after the mocked Runway-shaped integration passes without an API key or paid request. Real provider headers, temporary-URL streaming behavior, timeouts, and output compatibility remain unverified until the separately approved AI-3 live test.

### AI-3 — First owner-only image generation

- Review current provider pricing, privacy, retention, and billing controls.
- Gate 1: **complete** — Runway Developer API access and 500 promotional credits were confirmed without a purchase.
- Gate 2: **complete** — one StudioFlow-scoped API key was created and stored only as the Supabase Edge Function secret `RUNWAYML_API_SECRET`.
- **Complete:** add one-image prompt/reference selection and exact price confirmation through the $0.00 mocked path. The confirmation uses the same shared 2-credit/$0.02 Gen-4 Image Turbo price definition as the server adapter and resets whenever the selected input changes.
- **Complete:** under separate deployment/configuration approval, add the exact provider-output-host allowlist and independent internal-job credential, deploy all four custom-authenticated generation functions, verify HTTP 401 denial without credentials, and reconfirm `generation_enabled=false` without contacting Runway.
- Gate 3: **complete** — current price/input/output documentation was rechecked, the owner approved the displayed two-credit/$0.02 maximum and temporary enablement, and exactly one Gen-4 Image Turbo request was submitted.
- **Complete:** one deliberately fictional private reference was fetched through the server-only signed path; neither that URL nor the temporary provider result URL entered the browser, database, documentation, or repository.
- **Complete:** the result was copied into private B2, previewed through StudioFlow, linked to the completed generation, recorded with one two-cent cost entry, and marked selected at both asset and generation levels.
- **Complete:** the Runway portal moved from 500 to 498 promotional credits, matching the frozen calculation. `generation_enabled` was switched off immediately after acceptance; no scheduler or second provider request ran.
- **Complete:** live ingest retries exposed two Deno/AWS compatibility defects. The B2 client now avoids optional flowing-stream checksums, and the already size-bounded still is converted to bytes before upload. Retries reused the completed provider result and did not purchase another image.

Stop after one result is owner-only in StudioFlow and B2, linked, reviewed, and its calculated cost is recorded and manually reconciled. The provider necessarily received the selected prompt and references for processing.

### Scheduled reconciliation gate — Complete

- **Complete:** apply `pg_cron`/`pg_net`, the inactive once-per-minute job, the service-only lifecycle control, and the atomic claim-plus-activation wrapper.
- **Complete:** regenerate hosted TypeScript types and verify that authenticated clients cannot control the schedule while `generation_enabled=false` and zero managed jobs are active.
- **Complete:** under separate approval, rotate and synchronize the internal credential between the Edge Function environment and Supabase Vault, deploy the updated start/reconcile functions, reconfirm unauthenticated HTTP 401 denial, and verify one empty scheduled invocation pauses itself without contacting Runway.

### Memory-safe generated-video transfer gate — Source and hosted bundle/auth complete

- **Complete:** approved the five-second-only design with the existing 200 MB reservation, sequential 8 MiB parts, no parallelism, exact-object reuse, conflict refusal, and no persisted provider URL or multipart identifier.
- **Complete:** added the provider-neutral transfer orchestrator, Edge-only B2 adapter, provider-fetch cancellation, and ingest integration without changing the database or browser.
- **Complete:** focused transfer/security coverage passes 18 tests; full local verification passes TypeScript, ESLint, all 118 unit/component tests, six production-lock tests, and the production build.
- **Complete for bundle/authentication:** deployed only the updated ingest bundle as active hosted version 10, verified the bounded transfer sources are bundled, confirmed complete-output `arrayBuffer()` materialization is absent, and reconfirmed unauthenticated HTTP 401 denial with generation disabled, zero active or uncertain jobs, and an inactive scheduler. No hosted storage write, provider request, credit use, Netlify deployment, or production release occurred. Actual B2 multipart execution remains pending.

### AI-4 — First owner-only image-to-video generation

- **Complete locally:** require exactly one selected private starting still for the initial workflow.
- **Complete locally:** add a separate video preparation action locked to five seconds and 9:16/`720:1280`, with a displayed 25-credit/$0.25 maximum and a required confirmation that resets when an input changes.
- Start with the already approved five-second Gen-4 Turbo clip. Current Runway documentation supports flexible 2–10 second duration, but changing the first-video envelope is a separate decision.
- Transfer the completed video into private B2 and capture duration/dimensions.
- Perform one separately approved five-second live video test capped at 25 credits/$0.25.

The read-only AI-4 preflight completed on 2026-09-10. Current official pricing remains 5 credits per second, so one five-second request has an exact maximum of 25 credits/$0.25. Use one approved private start image, one output, `gen4_turbo`, and 9:16 mapped to `720:1280`. The input image ratio must remain within 0.5–2.358. Runway task outputs are temporary for 24–48 hours and must be copied immediately to private B2 rather than exposed to the browser. The hosted $0.30 request cap, $2.00 daily cap, $10.00 monthly cap, 250 MB generated-output limit, and existing 200 MB estimate/reservation fit the proposed request; monthly settled generation cost was $0.02 with no active reservations at preflight. The prior 498-credit promotional balance was not re-read and remains an action-time check. No provider request or external mutation occurred during preflight.

The local preparation/confirmation gate is complete. The browser now offers separate private image and five-second video actions, uses one generic owner-authenticated command, locks the video request to the reviewed model/format/duration/output count, requires exactly one private `start_image`, and blocks submission until the 25-credit/$0.25 maximum is confirmed. Unit/component coverage and the free fake-video rehearsal pass at desktop, iPad landscape/portrait, and 390 × 844 phone sizes. No hosted function, B2 object, Runway request, credit, or deployment changed.

**Status: complete.** One action-time-confirmed `gen4_turbo` request produced one five-second private MP4. StudioFlow ingested 497,698 bytes through the bounded single-payload path, verified authenticated 720×1280 playback at 5.04 seconds, saved the media metadata, created one canonical result link and one $0.25 cost entry, released reservations, disabled generation, and paused the scheduler. No retry occurred. The result was below 8 MiB, so hosted multipart execution remains a later opportunistic check rather than a reason to buy another generation.

### AI-5 — Production-memory integration and hardening

- **Complete locally:** launch generation directly from a shot.
- **Complete locally:** compile series, episode, scene, shot, assigned-character, assigned/named-location, named-prop, and project-style memory into a new immutable prompt version.
- **Complete locally:** display complete inputs, lifecycle, model, result, request shape, and settled cost beside each managed attempt.
- **Complete:** confirm one-to-one generation-linked cost entries appear exactly once in Creator HQ totals; the first live video added one $0.25 row and moved the episode total from $0.02 to $0.27.
- **Complete:** final encrypted schema-version-2 backup/non-destructive restore rehearsal; the owner-only server path preserved all existing records and left generation disabled.
- Complete the release-candidate accessibility, quota, privacy, and responsive review.
- Keep production deployment behind its separate release gate.

## Verification Required

Automated coverage must prove:

- normalization, capabilities, and provider mapping
- exact cost estimates and atomic budget enforcement
- persisted cost reservations across restart, exact settlement/release, pricing-snapshot calculations, nullable provider-reported cost, and one-to-one cost entries
- charged failure/cancellation accounting and exact cost-reservation settlement
- generation-cost foreign key plus owner/project/episode consistency denial
- owner-only RLS and cross-project reference denial
- prompt immutability and old manual-record/import compatibility
- valid status transitions and append-only events
- double-submit prevention
- server-authoritative fail-closed generation switch, one-active-job enforcement, and atomic submission-claim ownership
- safe retry versus no-retry classification
- secret and temporary-URL redaction
- arbitrary-URL, redirect, loopback, private-target, and unapproved-provider-origin rejection at generated-output ingest
- queued to running to saving to completed lifecycle
- cancellation, failure, browser-close recovery, and B2 ingest recovery
- provider-input validation and near-cap B2 preflight rejection before submission
- secret short-lived private-reference transport and live provider fetch compatibility
- persisted output-byte reservations, quota accounting, and exact release or asset-byte replacement
- no managed completion without a private linked B2 asset, while legacy/manual recorded rows remain valid without one
- cost confirmation, refresh persistence, review decisions, keyboard access, 44px touch targets, and no layout overflow at all supported sizes

Live image and five-second video acceptance are complete. Every live result ended owner-only in StudioFlow and private B2 with exact prompt, reference, resolved model name, lifecycle, pricing snapshot, and calculated cost provenance. Provider-reported cost remains nullable and may require manual portal reconciliation. No provider credential or temporary provider URL may appear in the browser or repository.

## Exact Next Implementation Task

AI-1 through AI-5 are complete, including the one approved five-second private video and the encrypted version 2 backup/non-destructive restore rehearsal. Generation is disabled with no reservation and an inactive scheduler. The exact next task is one release-candidate commit and private preview review. Do not publish production or submit another provider request.
