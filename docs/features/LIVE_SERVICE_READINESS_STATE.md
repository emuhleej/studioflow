# Live-Service Readiness — Implementation State

## Status

ACTIVE

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
- `.env.example`
- `docs/SETUP.md`
- `docs/SECURITY.md`
- `docs/BACKUP-RESTORE.md`
- `docs/PRODUCTION-RELEASE.md`

## Data / Persistence

The hosted Supabase project contains the five committed production-core migrations and no owner production records yet. Nineteen public tables have row-level security enabled. Browser production metadata remains Supabase-owned; media and encrypted backup bytes remain assigned to private Backblaze B2. The fictional demo continues to use browser-local storage only.

## Integration Status

The hosted Supabase project is connected. Migration history exactly matches the five reviewed repository migrations. Generated TypeScript types now reflect the live schema. GitHub OAuth, the owner allowlist, B2 credentials and lifecycle rules, Edge Function secrets, live media operations, backup scheduling, and Netlify preview configuration are not yet complete.

## Complete

- Local Milestone 7–9 checkpoint commit created.
- Docker deliberately skipped on the current older desktop.
- Hosted Supabase project linked through the approved connection.
- Five reviewed migrations applied with repository timestamps intact.
- Schema verified with 19 of 19 public tables using row-level security.
- Anonymous public-table grants verified at zero.
- Generated TypeScript database types refreshed from the hosted schema.
- Supabase security and performance advisors reviewed.
- Full application verification passed after type regeneration: type-check, lint, 63 unit/component tests, and production build.

## Partially Implemented

- Database security: RLS and grants are present, but live owner/non-owner behavior and pgTAP remain to be exercised.
- Private mode: client and repository code exist, but OAuth and the sole-owner row are not configured.
- Media and backup integrations: implementation exists, but B2 secrets and live provider exercises are pending.

## Not Started

- GitHub OAuth provider configuration and callback verification.
- Sole-owner allowlist insertion after the first approved sign-in.
- Live private B2 upload, preview, resume, delete, backup, and restore exercises.
- Netlify preview configuration and review.

## Broken / Needs Verification

- The isolated pgTAP suite has not run because Docker is intentionally absent from this desktop; it must run in GitHub Actions or on a capable approved host.
- The security advisor reports that `public.is_app_owner(uuid)` is executable by anonymous and authenticated API roles. Its grants must be narrowed before live auth acceptance.
- The advisor reports `app_owners` has RLS but no policy. This is intended to deny browser access, but the deny-all behavior must be verified during owner-access testing.
- Performance advice includes unindexed foreign keys and per-row auth evaluation in RLS policies. Review and address these through a committed migration before production readiness.

## Locked Decisions

- StudioFlow remains single-owner and private.
- Docker is not installed on the current desktop; hosted Supabase plus CI is the approved route.
- Migrations remain source-controlled and additive; do not repair live schema with ad hoc dashboard edits.
- Mutating pgTAP fixtures never run against the hosted owner project.
- Production deployment remains a separate explicit approval.
- AI providers and social automation remain outside this feature.

## Known Risks

- OAuth misconfiguration could create an authenticated user who is not yet the allowed owner.
- Security-definer execute grants must be hardened before considering the owner boundary verified.
- B2 credentials or backup keys could leak if placed in browser-prefixed variables or committed files.
- Hosted-only schema checks do not replace isolated database tests.

## Remaining Verification

- Confirm signed-out, non-owner, and configured-owner access at the API level.
- Run all pgTAP tests in an isolated CI/local Supabase stack.
- Exercise private media lifecycle and quota behavior with the dedicated B2 bucket.
- Complete an encrypted backup, download, decrypt, and restore rehearsal.
- Review a Netlify branch preview before any production decision.

## Exact Next Implementation Task

Configure GitHub OAuth and the singleton owner allowlist, harden the owner-check function grants through a reviewed migration, and verify signed-out, non-owner, and owner access. Do not begin Backblaze configuration or deploy StudioFlow.

## Remaining Implementation Order

1. Complete the exact 10B owner-authentication task above.
2. Configure and verify the private Backblaze B2 media lifecycle.
3. Rehearse encrypted backup and restore.
4. Run the isolated database-security job and resolve remaining readiness findings.
5. Prepare a Netlify branch preview only after separate approval.

Update this file after every meaningful live-service checkpoint.
