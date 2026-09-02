# Live-Service Readiness — Implementation State

## Status

ACTIVE — MILESTONES 10A–10E COMPLETE

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

The hosted Supabase project is connected and its migration history matches the six reviewed repository migrations. Generated TypeScript types reflect the live schema. GitHub OAuth, the local callback allowlist, the singleton owner row, and private-mode browser configuration are complete. Signed-out, simulated non-owner, real owner, and anonymous media-boundary behavior have been verified. The private B2 bucket, restricted application key, server-side encryption, CORS, lifecycle rules, Supabase secrets, and eight Edge Functions are configured. Single-part upload, private preview/download, trash/restore, multipart pause/resume, provider cancellation, encrypted backup creation/download/decryption, non-destructive restore ordering, and exact cleanup are verified. The public repository is connected, and isolated database-security plus application CI passed. Netlify preview configuration remains pending and requires separate approval.

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

## Partially Implemented

- Signed-URL expiry and a full live 9 GB cap simulation were not stress-tested because they would add time or unnecessary provider bytes. Their deterministic application/database coverage passed.

## Not Started

- Netlify preview configuration and review.

## Broken / Needs Verification

- Docker remains absent from this desktop by design; the isolated pgTAP suite now runs successfully in GitHub Actions.
- The security advisor's remaining `app_owners` notice is informational and expected: RLS is enabled with no browser policy so the allowlist remains deny-all to API clients.
- The leaked-password advisor cannot be enabled on the free plan, so email/password authentication is disabled instead. GitHub OAuth remains the only enabled provider.
- Performance advice now contains 22 informational unindexed-foreign-key and unused-index suggestions only. Review these separately before production release; they do not weaken the verified owner boundary.

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

## Remaining Verification

- Review a Netlify branch preview before any production decision.

## Exact Next Implementation Task

Prepare a Netlify branch preview for owner review only after separate approval. Do not promote to production, enable automatic production deployment, add AI providers, or change paid-service settings.

## Remaining Implementation Order

1. Prepare a Netlify branch preview only after separate approval.
2. Review the preview at desktop, iPad, and phone sizes.
3. Stop for a separate production-deployment decision.

Update this file after every meaningful live-service checkpoint.
