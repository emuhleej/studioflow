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
- `generation-start`: owner-authenticated, generation-ID-only managed submission entry point. It remains inert while the database generation switch is false.
- `generation-cancel`: owner-authenticated cancellation request by stored generation ID.
- `generation-reconcile`: internal-service-only due-job polling and interrupted-claim recovery; it accepts no caller record identifiers.
- `generation-ingest`: internal-service-only, generation-ID-only bounded streaming copy from an exact approved provider output host into private B2.

AI-1 and AI-2 do not deploy the four generation functions, configure their server secrets, or make a live provider request. The Runway-shaped adapter is verified with mocked HTTP only; the deterministic fake provider exercises the account-free browser workflow.

Required secrets and deployment commands are in `docs/SETUP.md`.
