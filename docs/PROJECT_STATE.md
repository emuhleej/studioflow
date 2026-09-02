# StudioFlow Project State

Last updated: 2026-09-02

This document is StudioFlow's current project dashboard. It records the state a fresh coding agent needs in order to resume work safely. Read `CODEX.md` first, then this file, before opening a feature checkpoint.

## Current project status

| Field | Current state |
| --- | --- |
| Status | Active development |
| Production | Stable |
| Current major feature | Project Studio |
| Active implementation unit | Live-service readiness |
| Latest completed checkpoint | Milestone 10E — isolated database-security CI |
| Next checkpoint to open | Milestone 10F — Netlify branch preview, after separate approval |

“Production: Stable” describes the current production-core code quality. StudioFlow has not been deployed to a production URL.

## Major systems currently present

- Responsive cinematic application shell and Creator HQ for desktop, iPad landscape, iPad portrait, and phone quick capture.
- Project, series, and episode production workflow with explicit episode stages.
- Production-memory libraries for characters, locations, props, styles, reference assets, and reusable prompt fragments.
- Autosaved episode and script drafts, immutable script history, ordered scenes and shots, and a reusable 60–90 second sitcom structure.
- Fictional browser-only demo workspace using localStorage and IndexedDB.
- Media metadata, asset links, upload-session records, trash state, review state, and image/audio/video classifications.
- Media safeguards for supported formats, non-empty files, a 2 GB per-file maximum, an 8 GB warning, and a 9 GB upload block.
- Connected hosted Supabase schema with six reviewed migrations, 19 row-level-secured public tables, a configured singleton owner allowlist, hardened owner-only RLS, generated TypeScript types, and pgTAP coverage ready for isolated CI execution.
- Configured GitHub OAuth with verified signed-out, non-owner, and real owner behavior; OAuth credentials and the owner UUID remain outside the repository.
- Supabase Edge Function code for private B2 upload, multipart signing, resume, completion, cancellation, preview URLs, deletion, and encrypted metadata backup.
- Connected private Backblaze B2 bucket with server-side encryption, restricted credentials, local-only CORS, one-day hidden-version cleanup, and three-day abandoned-multipart cleanup.
- Eight active Supabase Edge Functions with provider and backup credentials stored only as server-side secrets.
- Prompt-version and generation-provenance records without live AI-provider execution.
- Same-project generation result linking, synchronized compatibility references, and selected/rejected/unreviewed attempt decisions.
- Time, cost, publication, per-episode totals, metadata export, and restore workflows.
- Vitest, Playwright, lint, type-check, production-build, and database-test configuration.
- Modular workspace state with separate public context, demo persistence, upload management, current-state tracking, and cloud-save recovery.
- Private metadata writes retry once and safely roll back a failed optimistic change without overwriting newer work.

## Current active work

The current major feature remains **Project Studio**. The account-free production workflow through Milestone 9 is complete and preserved in local Git checkpoint `8f2413c`.

Milestone 10A connected the hosted Supabase project, applied the five production-core migrations, regenerated `src/lib/database.types.ts`, and ran hosted checks. Milestone 10B added and applied the reviewed owner-auth hardening migration, configured GitHub OAuth and local callbacks, disabled unused email/password login, registered the single owner, and verified signed-out, non-owner, and real owner access. All 19 public tables have row-level security enabled and anonymous public-table grants are zero.

Milestones 10C–10E are complete. The private bucket, restricted key, lifecycle/CORS safeguards, server-only secrets, and eight functions are configured. Generated media proved single upload, preview, download, trash/restore, multipart pause/resume, provider cancellation, and anonymous denial. The encrypted backup was created, privately downloaded, decrypted, validated, and restored with non-destructive upsert ordering. All generated provider, database, and local test data was then removed. The public GitHub repository is connected, and its first isolated database-security and application jobs passed. The exact next unit is a Netlify branch preview only after separate approval; AI providers and production deployment remain outside that unit.

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
- Netlify is not configured or live-tested.
- Supabase's remaining table-security notice is informational: the intentionally private `app_owners` table has RLS with no browser policy. The free-plan leaked-password warning is not applicable because email/password login is disabled; GitHub is the only enabled provider. Performance advice is limited to informational unindexed-foreign-key and unused-index suggestions.
- Multipart pause/resume, private playback/download, provider cancellation, encrypted backup/decryption, non-destructive restore, and exact cleanup are live-verified. Waiting through a real signed-URL expiry and simulating the 9 GB live cap remain optional pre-production stress checks; deterministic application/database coverage already passed.
- A private owner-episode repetition and final physical-device review still require the owner's private content, configured services, and devices. The account-free fictional workflow rehearsal is complete.
- The authoritative application source is `C:\Users\emrn2\OneDrive\Documents\ChatGPT\StudioFlow`. The previous Desktop working copy was retired after verification and the first local commit.

## Current build and deployment state

- Latest Milestone 9 verification: TypeScript, lint, the production build, all 63 unit/component tests in the stable single-worker run, and all 13 focused domain tests passed. The default parallel unit run hit one five-second timeout on this slow Windows/OneDrive host; no assertion failed.
- Playwright completed all 28 existing desktop, iPad, and phone scenarios plus all four new shot-planning accessibility scenarios. Browser inspection additionally verified the complete fictional rehearsal, reload persistence, dialog bounds, 44-pixel touch targets, and no page-level horizontal overflow at 1440 × 900, 1194 × 834, 834 × 1194, and 390 × 844.
- Milestones 10A–10B applied all six repository migrations to the hosted Supabase project. Verification found 19 of 19 public tables using RLS, 18 hardened owner policies, no anonymous public-table grants, and migration history matching the source filenames.
- Hosted-schema TypeScript types were regenerated, and `npm run verify` passed: type-check, lint, all 63 unit/component tests, and the production build.
- Supabase security and performance advisors ran successfully with no errors and no performance warnings. The expected GitHub-only authentication caveat and informational findings are recorded in `docs/features/LIVE_SERVICE_READINESS_STATE.md`.
- The isolated pgTAP database-security job passed in GitHub Actions in 2 minutes 49 seconds. The application CI job also passed, including install, audit, type-check, lint, 63 tests, production build, and Playwright.
- Local Git checkpoints now include the initial production core and Milestones 7–9 (`8f2413c`). The repository is published at `emuhleej/studioflow` and tracks `origin/main`.
- No Netlify production deployment exists.
- GitHub OAuth, local callbacks, the singleton owner, private owner access, and the live B2 integration are configured and verified. No production URL, custom domain, or Netlify deployment exists.
- The private B2 integration is live-verified. Two generated test assets and one encrypted test backup were written, exercised, restored, and permanently removed; the dedicated bucket and hosted owner workspace returned to zero test records.
- Provider configuration and production deployment remain separate approval gates.

## Next checkpoint

Open **Milestone 10F — Netlify branch preview** only after re-reading:

1. `CODEX.md`
2. This `docs/PROJECT_STATE.md`
3. `docs/features/LIVE_SERVICE_READINESS_STATE.md`
4. `docs/features/REAL_WORKFLOW_TRIAL_STATE.md` for the completed Milestone 9 boundary
5. `README.md`
6. `docs/ARCHITECTURE.md`
7. `docs/SECURITY.md`
8. `docs/BUILD-PLAN.md`
9. `docs/SETUP.md`
10. The authentication, Supabase repository, migrations, database tests, and route-guard files

The checkpoint boundary is: prepare and review a Netlify branch preview only after separate authorization. Do not promote it to production, add AI providers, enable automatic deployment, buy a domain, or change paid-service settings.

## Active documentation

- `CODEX.md` — permanent Codex behavior, engineering, safety, testing, and release rules.
- `docs/features/LIVE_SERVICE_READINESS_STATE.md` — completed 10A–10E integrations, verified findings, and the exact Netlify-preview gate.
- `docs/features/REAL_WORKFLOW_TRIAL_STATE.md` — completed fictional Milestone 9 rehearsal, fixes, verification, and remaining live checks.
- `docs/features/GENERATION_HISTORY_STATE.md` — completed provenance feature scope, verification, and remaining provider-backed checks.
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
