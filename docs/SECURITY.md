# Security model

## Controls

- GitHub OAuth establishes identity; it does not by itself grant workspace access.
- GitHub is the only enabled authentication provider; unused email/password login is disabled.
- `app_owners_singleton_idx` allows exactly one owner UUID.
- Every production table has an indexed `owner_id`; RLS checks `auth.uid()` and the non-exposed `private.is_app_owner()` helper.
- Authenticated clients may call only `current_user_is_app_owner()`, a no-argument security-invoker self-check. Anonymous callers cannot execute it, and clients cannot test arbitrary UUIDs.
- Owner authorization uses an explicit startup lifecycle. Only a successful, current-session `false` result is classified as non-owner denial; network/RPC failures remain retryable verification errors, and stale results from an older session cannot overwrite a newer session.
- Anonymous table grants are revoked. Non-owner sessions receive no rows and cannot insert, update, or delete.
- Edge Functions repeat owner verification using the bearer token before touching B2 or service-role database access.
- Internal generation reconciliation and ingest use a distinct server-only secret, reject browser bearer authentication, accept only a generation ID where needed, and reload owner/provider/storage context from PostgreSQL. The reconciler accepts no caller-supplied identifiers and selects due singleton-owner rows itself.
- B2 stays private. Browser access uses short-lived, purpose-specific inline-preview or attachment-download URLs that expire in 10–15 minutes.
- Asset links are validated against records in the same owner workspace. Permanent deletion requires trash and removes explicit and embedded references through a service-role-only database function.
- Generation result links additionally require media from the same project. Database triggers synchronize explicit result links with backward-compatible generation result arrays and reject duplicate or cross-project references.
- Managed generation claims atomically enforce the server-owned enable switch, singleton owner, one-active-job rule, maximum request/daily/monthly budgets, and output-storage reservation. Browser clients cannot enable real generation or execute the claim functions directly.
- Script and prompt versions are append-only at the database trigger level.
- Client error records contain a short message, context label, route, and user agent—not scripts, prompts, form values, or media URLs.
- Secrets, real exports, and real media are ignored by Git and scanned in CI.

## Threat assumptions

The application assumes the owner's GitHub, Supabase, Netlify, Backblaze, and local Windows accounts are protected with strong unique passwords and multifactor authentication. Compromise of a service-role key or B2 application key is outside what browser RLS can contain, so those values exist only as server-side secrets and should be rotated immediately if exposed.

## AI-provider and generated-output boundary

AI-1 and AI-2 use a deterministic fake provider and mocked Runway HTTP. No Runway account, key, provider request, paid balance, scheduler secret, or live function deployment is part of those checkpoints, and the database `generation_enabled` switch remains false.

Future browser-started generation functions accept only the stored generation ID and require the existing owner bearer token. They reload the immutable prompt, input assets, settings, and owner context, recalculate the frozen price estimate on the server, and receive an atomic database claim before a provider request can begin.

Private reference images are exposed to a provider only through provider-only signed B2 URLs prepared on the server. The URL must use the exact configured B2 hostname, stay within 2,048 characters, and expire quickly. It is never returned to the browser or written to a record, export, backup, log, screenshot, issue, or chat.

Successful provider output uses a generated-output-only exception to the normal direct browser/B2 transfer rule. The internal ingest function:

- accepts only an internally authenticated generation ID, not a URL;
- retrieves the stored provider job through the adapter and keeps the temporary result URL in memory only;
- permits only an exact configured HTTPS output hostname and rejects credentials, IP literals, localhost, subdomain assumptions, redirects, unsupported media types, missing/invalid lengths, and streamed length mismatches;
- streams at most the persisted output reservation, never the ordinary 2 GB upload maximum, directly into the private owner B2 prefix;
- completes metadata through one atomic, idempotent database operation that creates at most one generated asset, one canonical link, and one linked cost entry.

An interrupted request after the provider-submission marker is not auto-retried. It becomes `submission_unknown`, keeps its cost and storage reservations, and requires an explicit owner-recorded no-charge or confirmed-charge outcome. Cancellation is not treated as evidence of a refund.

## Owner setup check

The first approved GitHub identity is registered directly in `app_owners`; the singleton index prevents a second owner. The configured owner UUID remains private database data and is not present in source code.

## Verification

Hosted verification proves the signed-out login boundary, simulated non-owner read/write denial, the configured owner's access to Creator HQ, and anonymous HTTP 401 denial at the media-signing boundary. The startup-race regression suite verifies retryable errors, explicit denial, successful retry, session changes, and stale-result protection; `npm run verify` passes with 69 unit/component tests. `supabase/tests/database` additionally covers the function grants and owner policies; the full isolated pgTAP suite passed in GitHub Actions and must run again whenever migrations or policies change.

The private B2 bucket, restricted application key, exact local and approved Deploy Preview CORS origins, lifecycle cleanup, and exact removal of all generated rehearsal objects were verified without placing credentials in the repository. The protected Deploy Preview passed a fresh GitHub sign-out/sign-in and three reloads without reproducing the false non-owner state. A 522-byte PNG uploaded directly to private B2, previewed at 16 × 16, downloaded with an identical byte count and SHA-256 hash, moved to trash, restored, and permanently deleted. The delete function returned success only after its awaited B2 deletion path, all queried temporary workflow tables returned to zero, and the browser logged no warnings or errors.

Netlify published one initial production-context shell during site creation despite the original repository ignore rule. It remains edge-protected and has no production browser values. A later fail-closed production command now rejects any production build that bypasses the ignore rule unless a separately managed full commit SHA exactly matches Netlify's current commit. The provider-level Auto Publishing control is locked and must remain locked. The shell is not an approved production release and must not be described as live StudioFlow.
