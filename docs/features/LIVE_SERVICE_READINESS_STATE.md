# Live-Service Readiness — Implementation State

## Status

COMPLETE — MILESTONES 10A–10F

## Purpose

Connect StudioFlow's already-built production core to owner-controlled services without broadening scope into AI providers, social automation, billing, or production deployment.

## Approved V1 Scope

- Apply reviewed migrations to the hosted Supabase project.
- Generate committed TypeScript types from the verified hosted schema.
- Configure GitHub OAuth and the singleton owner allowlist.
- Verify anonymous, non-owner, and owner database behavior.
- Connect the private Backblaze B2 bucket and exercise the existing signed media lifecycle.
- Rehearse encrypted metadata backup and restore.
- Prepare a Netlify preview for a separately approved review gate.

## Explicitly Out of Scope

- AI-provider execution or API-key workflows.
- Automatic social posting or analytics imports.
- The future multi-track editor.
- Customer accounts, teams, subscriptions, or billing.
- Automatic paid overages or provider upgrades.
- Production deployment, custom domains, or public release without separate approval.

## Files Involved

- `supabase/migrations/`
- `supabase/tests/database/`
- `supabase/functions/`
- `src/lib/database.types.ts`
- `src/lib/supabase.ts`
- `src/lib/remote-repository.ts`
- `src/state/studio-store.tsx`
- `playwright.config.ts`
- `.env.example`
- `docs/SETUP.md`
- `docs/SECURITY.md`
- `docs/BACKUP-RESTORE.md`
- `docs/PRODUCTION-RELEASE.md`

## Data / Persistence

The hosted Supabase project contains the six committed production-core migrations. It has one private authentication identity and one singleton owner-allowlist row. Nineteen public tables have row-level security enabled. Browser production metadata remains Supabase-owned; media and encrypted backup bytes remain in the private Backblaze B2 bucket. All fictional live-verification records and objects were removed after the rehearsal, so the owner workspace and dedicated bucket contain no test data. The fictional demo continues to use browser-local storage only.

## Integration Status

The hosted Supabase project is connected and its migration history matches the six reviewed repository migrations. Generated TypeScript types reflect the live schema. GitHub OAuth, exact local and Deploy Preview redirects, the singleton owner row, and private-mode browser configuration are complete. Signed-out, simulated non-owner, real owner, and anonymous media-boundary behavior have been verified. The private B2 bucket, restricted application key, server-side encryption, exact-origin CORS, lifecycle rules, Supabase secrets, and eight Edge Functions are configured. Single-part upload, private preview/download, trash/restore, multipart pause/resume, provider cancellation, encrypted backup creation/download/decryption, non-destructive restore ordering, and exact cleanup are verified. The public repository is connected, and isolated database-security plus application CI passed.

Milestone 10F has a guarded private Netlify Deploy Preview at commit `294acc8`, deployment `6a98ade0b248ff000843f8f0`, containing the startup owner-authorization fix from `20c7f44` and the fail-closed production-build guard from `5a56947`. Creator HQ, direct `/library` and `/media` routes and refreshes, a clean browser console, and all four supported viewport sizes are verified. Netlify's three browser variables exist only in Deploy Previews, production browser values are empty, and provider-level Auto Publishing is locked. A fresh owner sign-out/sign-in plus three reloads preserved owner access. A tiny preview-origin private-media lifecycle completed with exact database cleanup.

## Complete

- Local Milestone 7–9 checkpoint commit created.
- Docker deliberately skipped on the current older desktop.
- Hosted Supabase project linked through the approved connection.
- Six reviewed migrations applied with repository timestamps intact.
- Owner authorization hardened behind a non-exposed `private.is_app_owner()` helper that derives identity only from `auth.uid()`.
- Browser access limited to the authenticated-only, no-argument `current_user_is_app_owner()` self-check; the old arbitrary-UUID RPC was removed.
- All 18 owner RLS policies rebuilt with stable selected authentication checks.
- Schema verified with 19 of 19 public tables using row-level security and zero anonymous public-table grants.
- GitHub OAuth application created and securely stored in Supabase; no OAuth credential was added to the repository.
- Local site and redirect URLs configured for `127.0.0.1` and `localhost` on port 4173.
- First GitHub identity registered as the singleton owner without committing or displaying its UUID.
- Signed-out login-only behavior, simulated non-owner read/write denial, and real owner access to Creator HQ verified.
- Generated TypeScript database types refreshed from the hosted schema.
- Hosted security and performance advisors rechecked after the migration. Performance has no warnings or errors. Security has no errors; it retains the intentional deny-all `app_owners` informational notice and a leaked-password warning that is not applicable to StudioFlow because email/password authentication is disabled.
- Unused email/password authentication disabled; GitHub is the only enabled owner sign-in provider.
- Playwright's fictional-demo server isolated on port 4174 with demo mode forced, so private `.env.local` settings cannot contaminate the test suite.
- Dedicated Backblaze B2 bucket created as private with default server-side encryption enabled and Object Lock disabled.
- Restricted bucket-specific application key created; credentials are stored only as server-side Supabase secrets.
- B2 lifecycle cleanup deletes hidden prior versions after one day and abandons unfinished multipart uploads after three days.
- B2 CORS is limited to the approved local StudioFlow origins and the signed GET, HEAD, and PUT operations required by the existing media client.
- All eight media and encrypted-backup Edge Functions deployed and confirmed active.
- Live 68-byte image upload, private preview, private download, trash, and restore verified.
- Live 55 MB multipart upload paused at 2%, resumed from the existing session, and completed.
- Anonymous access to the media URL function denied with HTTP 401.
- Encrypted metadata backup created in private B2, downloaded, decrypted, and verified to contain the current fictional project and two asset records.
- Backup records restored with dependency-safe, non-destructive upserts and verified against project, asset, and upload-session counts.
- Provider-level unfinished large-file cancellation verified.
- Exact generated B2 objects, hosted database records, local media, decrypted backup, encrypted copy, and temporary credential transport permanently removed; zero test records remain.
- Public repository `emuhleej/studioflow` created without a license or generated starter files and connected as `origin`.
- First GitHub Actions application job passed; isolated Supabase/pgTAP database-security job passed in 2 minutes 49 seconds.
- Follow-up secret scan completed against a valid commit range with no leaks detected.
- Owner authorization now distinguishes retryable verification errors from definitive non-owner denial and ignores stale results from superseded sessions.
- `npm run verify` passed with 69 unit/component tests and the production build; all 32 Playwright scenarios passed.
- Private Netlify deployment `6a98ade0b248ff000843f8f0` serves guarded commit `294acc8` with protected access and preview-only browser configuration.
- Existing-owner access to Creator HQ, direct `/library` and `/media` navigation and refresh, a clean console, and responsive layouts at 1440 × 900, 1194 × 834, 834 × 1194, and 390 × 844 are verified.
- Netlify Auto Publishing is locked while the repository ignore rule and fail-closed production command remain defense in depth.
- A fresh GitHub sign-out/sign-in returned to the exact private preview as the owner; three subsequent reloads remained owner-authorized without a false denial.
- A 522-byte PNG completed direct private upload, 16 × 16 preview, matching-size and matching-SHA-256 download, trash, restore, and permanent deletion. The media-delete function returned HTTP 200 after its awaited B2 deletion path, all queried hosted tables returned to zero temporary records, and the browser logged no warnings or errors.
- PR #5 head `294acc8` had six successful checks and one neutral check and remains unmerged pending a separate repository action.

## Partially Implemented

- Signed-URL expiry and a full live 9 GB cap simulation were not stress-tested because they would add time or unnecessary provider bytes. Their deterministic application/database coverage passed.

## Not Started

- A separately approved production release, custom domain, and AI-provider execution.

## Broken / Needs Verification

- Docker remains absent from this desktop by design; the isolated pgTAP suite now runs successfully in GitHub Actions.
- The security advisor's remaining `app_owners` notice is informational and expected: RLS is enabled with no browser policy so the allowlist remains deny-all to API clients.
- The leaked-password advisor cannot be enabled on the free plan, so email/password authentication is disabled instead. GitHub OAuth remains the only enabled provider.
- Performance advice now contains 22 informational unindexed-foreign-key and unused-index suggestions only. Review these separately before production release; they do not weaken the verified owner boundary.
- Netlify published one initial production-context shell at `main` commit `6c18ece` during site creation despite the repository ignore rule. It remains edge-protected and has no production browser variables. Provider-level Auto Publishing is now locked.

## Locked Decisions

- StudioFlow remains single-owner and private.
- Docker is not installed on the current desktop; hosted Supabase plus CI is the approved route.
- Migrations remain source-controlled and additive; do not repair live schema with ad hoc dashboard edits.
- Mutating pgTAP fixtures never run against the hosted owner project.
- OAuth credentials and the owner UUID remain private provider/database configuration, never repository data.
- Production deployment remains a separate explicit approval.
- AI providers and social automation remain outside this feature.

## Known Risks

- B2 credentials or backup keys could leak if placed in browser-prefixed variables or committed files.
- Real-time signed-URL expiry and full-capacity quota stress remain optional pre-production exercises. Provider cancellation and exact deletion/cleanup are complete.
- The repository production-ignore rule is defense in depth, not proof that Netlify cannot publish; the verified provider-level Auto Publishing lock must remain enabled.

## Remaining Verification

- None within Milestone 10F. The separate repository gate requires rechecking the pull-request checks and protected preview revision after the documentation-only closeout commit and before merge. Production promotion remains separately prohibited.

## Exact Next Implementation Task

Commit and push the documentation-only Milestone 10F closeout, then recheck PR #5 and its protected preview. Stop before correcting the PR description or merging unless the owner separately approves those actions. Do not promote production, start AI-1, add AI providers, or change paid-service settings.

## Remaining Implementation Order

1. Push the documentation-only 10F closeout and recheck PR #5 plus its protected preview.
2. Correct and merge PR #5 only with separate owner approval.
3. Stop for a separate production-release or AI-1 decision; neither begins automatically.

Update this file after every meaningful live-service checkpoint.
