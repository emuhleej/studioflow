# StudioFlow Project State

Last updated: 2026-09-03

This document is StudioFlow's current project dashboard. It records the state a fresh coding agent needs in order to resume work safely. Read `CODEX.md` first, then this file, before opening a feature checkpoint.

## Current project status

| Field                       | Current state                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| Status                      | Active development                                                                           |
| Production                  | Stable                                                                                       |
| Current major feature       | AI Image and Video Generation                                                                |
| Active implementation unit  | None — Quick Wins Phases 1–3 are complete locally; AI generation remains paused before AI-3  |
| Latest completed checkpoint | Phase 3 environment validation, public shell health page, and privacy-bounded error tracking |
| Next checkpoint to open     | AI-3 Gate 1 only after explicit owner approval for a Runway account and prepaid balance      |

“Production: Stable” describes the current production-core code quality, not release approval. Netlify published an initial protected `main` build during site creation, but it has no production browser variables and is not an approved StudioFlow production release.

## Major systems currently present

- Responsive cinematic application shell and Creator HQ for desktop, iPad landscape, iPad portrait, and phone quick capture.
- Project, series, and episode production workflow with explicit episode stages.
- Production-memory libraries for characters, locations, props, styles, reference assets, and reusable prompt fragments.
- Autosaved episode and script drafts, immutable script history, ordered scenes and shots, and a reusable 60–90 second sitcom structure.
- Fictional browser-only demo workspace using localStorage and IndexedDB.
- Media metadata, asset links, upload-session records, trash state, review state, and image/audio/video classifications.
- Media safeguards for supported formats, non-empty files, a 2 GB per-file maximum, an 8 GB warning, and a 9 GB upload block.
- Connected hosted Supabase schema with seven reviewed migrations, 22 row-level-secured public tables, a configured singleton owner allowlist, hardened owner-only RLS, generated TypeScript types, and passing isolated pgTAP coverage.
- Configured GitHub OAuth with verified signed-out, non-owner, and real owner behavior; OAuth credentials and the owner UUID remain outside the repository.
- Supabase Edge Function code for private B2 upload, multipart signing, resume, completion, cancellation, preview URLs, deletion, and encrypted metadata backup.
- Connected private Backblaze B2 bucket with server-side encryption, restricted credentials, exact local and approved Deploy Preview CORS origins, one-day hidden-version cleanup, and three-day abandoned-multipart cleanup.
- Eight active Supabase Edge Functions with provider and backup credentials stored only as server-side secrets.
- Prompt-version and generation-provenance records without live AI-provider execution.
- Same-project generation result linking, synchronized compatibility references, and selected/rejected/unreviewed attempt decisions.
- Provider-neutral managed-generation records, immutable input/history records, hard budget and storage reservations, atomic submission/ingest rules, one-active-job enforcement, and a server-authoritative generation switch that remains off.
- Deterministic account-free image/video simulation in the fictional workspace plus source-only, mocked Runway request, cancellation, reconciliation, and private-output-ingest adapters. No generation function is deployed.
- Time, cost, publication, per-episode totals, metadata export, and restore workflows.
- Vitest, Playwright, lint, type-check, production-build, and database-test configuration.
- Modular workspace state with separate public context, demo persistence, upload management, current-state tracking, and cloud-save recovery.
- Private metadata writes retry once and safely roll back a failed optimistic change without overwriting newer work.
- Race-safe owner authorization with a distinct retryable verification-error state, stale-request protection, and definitive denial only after an explicit non-owner result.
- Private Netlify Deploy Preview with preview-only browser variables, protected access, SPA routing, and responsive owner-workspace verification.
- Top-level render-error containment, typed four-tone notifications, and accessible shared loading primitives with focused tests.
- Project-local Prettier, Husky, and lint-staged enforcement; stricter TypeScript compilation; and an implementation-aligned API reference.
- Centralized Zod environment validation with a safe development demo fallback and fail-closed production behavior.
- Minimal public `/health` shell indicator and a bounded, sanitized in-memory error tracker that reuses the authenticated client-error recorder.

## Current active work

The bounded **Quick Wins and Critical Fixes Phases 1–3** are complete in the local working tree. Phase 3 centralizes environment validation, prevents invalid or demo-mode production startup, adds a minimal public shell health page, and routes render and unhandled-promise failures through a sanitized 50-report in-memory tracker backed by the existing authenticated client-error recorder. The `/health` page does not open the private workspace or probe Supabase, B2, authentication, or AI providers. No database, provider, hosted environment, or deployment configuration changed.

The current major feature is **AI Image and Video Generation**. AI-1 and AI-2 are complete on `codex/ai-1-2-foundation` and draft PR #6. The account-free simulator is integrated with the fictional episode workspace, while the provider connector and recovery/ingest functions remain source-only and mock-tested.

The additive managed-generation migration is applied to hosted Supabase, the hosted TypeScript definitions are regenerated, all 22 public tables have RLS enabled, and the singleton generation settings row is confirmed disabled. Live database lint reports no schema errors. Current advisors add no AI-related security warning or error; performance results are informational, including expected unused fresh indexes and an optional generation-event foreign-key index.

No Runway account, organization, balance, key, provider call, paid request, scheduled recovery job, generation-function deployment, preview deployment, production deployment, or merge was performed. AI-3 requires a new explicit approval.

Milestone 10A connected the hosted Supabase project, applied the five production-core migrations, regenerated `src/lib/database.types.ts`, and ran hosted checks. Milestone 10B added and applied the reviewed owner-auth hardening migration, configured GitHub OAuth and local callbacks, disabled unused email/password login, registered the single owner, and verified signed-out, non-owner, and real owner access. All 19 public tables have row-level security enabled and anonymous public-table grants are zero.

Milestones 10C–10E are complete. The private bucket, restricted key, lifecycle/CORS safeguards, server-only secrets, and eight functions are configured. Generated media proved single upload, preview, download, trash/restore, multipart pause/resume, provider cancellation, and anonymous denial. The encrypted backup was created, privately downloaded, decrypted, validated, and restored with non-destructive upsert ordering. All generated provider, database, and local test data was then removed. The public GitHub repository is connected, and its isolated database-security and application jobs passed.

Milestone 10F is complete. The authorization startup race is permanently fixed in commit `20c7f44`; commit `5a56947` adds the fail-closed production-build guard and its verified tests. Guarded private Deploy Preview `6a98ade0b248ff000843f8f0` serves commit `294acc8`. Netlify Auto Publishing is locked. A fresh GitHub sign-out/sign-in returned to the exact preview as the owner, and three reloads did not reproduce the false non-owner state. A 522-byte PNG completed upload, private 16 × 16 preview, matching-hash download, trash, restore, and permanent deletion; the delete function returned success, all queried temporary workflow tables returned to zero, and the browser console remained clear. The earlier direct-route, responsive, local-test, Playwright, and CI checks also pass. Final PR head `3d850db` was merged into `main` as `0914fd9`; Netlify canceled the merge-triggered production attempt while Auto Publishing remained locked, and the published shell stayed at `6c18ece`. AI-provider execution and production release remain separate approval gates.

## Locked project-level decisions

- StudioFlow is a private, single-owner production workspace.
- The repository may be public, but real stories, scripts, prompts, media, production records, exports, backups, identifiers, and secrets remain private.
- The fictional demo is browser-local. The intended private online workspace stores metadata in Supabase and media in private Backblaze B2 storage.
- Mobile and iPad support are first-class requirements, not optional desktop reductions. Phone scope prioritizes quick capture and essential review.
- Large media uploads directly between the browser and B2 using short-lived signed URLs; Netlify and Supabase must not proxy the media bytes.
- Supabase authentication, the singleton owner allowlist, row-level security, authenticated Edge Functions, and private B2 objects form the security boundary.
- Cloudflare is not part of the StudioFlow architecture.
- Existing stored data must remain backward compatible. Schema or import changes require an explicit migration or normalization path.
- Script and prompt history is immutable. New revisions create new version records.
- Production deployment is never automatic and requires separate explicit approval after preview review.
- Paid overages, automatic service upgrades, new providers, custom domains, and external account configuration require separate approval.
- The initial business value comes from the content StudioFlow helps produce; customer accounts, teams, subscriptions, and billing are not production-core goals.
- The repository intentionally has no license until the owner makes a separate product-direction decision.

## Known project-level blockers

- Docker is intentionally not installed on this older desktop. GitHub Actions now supplies the isolated Supabase/pgTAP database-security environment.
- Netlify's repository production-ignore rule did not prevent the initial `main` build during site creation. The existing build is edge-protected and has no production browser values. The provider-level Auto Publishing control is now locked and must remain locked.
- Supabase's remaining table-security notice is informational: the intentionally private `app_owners` table has RLS with no browser policy. The free-plan leaked-password warning is not applicable because email/password login is disabled; GitHub is the only enabled provider. Performance advice is limited to informational unindexed-foreign-key and unused-index suggestions.
- Multipart pause/resume, private playback/download, provider cancellation, encrypted backup/decryption, non-destructive restore, and exact cleanup are live-verified. Waiting through a real signed-URL expiry and simulating the 9 GB live cap remain optional pre-production stress checks; deterministic application/database coverage already passed.
- A private owner-episode repetition and final physical-device review still require owner-approved private content and the owner's physical devices. The account-free fictional workflow rehearsal is complete.
- The authoritative application source is `C:\Users\emrn2\OneDrive\Documents\ChatGPT\StudioFlow`. The previous Desktop working copy was retired after verification and the first local commit.

## Current build and deployment state

- Quick Wins Phase 1 passes TypeScript, lint, all 94 unit/component tests across 23 files, all six production-release guard tests, and the production build. The build retains its existing informational warning for a JavaScript chunk larger than 500 kB. A full Playwright run reported all 36 scenarios successful but did not exit cleanly during runner cleanup; the single-worker confirmation was interrupted by the owner and remains a later verification item.
- Quick Wins Phase 2 passes the stricter TypeScript build, ESLint, Prettier's complete repository check, all 94 unit/component tests across 23 files, all six production-release guard tests, and the production build. The production dependency audit reports zero vulnerabilities. The full development audit reports seven high-severity advisories confined to the existing Netlify CLI dependency tree; no automatic dependency rewrite was applied.
- Quick Wins Phase 3 passes TypeScript, ESLint, Prettier's complete repository check, all 102 unit/component tests across 26 files, all six production-release guard tests, and the production build. The focused public-health Playwright check passes and exits cleanly at desktop, iPad landscape, iPad portrait, and 390 × 844 phone viewports. The build retains its informational large-chunk warning.

- Latest Milestone 9 verification: TypeScript, lint, the production build, all 63 unit/component tests in the stable single-worker run, and all 13 focused domain tests passed. The default parallel unit run hit one five-second timeout on this slow Windows/OneDrive host; no assertion failed.
- Playwright completed all 28 existing desktop, iPad, and phone scenarios plus all four new shot-planning accessibility scenarios. Browser inspection additionally verified the complete fictional rehearsal, reload persistence, dialog bounds, 44-pixel touch targets, and no page-level horizontal overflow at 1440 × 900, 1194 × 834, 834 × 1194, and 390 × 844.
- Milestones 10A–10B applied all six repository migrations to the hosted Supabase project. Verification found 19 of 19 public tables using RLS, 18 hardened owner policies, no anonymous public-table grants, and migration history matching the source filenames.
- Hosted-schema TypeScript types were regenerated, and `npm run verify` passed: type-check, lint, all 63 unit/component tests, and the production build.
- Supabase security and performance advisors ran successfully with no errors and no performance warnings. The expected GitHub-only authentication caveat and informational findings are recorded in `docs/features/LIVE_SERVICE_READINESS_STATE.md`.
- The isolated pgTAP database-security job passed in GitHub Actions in 2 minutes 49 seconds. All seven checks on documentation-only closeout head `faef374` concluded without failure: six successful and one neutral. Final PR head `3d850db` was merged into `main` as `0914fd9`. Local verification passed type-check, lint, 69 unit/component tests, the production build, and all 32 Playwright scenarios. The first normal follow-up secret scan detected no leaks.
- Local Git checkpoints now include the initial production core and Milestones 7–9 (`8f2413c`). The repository is published at `emuhleej/studioflow`; local `main` was synchronized with merged remote commit `0914fd9` before this documentation update.
- Guarded private Netlify Deploy Preview deployment `6a98ade0b248ff000843f8f0` at application revision `294acc8` contains the auth fix, production guard, and proposed provider-neutral AI plan. Owner access, a fresh OAuth cycle, three reloads, Creator HQ, `/library`, `/media`, a clean console, route refreshes, all four supported viewport sizes, and the exact tiny-media cleanup cycle are verified. Documentation-only closeout deployment `6a98b784104acf0008957b1c` at `faef374` completed; the canonical preview still opened Creator HQ as the owner with no browser warnings or errors.
- The authorization-race regression suite increased the verified application total to 69 unit/component tests; `npm run verify` and all 32 Playwright scenarios pass.
- Netlify published an initial production-context build of `main` at `6c18ece` during site creation. It remains edge-protected, has no production browser values, and is not an approved release. Site-level Auto Publishing is locked.
- GitHub OAuth, exact local and preview redirects, the singleton owner, private owner access, eight Edge Functions, server-only secrets, and the live B2 integration are configured. No custom domain or approved production release exists.
- AI-1/AI-2 verification passes locally with TypeScript, lint, 87 unit/component tests, six production-lock checks, and the production build. GitHub Actions run `33705389130` passes the same application checks, all 36 Playwright scenarios, secret scanning, and all 80 pgTAP assertions across six database suites.
- Hosted migration history now matches all seven source migrations. Live database lint reports no schema errors; all 22 public tables have RLS enabled; generated hosted types include the three managed-generation tables and four service-only database functions; `generation_enabled` remains false.
- The private B2 integration is live-verified. Two generated test assets and one encrypted test backup were written, exercised, restored, and permanently removed; the dedicated bucket and hosted owner workspace returned to zero test records.
- Provider configuration and production deployment remain separate approval gates.

## Next checkpoint

Before opening the next separately approved gate, re-read:

1. `CODEX.md`
2. This `docs/PROJECT_STATE.md`
3. `docs/features/QUICK_WINS_STATE.md`
4. `docs/features/LIVE_SERVICE_READINESS_STATE.md`
5. `docs/features/REAL_WORKFLOW_TRIAL_STATE.md` for the completed Milestone 9 boundary
6. `README.md`
7. `docs/ARCHITECTURE.md`
8. `docs/SECURITY.md`
9. `docs/BUILD-PLAN.md`
10. `docs/SETUP.md`
11. The authentication, Supabase repository, migrations, database tests, and route-guard files

Quick Wins is complete. The exact next product task is to return to `docs/features/AI_GENERATION_STATE.md` and wait for explicit approval of **AI-3 Gate 1**: create the Runway account and approve the prepaid balance. Do not create an AI key, configure a server secret, deploy generation functions, submit a paid request, merge, or release production without the separately named approval.

## Active documentation

- `CODEX.md` — permanent Codex behavior, engineering, safety, testing, and release rules.
- `docs/features/QUICK_WINS_STATE.md` — completed and locally verified Phases 1–3 maintenance checkpoint.
- `docs/API.md` — owner-authenticated PostgREST and private-media Edge Function interface reference.
- `docs/features/LIVE_SERVICE_READINESS_STATE.md` — completed 10A–10F live-service integration and the separate repository/release boundaries.
- `docs/features/REAL_WORKFLOW_TRIAL_STATE.md` — completed fictional Milestone 9 rehearsal and remaining owner-private/physical-device trials.
- `docs/features/GENERATION_HISTORY_STATE.md` — completed manual provenance scope, hosted verification, and the boundary to future managed generation.
- `docs/features/AI_GENERATION_STATE.md` — current feature checkpoint: AI-1/AI-2 complete and paused before AI-3.
- `docs/features/AI_GENERATION_PLAN.md` — provider-neutral image/video implementation order and separate paid-service gates.
- `docs/features/MEDIA_LIFECYCLE_STATE.md` — completed media feature scope, live provider results, and remaining physical-device review.
- `README.md` — product overview, current capabilities, local commands, and repository status.
- `docs/BUILD-PLAN.md` — ten-week feature and learning progression.
- `docs/ARCHITECTURE.md` — system boundaries and data placement.
- `docs/DECISIONS.md` — durable architecture, privacy, compatibility, recovery, and deployment decisions.
- `docs/SECURITY.md` and `SECURITY.md` — privacy, owner access, RLS, secrets, and vulnerability reporting.
- `docs/SETUP.md` — approved local and external-service setup instructions.
- `docs/BACKUP-RESTORE.md` — encrypted backup and restore procedures.
- `docs/PRODUCTION-RELEASE.md` — preview review, production approval, and live-verification gate.
- `CONTRIBUTING.md` — branch, pull-request, verification, and repository contribution workflow.

## Maintenance rule

Update this file whenever the overall project state materially changes, including:

- Completion of a major implementation unit or checkpoint.
- Transition to a new major feature.
- Addition or removal of a project-level blocker.
- A material build, test, provider, repository, preview, or deployment-state change.
- A new locked decision that affects multiple parts of StudioFlow.

Replace stale status rather than appending an implementation diary. Keep detailed architecture, feature specifications, technical decision histories, and completed-task logs in their appropriate documents or version-control history.
