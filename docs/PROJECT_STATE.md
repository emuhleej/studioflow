# StudioFlow Project State

Last updated: 2026-09-02

This document is StudioFlow's current project dashboard. It records the state a fresh coding agent needs in order to resume work safely. Read `CODEX.md` first, then this file, before opening a feature checkpoint.

## Current project status

| Field | Current state |
| --- | --- |
| Status | Active development |
| Production | Stable |
| Current major feature | Project Studio |
| Active implementation unit | Milestone 9 account-free workflow rehearsal complete |
| Latest completed checkpoint | Milestone 9D — responsive workflow verification and friction repair |
| Next checkpoint to open | Live-service readiness — account setup and private integration verification |

“Production: Stable” describes the current production-core code quality. StudioFlow has not been deployed to a production URL.

## Major systems currently present

- Responsive cinematic application shell and Creator HQ for desktop, iPad landscape, iPad portrait, and phone quick capture.
- Project, series, and episode production workflow with explicit episode stages.
- Production-memory libraries for characters, locations, props, styles, reference assets, and reusable prompt fragments.
- Autosaved episode and script drafts, immutable script history, ordered scenes and shots, and a reusable 60–90 second sitcom structure.
- Fictional browser-only demo workspace using localStorage and IndexedDB.
- Media metadata, asset links, upload-session records, trash state, review state, and image/audio/video classifications.
- Media safeguards for supported formats, non-empty files, a 2 GB per-file maximum, an 8 GB warning, and a 9 GB upload block.
- Supabase schema, singleton owner allowlist, row-level security, owner-scoped records, migrations, and pgTAP tests.
- Supabase Edge Function code for private B2 upload, multipart signing, resume, completion, cancellation, preview URLs, deletion, and encrypted metadata backup.
- Prompt-version and generation-provenance records without live AI-provider execution.
- Same-project generation result linking, synchronized compatibility references, and selected/rejected/unreviewed attempt decisions.
- Time, cost, publication, per-episode totals, metadata export, and restore workflows.
- Vitest, Playwright, lint, type-check, production-build, and database-test configuration.
- Modular workspace state with separate public context, demo persistence, upload management, current-state tracking, and cloud-save recovery.
- Private metadata writes retry once and safely roll back a failed optimistic change without overwriting newer work.

## Current active work

The current major feature is **Project Studio**. Milestone 9 is complete within the account-free boundary: one fictional episode was taken through every existing production-core stage and verified across the supported browser sizes.

Milestones 7A through 7D added:

- Episode-wide and shot-specific immutable prompt versions.
- Independent version chains by episode, optional shot, and prompt purpose.
- Exact prompt preservation, blank-content rejection, and same-episode shot validation.
- Read-only history cards and a safe “Use as next draft” action that never edits prior records.
- Database integrity rules and focused unit, component, pgTAP, and responsive browser coverage.
- Manual provider and model records for generations performed in external tools.
- Optional immutable prompt-version references with matching episode and shot context.
- Cost, duration, and notes capture without AI-provider execution.
- Generation integrity rules preventing blank provider/model values, invalid numbers, and cross-context references.
- Result-media attachment and removal using the existing asset-link system.
- Selected, rejected, and unreviewed decisions for each external generation attempt.
- Backward-compatible synchronization between canonical result links and generation result-ID arrays.
- Reload persistence plus responsive verification on desktop, iPad landscape, iPad portrait, and 390 × 844 phone layouts.

The Milestone 9 rehearsal exposed and repaired two workflow issues: generation-linked result media now appears in the episode Media tab, and scene/shot planning controls now have explicit accessible names and 44-pixel touch targets. The next checkpoint is live-service readiness. It requires separate authorization and owner-controlled Supabase and Backblaze resources. Production deployment remains a later, separate approval gate.

Repository maintenance completed on 2026-09-02 consolidated the project into the Documents workspace, split the central store into focused modules, and added guarded cloud-save retry and rollback. These changes did not advance or broaden the 7C feature boundary.

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

- The local Supabase database test suite cannot run because Docker is not installed in the verified shell environment.
- Supabase, Backblaze B2, GitHub OAuth, and Netlify production resources are not connected or live-tested.
- Multipart upload, private playback, signed-URL expiry, encrypted backup, and restore behavior still require live provider exercises after account setup is separately authorized.
- A private owner-episode repetition and final physical-device review still require the owner's private content, configured services, and devices. The account-free fictional workflow rehearsal is complete.
- The authoritative application source is `C:\Users\emrn2\OneDrive\Documents\ChatGPT\StudioFlow`. The previous Desktop working copy was retired after verification and the first local commit.

## Current build and deployment state

- Latest Milestone 9 verification: TypeScript, lint, the production build, all 63 unit/component tests in the stable single-worker run, and all 13 focused domain tests passed. The default parallel unit run hit one five-second timeout on this slow Windows/OneDrive host; no assertion failed.
- Playwright completed all 28 existing desktop, iPad, and phone scenarios plus all four new shot-planning accessibility scenarios. Browser inspection additionally verified the complete fictional rehearsal, reload persistence, dialog bounds, 44-pixel touch targets, and no page-level horizontal overflow at 1440 × 900, 1194 × 834, 834 × 1194, and 390 × 844.
- The prompt- and generation-history pgTAP cases are written but remain unexecuted because Docker is not installed.
- The consolidated source has an initial local Git commit. It has not been published to the planned public GitHub repository.
- No Netlify production deployment exists.
- No production URL, custom domain, connected OAuth application, live B2 bucket, or live Supabase project has been verified.
- Provider configuration and production deployment remain separate approval gates.

## Next checkpoint

Open **Live-service readiness — account setup and private integration verification** only after re-reading:

1. `CODEX.md`
2. This `docs/PROJECT_STATE.md`
3. `docs/features/REAL_WORKFLOW_TRIAL_STATE.md` for the completed Milestone 9 boundary
4. `README.md`
5. `docs/ARCHITECTURE.md`
6. `docs/SECURITY.md`
7. `docs/BUILD-PLAN.md`
8. `docs/SETUP.md`
9. The selected episode workflow files and existing browser tests

The checkpoint boundary is: configure only the explicitly authorized owner services and execute the already-written private database, media, backup, and restore checks. Do not add AI providers or deploy StudioFlow production without separate approval.

## Active documentation

- `CODEX.md` — permanent Codex behavior, engineering, safety, testing, and release rules.
- `docs/features/REAL_WORKFLOW_TRIAL_STATE.md` — completed fictional Milestone 9 rehearsal, fixes, verification, and remaining live checks.
- `docs/features/GENERATION_HISTORY_STATE.md` — completed provenance feature scope, verification, and remaining provider-backed checks.
- `docs/features/MEDIA_LIFECYCLE_STATE.md` — completed media feature scope and pending provider-backed verification.
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
