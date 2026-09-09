# StudioFlow API

StudioFlow does not run a separate application server. Authenticated metadata requests use Supabase's generated PostgREST API, while private media operations use owner-verified Supabase Edge Functions. The React application normally calls both through `@supabase/supabase-js`; the HTTP examples below document the actual network contracts for maintenance and testing.

Use placeholders in documentation and examples. Never paste a real owner UUID, access token, signed media URL, or service-role key into the repository, logs, screenshots, or support messages.

## Base URLs

```text
Metadata: <SUPABASE_URL>/rest/v1
Functions: <SUPABASE_URL>/functions/v1
```

## Health and monitoring

```http
GET <APP_ORIGIN>/health
```

This public route serves the React health page. Its displayed JSON is intentionally limited:

```json
{
  "status": "ok",
  "timestamp": "2026-09-03T12:00:00.000Z",
  "version": "0.1.0"
}
```

The route does not require owner authentication because it does not open the private workspace or expose configuration. It proves only that the deployed client shell can load and render; it does not test Supabase, B2, OAuth, owner authorization, or AI-provider readiness.

## Authentication

The owner signs in with GitHub OAuth through Supabase. Metadata and browser-started function requests require the resulting user access token plus the public anon key:

```http
Authorization: Bearer <USER_ACCESS_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

The anon key identifies the Supabase project; it does not grant access by itself. Row-level security requires the authenticated user to match both the record's `owner_id` and StudioFlow's singleton owner allowlist. Anonymous users and authenticated non-owners are denied.

The browser can verify its own owner status through Supabase RPC:

```http
POST /rest/v1/rpc/current_user_is_app_owner
```

```json
true
```

Do not call privileged internal-generation functions from a browser. They use separate server-only authentication and are outside the production-core API.

## Metadata conventions

- Database fields use `snake_case`; application TypeScript records use `camelCase`.
- UUID and timestamp values below are placeholders.
- Collection reads return JSON arrays.
- Add `Prefer: return=representation` to insert or update requests when the created record is needed in the response.
- Archive and trash operations update `archived_at` or `deleted_at`; they do not bypass the staged-deletion rules.
- Unknown fields must not be discarded from exported workspace packages, but only schema-defined columns may be sent to PostgREST.

## Projects

### List projects

```http
GET /rest/v1/projects?select=id,title,description,accent,created_at,updated_at,archived_at,deleted_at&order=updated_at.desc
```

Example response:

```json
[
  {
    "id": "<project-uuid>",
    "title": "Moonlight Diner",
    "description": "Fictional demo production",
    "accent": "#b894f6",
    "created_at": "2026-09-03T12:00:00.000Z",
    "updated_at": "2026-09-03T12:00:00.000Z",
    "archived_at": null,
    "deleted_at": null
  }
]
```

### Create a project

```http
POST /rest/v1/projects
Prefer: return=representation
```

```json
{
  "owner_id": "<authenticated-user-uuid>",
  "title": "Moonlight Diner",
  "description": "Fictional demo production",
  "accent": "#b894f6"
}
```

The response is a one-item array containing the inserted row. The database rejects an `owner_id` that does not equal the authenticated user.

## Episodes

Episodes belong to a series. Valid statuses are `idea`, `scripting`, `shot_planning`, `generating`, `editing`, `ready`, `published`, and `archived`.

### List episodes for a series

```http
GET /rest/v1/episodes?series_id=eq.<series-uuid>&select=*&order=number.asc
```

Example response:

```json
[
  {
    "id": "<episode-uuid>",
    "owner_id": "<authenticated-user-uuid>",
    "series_id": "<series-uuid>",
    "number": 1,
    "title": "The Missing Pie",
    "idea": "A fictional diner mystery.",
    "status": "idea",
    "target_duration_seconds": 75,
    "tags": ["comedy", "demo"]
  }
]
```

### Create an episode

```http
POST /rest/v1/episodes
Prefer: return=representation
```

```json
{
  "owner_id": "<authenticated-user-uuid>",
  "series_id": "<series-uuid>",
  "number": 2,
  "title": "Closing Time",
  "idea": "A fictional late-night misunderstanding.",
  "status": "idea",
  "target_duration_seconds": 75,
  "tags": ["comedy"]
}
```

## Scenes

Scenes belong to an episode and are ordered by the zero-based `position` column. Valid beats are `hook`, `setup`, `escalation`, `payoff`, `tag`, and `custom`.

### List scenes for an episode

```http
GET /rest/v1/scenes?episode_id=eq.<episode-uuid>&select=*&order=position.asc
```

### Create a scene

```http
POST /rest/v1/scenes
Prefer: return=representation
```

```json
{
  "owner_id": "<authenticated-user-uuid>",
  "episode_id": "<episode-uuid>",
  "title": "Cold open",
  "beat": "hook",
  "summary": "The empty pie stand is discovered.",
  "position": 0,
  "location_id": "<location-entity-uuid>"
}
```

Example response:

```json
[
  {
    "id": "<scene-uuid>",
    "episode_id": "<episode-uuid>",
    "title": "Cold open",
    "beat": "hook",
    "summary": "The empty pie stand is discovered.",
    "position": 0,
    "location_id": "<location-entity-uuid>"
  }
]
```

## Shots

Shots belong to a scene and are ordered by the zero-based `position` column. Valid workflow statuses are `planned`, `generated`, and `selected`.

### List shots for a scene

```http
GET /rest/v1/shots?scene_id=eq.<scene-uuid>&select=*&order=position.asc
```

### Create a shot

```http
POST /rest/v1/shots
Prefer: return=representation
```

```json
{
  "owner_id": "<authenticated-user-uuid>",
  "scene_id": "<scene-uuid>",
  "title": "Reveal the empty stand",
  "position": 0,
  "duration_seconds": 4.5,
  "framing": "Medium close-up",
  "action": "The cook lifts the empty cover.",
  "dialogue": "Where did it go?",
  "prompt": "Fictional cinematic diner scene",
  "status": "planned",
  "character_ids": ["<character-entity-uuid>"],
  "asset_ids": []
}
```

Example response:

```json
[
  {
    "id": "<shot-uuid>",
    "scene_id": "<scene-uuid>",
    "title": "Reveal the empty stand",
    "position": 0,
    "duration_seconds": 4.5,
    "status": "planned"
  }
]
```

## Media

Asset metadata lives in PostgreSQL, while private image, audio, and video bytes live in Backblaze B2. New uploads must begin through an Edge Function so StudioFlow can enforce file type, size, owner access, and the 9 GB safety cap. Do not insert upload asset metadata directly and then invent a storage URL.

### List asset metadata

```http
GET /rest/v1/assets?project_id=eq.<project-uuid>&select=*&order=created_at.desc
```

RLS restricts the response to the owner. This endpoint never returns B2 credentials or a playable URL.

### Start an upload

```http
POST /functions/v1/media-upload-start
```

```json
{
  "filename": "fictional-reference.png",
  "bytes": 2048,
  "mimeType": "image/png",
  "projectId": "<project-uuid>",
  "episodeId": "<episode-uuid>",
  "kind": "image"
}
```

Small-file response:

```json
{
  "asset": {
    "id": "<asset-uuid>",
    "projectId": "<project-uuid>",
    "episodeId": "<episode-uuid>",
    "kind": "image",
    "filename": "fictional-reference.png",
    "mimeType": "image/png",
    "bytes": 2048,
    "reviewStatus": "unreviewed",
    "source": "upload"
  },
  "mode": "single",
  "uploadUrl": "<short-lived-signed-b2-url>"
}
```

The browser uploads the exact file bytes directly to `uploadUrl` with `PUT`, then calls `media-upload-complete` with the asset ID. Multipart responses return `mode: "multipart"`, `uploadId`, and `partSize`; each part URL comes from `media-upload-part`.

### Resume or cancel an upload

```http
POST /functions/v1/media-upload-resume
```

```json
{ "assetId": "<asset-uuid>" }
```

A multipart response includes the stored upload ID, part size, and completed parts so the browser sends only missing parts.

```http
POST /functions/v1/media-upload-cancel
```

```json
{ "assetId": "<asset-uuid>" }
```

Cancellation aborts unfinished multipart state and removes orphaned metadata. A completed upload must instead move through trash before permanent deletion.

### Complete an upload

Single upload:

```http
POST /functions/v1/media-upload-complete
```

```json
{ "assetId": "<asset-uuid>" }
```

Multipart upload:

```json
{
  "assetId": "<asset-uuid>",
  "uploadId": "<multipart-upload-id>",
  "parts": [{ "ETag": "<part-etag>", "PartNumber": 1 }]
}
```

Successful response:

```json
{ "completed": true }
```

### Create a private preview or download URL

```http
POST /functions/v1/media-url
```

```json
{
  "assetId": "<asset-uuid>",
  "disposition": "inline"
}
```

```json
{
  "url": "<short-lived-signed-b2-url>",
  "expiresInSeconds": 600
}
```

Use `attachment` instead of `inline` for a download. The signed URL is sensitive and temporary; do not persist or log it.

### Permanently delete media

The asset must already have a non-null `deleted_at` trash timestamp.

```http
POST /functions/v1/media-delete
```

```json
{ "assetId": "<asset-uuid>" }
```

```json
{ "deleted": true }
```

## Errors

PostgREST errors follow Supabase's standard error format. StudioFlow Edge Functions return an appropriate `400`, `401`, `403`, or `404` status with a bounded message:

```json
{
  "error": "Media asset not found."
}
```

Do not expose raw provider responses, signed URLs, form values, prompts, scripts, or media contents in user-facing error messages or client-error records.
