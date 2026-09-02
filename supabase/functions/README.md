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

Required secrets and deployment commands are in `docs/SETUP.md`.
