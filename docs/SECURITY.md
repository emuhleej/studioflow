# Security model

## Controls

- GitHub OAuth establishes identity; it does not by itself grant workspace access.
- `app_owners_singleton_idx` allows exactly one owner UUID.
- Every production table has an indexed `owner_id` and RLS checks both `auth.uid()` and `is_app_owner()`.
- Anonymous table grants are revoked. Non-owner sessions receive no rows and cannot insert, update, or delete.
- Edge Functions repeat owner verification using the bearer token before touching B2 or service-role database access.
- B2 stays private. Browser access uses short-lived, purpose-specific inline-preview or attachment-download URLs that expire in 10–15 minutes.
- Asset links are validated against records in the same owner workspace. Permanent deletion requires trash and removes explicit and embedded references through a service-role-only database function.
- Script and prompt versions are append-only at the database trigger level.
- Client error records contain a short message, context label, route, and user agent—not scripts, prompts, form values, or media URLs.
- Secrets, real exports, and real media are ignored by Git and scanned in CI.

## Threat assumptions

The application assumes the owner's GitHub, Supabase, Netlify, Backblaze, and local Windows accounts are protected with strong unique passwords and multifactor authentication. Compromise of a service-role key or B2 application key is outside what browser RLS can contain, so those values exist only as server-side secrets and should be rotated immediately if exposed.

## Owner setup check

After the first GitHub sign-in, insert exactly that authenticated user's UUID into `app_owners` using the Supabase SQL editor. The singleton index prevents accidentally adding a second owner. Do not place the UUID in source code.

## Verification

`supabase/tests/database` proves configured-owner access and anonymous/non-owner denial. Run it whenever migrations or policies change. Use a second test account during the production-readiness review and confirm it sees the denial screen and cannot retrieve a signed media URL.
