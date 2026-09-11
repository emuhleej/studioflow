# Edge Functions

All media functions set `verify_jwt = false` in local configuration because they perform explicit token validation and then require the singleton `app_owners` row. This permits modern Supabase signing-key formats while preserving an application-level authorization check.

- `media-upload-start`: validate type/size/quota, create metadata and session, sign single upload or start multipart.
- `media-upload-part`: sign one multipart part.
- `media-upload-complete`: complete multipart when needed, verify object length, mark the session complete.
- `media-upload-resume`: return uploaded parts or refresh a single-upload URL.
- `media-upload-cancel`: abort incomplete multipart state and remove its orphan metadata.
- `media-url`: issue a ten-minute private inline URL.
- `media-delete`: permanently delete only an already-trashed asset.
- `metadata-backup`: owner-invoked or secret-scheduled AES-256-GCM metadata backup.
- `metadata-restore`: owner-invoked, non-destructive restore rehearsal from the latest encrypted
  B2 backup. It accepts no caller-supplied records, preserves existing rows, and forces managed
  generation off.
- `generation-start`: owner-authenticated, generation-ID-only managed submission entry point. It remains inert while the database generation switch is false.
- `generation-cancel`: owner-authenticated cancellation request by stored generation ID.
- `generation-reconcile`: internal-service-only due-job polling and interrupted-claim recovery; it accepts no caller record identifiers and pauses its on-demand cron job when no active managed work remains.
- `generation-ingest`: internal-service-only, generation-ID-only bounded copy from an exact approved provider output host into private B2. Source uses one bounded payload through 8 MiB or sequential 8 MiB multipart parts for larger results, exact-object reuse and verification, a 100-second deadline, and best-effort multipart abort. Active hosted version 10 contains the updated orchestrator and B2 adapter and preserves custom-auth HTTP 401 denial; actual B2 multipart execution remains pending.

The four generation functions were deployed in the separately approved AI-3 configuration gate with exact server-only secret names and a strict provider-output host allowlist. They reject unauthenticated requests. AI-3 Gate 3 later verified exactly one owner-approved Runway still, private signed-reference fetch, recovered provider completion, B2 ingest, and atomic asset/link/cost settlement. The hosted schedule migration created an inactive-while-idle once-per-minute cron job plus service-only activation controls. A later approved gate rotated and synchronized the internal credential through Supabase Edge secrets/Vault, deployed the updated start/reconcile functions, reconfirmed unauthenticated HTTP 401 denial, and completed an empty live run that paused itself. The generation switch is false, no managed job is active, and no additional provider request is authorized.

The memory-safe `generation-ingest` bundle is deployed as active hosted version 10. Deployed source composition and unauthenticated denial are verified, but the B2 multipart data path has not yet executed. Ordinary setup still does not authorize a provider request, hosted B2 write, Netlify deployment, or production release.

Required secrets and deployment commands are in `docs/SETUP.md`.
