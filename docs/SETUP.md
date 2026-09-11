# Private workspace setup

The fictional demo needs no cloud account. Complete these steps only when you are ready to create the real private workspace.

## 1. Local tools on this desktop

Install Node.js 24 and Git. Docker Desktop is deliberately skipped on the current older StudioFlow desktop. Application checks run locally; reviewed database migrations, generated types, and advisor checks use the connected hosted Supabase project; the isolated pgTAP suite runs in GitHub Actions or on a separate capable development host.

```powershell
npm install
npm run verify
npx playwright install chromium
npm run test:e2e
```

Do not install or troubleshoot Docker on this computer as an ordinary StudioFlow task. The project-local `supabase:start`, `supabase:test`, and local `supabase:types` scripts remain available for GitHub Actions or another machine that intentionally supports Docker.

## 2. Supabase

1. Create a free Supabase project with spend controls and automatic paid usage disabled.
2. Authenticate the project-local Supabase CLI, link the checkout, review the migration list, and push only committed migrations:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase migration list
   npx supabase db push
   ```

   On the current desktop, generate committed database types from the linked hosted project through the approved Supabase connection. Never hand-edit `src/lib/database.types.ts` as a competing schema, and never run destructive test fixtures against the hosted project.

3. Create a GitHub OAuth app. Put its client ID and secret in Supabase Auth, not in this repository.
4. Enable GitHub and disable the unused email provider under Supabase Auth providers. During local development, set the site URL to `http://127.0.0.1:4173` and allow both that address and `http://localhost:4173` as redirects. Add preview or production URLs only at their separately approved deployment gates.
5. Sign in once through StudioFlow. Find that user in Supabase Auth and insert its UUID through an owner-controlled database operation:

   ```sql
   insert into public.app_owners (user_id) values ('YOUR_AUTH_USER_UUID');
   ```

   The database permits one row only. Do not commit or display the UUID. The configured StudioFlow project has completed steps 1–5; repeat them only for a deliberately new Supabase project.

## 3. Private Backblaze B2 bucket

1. Create a private bucket dedicated to StudioFlow.
2. Create a bucket-restricted application key with only the read/write/list/delete capabilities required for that bucket.
3. Apply the rules in `infra/b2-lifecycle-rules.json`: cancel unfinished multipart uploads after three days and delete hidden prior versions after one day.
4. Keep paid overages and automatic upgrades disabled. Review the provider dashboard before every production milestone.

Create `supabase/.env.functions` locally; it is ignored by Git:

```dotenv
B2_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_NAME=
B2_ENDPOINT=https://s3.REGION.backblazeb2.com
B2_REGION=
APP_ORIGINS=http://localhost:4173
BACKUP_ENCRYPTION_KEY=
BACKUP_JOB_SECRET=
```

`BACKUP_ENCRYPTION_KEY` must be a base64-encoded random 32-byte value. `BACKUP_JOB_SECRET` should be a different random value of at least 32 characters. Store both in a password manager before uploading them as secrets.

```powershell
npx supabase secrets set --env-file supabase/.env.functions
npx supabase functions deploy media-upload-start
npx supabase functions deploy media-upload-part
npx supabase functions deploy media-upload-complete
npx supabase functions deploy media-upload-cancel
npx supabase functions deploy media-upload-resume
npx supabase functions deploy media-url
npx supabase functions deploy media-delete
npx supabase functions deploy metadata-backup
npx supabase functions deploy metadata-restore
```

Configure a weekly Supabase scheduled invocation of `metadata-backup` with `x-backup-secret`. Do not put that header value in a public workflow.

`metadata-restore` is browser-invoked only by the authenticated singleton owner. It reads the latest completed encrypted backup directly from the configured private B2 bucket and uses the same `BACKUP_ENCRYPTION_KEY`; it needs no additional secret and accepts no workspace records or storage key from the caller.

## 4. Local real-mode configuration

Copy `.env.example` to `.env.local` and fill only the public browser values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_DEMO_MODE=false
```

StudioFlow validates these browser values in `src/lib/env.ts`. Development without valid private-workspace configuration falls back to the fictional demo and logs only a generic warning. Production fails closed if demo mode is enabled or either Supabase browser value is missing or invalid; it never silently serves the fictional demo as the production workspace.

The Supabase server secret and all B2 values must never use a `VITE_` prefix.

## Managed AI configuration boundary

AI-1 and AI-2 require no AI-provider account or API key. Their fake-provider lifecycle and Runway-shaped adapter tests are account-free. AI-3 and AI-4 are complete: the hosted project has one StudioFlow-scoped Runway credential stored only as the Supabase Edge Function secret `RUNWAYML_API_SECRET`; one approved still consumed two promotional credits and one separately confirmed five-second video consumed 25 promotional credits. The secret value must never be copied into a local file, browser variable, Netlify variable, database row, export, log, screenshot, documentation, or chat. `generation_enabled` is false between separately approved requests.

The hosted generation functions use these server-only values:

- `RUNWAYML_API_SECRET` — configured in hosted Supabase on 2026-09-10; Runway server credential, never a browser or Netlify variable.
- `RUNWAY_OUTPUT_HOSTS` — configured on 2026-09-10 from Runway's current official output example; comma-separated exact output hostnames only, with no wildcards or inferred parent domains.
- `GENERATION_JOB_SECRET` — configured on 2026-09-10 as an independent random internal-service credential for reconciliation/ingest; never reuse the backup secret or accept it from browser code.

`generation-start`, `generation-cancel`, `generation-ingest`, and `generation-reconcile` are active in hosted Supabase with the custom authentication recorded in `supabase/config.toml`. They deny unauthenticated requests. The first still-image gate verified prompt/reference submission, temporary reconciliation, private B2 ingest, cost settlement, and review.

The repository contains a replacement for complete-video buffering: one bounded payload through 8 MiB or sequential 8 MiB B2 multipart parts for larger generated results. `generation-ingest` version 10 completed the first live 497,698-byte video through the single-payload branch. Multipart remains pending because the output did not exceed 8 MiB. Routine setup must keep `generation_enabled=false` and must not submit another Runway request, deploy Netlify, or release production without the matching separate approval.

The hosted database contains an inactive-while-idle `studioflow-generation-reconcile` cron job. Its repository migration uses `pg_cron`, `pg_net`, and encrypted Vault entries named `studioflow_project_url` and `studioflow_generation_job_secret`. Under separate approval, the internal Edge secret was rotated, its matching Vault value and the project URL were synchronized without entering project files or output, and the updated `generation-start` and `generation-reconcile` functions were deployed. An empty live invocation succeeded and returned the job to inactive while `generation_enabled=false`; no Runway request occurred. Never place either Vault value in source, a local environment file, logs, screenshots, or chat.

AI-4 completed on 2026-09-10: one action-time-confirmed `gen4_turbo` request produced a private 720×1280 MP4 with 5.04-second playback and exactly one $0.25 cost entry. StudioFlow disabled generation immediately after acceptance and the scheduler paused after completion. Before any later request, recheck provider pricing, balance, input/output rules, and hosted guards, then obtain a new exact approval; never generate solely to force multipart coverage.

Supabase browser authentication uses PKCE. Never inspect or capture an OAuth callback URL before the client has exchanged the code and returned to a clean StudioFlow URL.

## 5. Netlify preview

Connect the GitHub repository to Netlify, configure the same three public browser values, and leave production publishing unapproved. Branch previews may be reviewed first. Confirm the deploy context does not enable paid add-ons or automatic overages.

The configured StudioFlow site is `studioflowhq`. Its Supabase URL, anon key, and `VITE_DEMO_MODE=false` exist only in the Deploy Previews context; the production context has no StudioFlow browser values. Each approved preview origin must be added exactly to all three allowlists: Supabase Auth redirects, the Edge Function `APP_ORIGINS` secret, and B2 CORS. Do not use a broad wildcard.

Keep all production protections enabled: the repository `[context.production] ignore = "exit 0"` rule, the fail-closed production command in `scripts/netlify-production-guard.mjs`, and Netlify's provider-level production auto-publish lock. The original ignore rule did not prevent an initial protected `main` build during site creation, so it is not sufficient by itself. That initial build has no production browser values and is not an approved release. Do not create `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` unless a separate production release has authorized one exact reviewed 40-character commit SHA; remove it immediately after that candidate is handled.

An approved production release must also configure its exact production origin in all three allowlists and add the same three public browser values to Netlify's Production context. Those runtime values remain only while production is active. The commit-bound release variable and one-time build hook are temporary authorization mechanisms and must be removed immediately after the approved candidate is built. Follow the exact order in `docs/PRODUCTION-RELEASE.md`.

Follow `docs/PRODUCTION-RELEASE.md` before any production release.
