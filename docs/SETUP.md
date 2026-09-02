# Private workspace setup

The fictional demo needs no cloud account. Complete these steps only when you are ready to create the real private workspace.

## 1. Local tools

Install Node.js 24, Git, and Docker Desktop with the WSL 2 backend. Docker must be running before the local Supabase commands work.

```powershell
npm install
npm run supabase:start
npm run supabase:test
npm run supabase:types
```

If Docker cannot start, verify the Windows build, current WSL version, virtualization support, and Docker's current Windows requirements before changing project code.

## 2. Supabase

1. Create a free Supabase project with spend controls and automatic paid usage disabled.
2. Link this checkout and push the migration:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

3. Create a GitHub OAuth app. Put its client ID and secret in Supabase Auth, not in this repository.
4. Enable GitHub under Supabase Auth providers and configure the local, Netlify-preview, and eventual production callback URLs.
5. Sign in once through StudioFlow. Find that user in Supabase Auth and insert its UUID through the SQL editor:

   ```sql
   insert into public.app_owners (user_id) values ('YOUR_AUTH_USER_UUID');
   ```

   The database permits one row only. Do not commit the UUID.

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
```

Configure a weekly Supabase scheduled invocation of `metadata-backup` with `x-backup-secret`. Do not put that header value in a public workflow.

## 4. Local real-mode configuration

Copy `.env.example` to `.env.local` and fill only the public browser values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_DEMO_MODE=false
```

The Supabase server secret and all B2 values must never use a `VITE_` prefix.

## 5. Netlify preview

Connect the GitHub repository to Netlify, configure the same three public browser values, and leave production publishing unapproved. Branch previews may be reviewed first. Confirm the deploy context does not enable paid add-ons or automatic overages.

Follow `docs/PRODUCTION-RELEASE.md` before any production release.
