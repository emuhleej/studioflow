# Private Media Lifecycle — Implementation State

Last updated: 2026-09-02

## Status

**IMPLEMENTATION AND LIVE PROVIDER VERIFICATION COMPLETE**

Current checkpoint: **Milestone 10F preview-origin verification complete**

## Purpose

The private media lifecycle lets the StudioFlow owner safely upload, resume, preview, download, organize, link, review, recover, and permanently remove production image, audio, and video files.

It supports a fictional browser-local demo and an owner-only Supabase/B2 workspace through one client domain model.

## Approved V1 Scope

- Common image, audio, and video formats up to 2 GB per file.
- Client/server validation, an 8 GB warning, and a 9 GB upload block.
- Direct signed browser-to-B2 single and multipart transfer.
- Progress, pause, resume, retry, cancellation, and completed-part recovery.
- Private previews and purpose-specific downloads with expiring URL recovery.
- Editable notes and technical metadata.
- Links from an asset to projects, series, episodes, scenes, shots, entities, and generations.
- Review decisions, trash, restore, confirmed permanent deletion, and reference cleanup.
- Three-day unfinished multipart cancellation and one-day hidden-version cleanup through B2 lifecycle rules.

## Explicitly Out of Scope

- AI generation calls, video editing, transcoding, timeline editing, captions, or export.
- Automatic social publishing or analytics imports.
- Public media access, sharing, teams, customer uploads, or public libraries.
- Cloudflare storage or infrastructure.
- Live provider configuration or production deployment without separate approval.
- Paid overages or automatic deletion of current owner media.

## Files Involved

### Browser application

- `src/pages/media.tsx`
- `src/pages/episode.tsx`
- `src/components/media-preview.tsx`
- `src/components/media-preview.test.tsx`
- `src/components/upload-task-list.tsx`
- `src/components/upload-task-list.test.tsx`
- `src/state/studio-store.tsx`
- `src/lib/media-access.ts`
- `src/lib/media-access.test.ts`
- `src/lib/media-upload.ts`
- `src/lib/upload-task.ts`
- `src/lib/upload-task.test.ts`
- `src/lib/blob-store.ts`
- `src/lib/domain.ts`
- `src/lib/domain.test.ts`
- `src/lib/remote-repository.ts`
- `src/types.ts`
- `src/data/demo.ts`

### Database and Edge Functions

- `supabase/migrations/20260831000100_studioflow_core.sql`
- `supabase/migrations/20260901000100_asset_lifecycle.sql`
- `supabase/functions/media-upload-start/index.ts`
- `supabase/functions/media-upload-part/index.ts`
- `supabase/functions/media-upload-resume/index.ts`
- `supabase/functions/media-upload-complete/index.ts`
- `supabase/functions/media-upload-cancel/index.ts`
- `supabase/functions/media-url/index.ts`
- `supabase/functions/media-delete/index.ts`
- `supabase/functions/metadata-backup/index.ts`
- `supabase/tests/database/asset_lifecycle.test.sql`
- `infra/b2-lifecycle-rules.json`

## Data / Persistence

- `assets` stores owner-scoped metadata, production context, media details, review state, and trash state.
- `asset_links` stores multiple validated links per asset. Link targets must exist in the same owner workspace.
- `upload_sessions` stores single/multipart state, B2 upload identifiers, completed parts, and expiration.
- Demo metadata and links use localStorage; uploaded demo bytes use IndexedDB.
- Private metadata and links use Supabase; private bytes use B2.
- Older saved workspaces without `assetLinks` normalize that collection to an empty array without dropping unknown stored fields.
- Asset links are included in metadata exports, imports, and encrypted backups.

## Integration Status

| Integration                            | State                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Demo metadata and IndexedDB blobs      | Implemented and tested                                                                                                           |
| Validation and quota rules             | Implemented and unit-tested                                                                                                      |
| Upload-task lifecycle                  | Implemented and unit/component-tested                                                                                            |
| Multipart completed-part recovery      | Live pause at 2%, resume, and completion verified with a 55 MB test file                                                         |
| Private preview URL lifecycle          | Implemented with loading, retry, pre-expiry refresh, and playback recovery                                                       |
| Purpose-specific download access       | Implemented with attachment disposition                                                                                          |
| Editable notes and technical metadata  | Implemented                                                                                                                      |
| Multi-context asset links              | Implemented in client, repository adapter, migration, backup, and UI                                                             |
| Trash and restore                      | Live provider-backed exercise passed                                                                                             |
| Confirmed permanent deletion           | Implemented with client and database reference cleanup                                                                           |
| Approved Deploy Preview lifecycle      | 522-byte PNG upload, preview, matching-hash download, trash, restore, permanent deletion, and exact hosted-record cleanup passed |
| Owner RLS and lifecycle database rules | Applied, live owner/non-owner behavior verified, and isolated pgTAP passed in GitHub Actions                                     |
| B2 lifecycle configuration             | Applied and read back: one-day hidden-version cleanup and three-day abandoned-multipart cleanup                                  |

## Complete

- Steps 6A–6D production-core implementation.
- Shared asset, link, and upload-session domain representation.
- Supported-format, empty-file, 2 GB, 8 GB, and 9 GB safeguards.
- Direct signed single and multipart upload paths.
- Retained upload cards with progress, pause, resume, retry, cancel, and dismiss controls.
- Completed-part lookup, progress reconstruction, and missing-part-only resume.
- Private preview loading/error/retry behavior and proactive signed-URL refresh.
- One automatic fresh-URL request after media playback failure.
- Purpose-specific inline preview and attachment download signing.
- Editable review state, notes, duration, width, and height.
- Multiple validated production links per asset with add/remove controls.
- Backward-compatible workspace import and local-storage normalization for `assetLinks`.
- Asset links in encrypted metadata backups.
- Recoverable trash and restore.
- Explicit permanent-deletion confirmation and failure retention.
- Orphan-reference cleanup for asset links, shot arrays, entity references, and generation arrays.
- Responsive workflow verification at desktop, both iPad orientations, and 390 x 844 phone.
- Private encrypted B2 bucket, bucket-restricted application key, exact local and approved Deploy Preview CORS origins, and server-only Supabase secrets configured.
- Eight media/backup Edge Functions deployed and confirmed active.
- Single-part upload, private image preview, attachment download, trash, restore, and anonymous HTTP 401 denial live-verified.
- Multipart upload pause/resume and completed-part continuation live-verified with generated test media.
- From the approved Deploy Preview, a 522-byte PNG uploaded to private B2, previewed at 16 × 16, downloaded with the same byte count and SHA-256 hash, moved to trash, restored, and permanently deleted. The Edge Function returned success after its awaited B2 deletion path, all queried temporary workflow tables returned to zero, and no browser warnings or errors remained.

## Partially Implemented

- Signed-URL expiry and a full 9 GB live-cap simulation remain optional pre-production stress exercises; deterministic application/database coverage passed.

## Not Started

- Physical-device review using private owner media.

## Broken / Needs Verification

- Docker is not installed in the current shell environment; the migration and pgTAP lifecycle tests passed in GitHub Actions instead.
- The hosted schema and generated TypeScript types are current. B2 and the private Netlify Deploy Preview are configured, and the tiny preview-origin lifecycle passed with exact cleanup.
- Anonymous media denial and simulated non-owner database denial are verified. Real-time signed-URL expiry was not awaited during this checkpoint.

## Locked Decisions

- Supabase stores metadata and links; private B2 stores media bytes.
- Browser-to-B2 signed transfer remains mandatory.
- Demo and private modes share `WorkspaceData` and `StudioProvider` commands.
- Preview and download URLs are short-lived and purpose-specific.
- Active and trashed media count toward quota.
- Permanent deletion requires trash and explicit confirmation.
- Current owner media is never automatically deleted by lifecycle rules.
- Live configuration and deployment require separate approval.

## Known Risks

- Upload-task state survives route navigation but not a full refresh or browser-process termination.
- Sequential multipart transfer may be slow near the 2 GB maximum.
- Client and server MIME allowlists can drift if only one is updated.
- Permanent deletion spans B2 and PostgreSQL and cannot be transactional across providers; B2 deletion is idempotent so a failed metadata step can be retried.
- Cross-provider deletion remains non-transactional by design; exact provider and database cleanup succeeded during the rehearsal.

## Remaining Verification

- Optionally wait through a real signed-URL expiry and simulate quota rejection before production release.
- Complete the owner's physical-device review with private media.

## Exact Next Implementation Task

When the owner explicitly authorizes the physical-device checkpoint, perform one private-media review on the owner's iPad and phone. Do not add new media infrastructure during that verification.

Do not begin AI-provider execution, the video editor, social analytics, automatic deployment, or production release.

## Remaining Implementation Order

1. Perform the owner's physical-device private-media review as a separate checkpoint.

## Update Rule

Update this file after every meaningful media-lifecycle unit. Replace stale status and next-task text rather than appending a chronological diary. Keep exactly one **Exact Next Implementation Task**.
