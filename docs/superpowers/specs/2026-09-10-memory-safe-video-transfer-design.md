# Memory-Safe Generated-Video Transfer Design

Date: 2026-09-10  
Status: Conversational design approved; written specification awaiting owner review

## Purpose

Replace StudioFlow's still-image-only full-buffer ingest with a bounded transfer path suitable for the first owner-approved five-second Runway video. The transfer must copy one validated provider result into private Backblaze B2 without loading the complete video into Supabase Edge Function memory.

This design preserves the existing provider-neutral lifecycle, database reservations, deterministic storage keys, private-media rules, and exactly-once metadata completion.

## Scope

The first implementation supports:

- One five-second Runway video result.
- The existing 200,000,000-byte video output reservation.
- Application-owned buffers no larger than 8 MiB.
- Sequential B2 S3-compatible multipart upload.
- A bounded single-upload path for results no larger than 8 MiB.
- Safe retry when the B2 object completed but the database transaction did not.
- Mocked local verification without a Runway request, Supabase deployment, or B2 write.

## Explicitly Out of Scope

- Ten-second videos.
- Increasing the existing 200 MB reservation.
- Parallel part uploads.
- Persisting provider output URLs or signed input URLs.
- Persisting multipart upload state in PostgreSQL.
- Resuming a partially uploaded B2 multipart object across Edge invocations.
- A new transfer service, queue, storage provider, or Cloudflare resource.
- Browser changes, database migrations, provider requests, credit use, function deployment, Netlify deployment, or production release.

## Constraints

- Supabase hosted Edge Functions currently provide 256 MB memory, a 150-second free-plan wall-clock limit, and a two-second CPU budget per request.
- Backblaze B2 multipart parts must be at least 5 MB except for the final part. The selected 8 MiB part size satisfies that rule.
- The existing generated-output boundary requires an exact approved HTTPS host, no credentials in the URL, no redirects, a direct HTTP 200 response, an approved MIME type, a valid `Content-Length`, and a length no greater than the persisted reservation.
- The Edge Function, database, browser, exports, logs, tests, and documentation must never expose or persist the temporary provider URL.
- `generation_enabled` remains false except during a separately approved provider submission. Ingest retries reuse the stored provider job and cannot create a new provider request.
- B2's existing lifecycle rule remains the last-resort cleanup for multipart uploads abandoned by forced worker termination.

References:

- [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- [Backblaze B2 large files](https://www.backblaze.com/docs/cloud-storage-large-files)
- [Backblaze S3 multipart initiation](https://www.backblaze.com/apidocs/s3-create-multipart-upload)

## Chosen Approach

Use one provider-neutral transfer orchestrator with a narrow storage adapter. The orchestrator reads the validated `ReadableStream` with backpressure, fills one fixed-size buffer, uploads that part, releases it, and then reads the next part. Uploads remain sequential so multiple part bodies are never retained concurrently.

Files no larger than 8 MiB use one bounded `PutObject` call. Larger files use `CreateMultipartUpload`, sequential `UploadPart` calls, `CompleteMultipartUpload`, and `HeadObject` verification. Any ordinary failure after multipart creation attempts `AbortMultipartUpload`.

This approach is preferred over cross-invocation range downloads because it does not assume the temporary Runway URL supports byte ranges, does not add database state, and is sufficient for the deliberately limited five-second gate. It is preferred over a new transfer service because StudioFlow does not yet need another provider or paid infrastructure surface.

## Components

### Provider-neutral transfer orchestrator

Create `src/lib/generated-output-transfer.ts`. It owns only byte transfer and verification rules. It must not know about Runway URLs, Supabase clients, owner records, or credentials.

Its public input contains:

- a validated `ReadableStream<Uint8Array>`;
- the declared content length and MIME type;
- the persisted maximum byte reservation;
- the deterministic storage key and generation identity;
- an injected storage adapter;
- an abort signal and injectable clock for deadline tests.

Its result reports whether an existing object was reused, the verified byte count, the number of uploaded parts, and the largest application-owned payload buffer. These values remain internal and contain no URL or credential.

### B2 storage adapter

Create `supabase/functions/_shared/generated-output-storage.ts`. It implements the provider-neutral adapter using the existing configured B2 S3 client and these commands:

- `HeadObjectCommand`
- `PutObjectCommand`
- `CreateMultipartUploadCommand`
- `UploadPartCommand`
- `CompleteMultipartUploadCommand`
- `AbortMultipartUploadCommand`

The adapter sets the approved content type and private generation-identity metadata when creating the object. It requires an ETag from every uploaded part and passes only ordered part numbers and ETags to completion.

### Existing output validator

Update `supabase/functions/_shared/generated-output.ts` only as needed to pass an abort signal into the provider fetch while retaining every current URL, redirect, type, declared-length, and streaming-overrun check.

### Generation ingest integration

Update `supabase/functions/generation-ingest/index.ts` to remove the complete-response `arrayBuffer()` conversion. It continues to:

1. authenticate the internal caller;
2. load the stored generation and provider job;
3. retrieve the temporary provider URL in memory;
4. validate and open the provider result;
5. calculate the deterministic filename and private storage key;
6. call the transfer orchestrator;
7. call `complete_generation_ingest` only after storage verification succeeds.

No caller-supplied URL, storage key, owner ID, provider job ID, or output metadata is accepted.

## Data Flow

```text
stored generation ID
  -> server reloads generation/provider context
  -> Runway status returns temporary URL in memory
  -> exact-host/no-redirect/size/type validation
  -> deterministic private B2 key
  -> inspect existing object
     -> exact match: reuse
     -> conflict: fail closed
     -> absent and <= 8 MiB: bounded single upload
     -> absent and > 8 MiB: sequential 8 MiB multipart upload
  -> verify completed B2 object
  -> atomic database asset/link/cost completion
```

The provider response is consumed once with backpressure. The orchestrator does not prefetch the full response or retain uploaded parts. The 8 MiB limit applies to application-owned payload buffers; the Edge runtime and network stack may maintain their own small internal buffers.

## Multipart Rules

- Part size is exactly 8 MiB except for the final part.
- Parts upload sequentially with one active `UploadPart` operation.
- Part numbers begin at one and increase without gaps.
- Every non-final part must contain 8 MiB.
- The final part must contain at least one byte.
- Completion is forbidden unless the total bytes read equal the declared `Content-Length` exactly.
- Reading fewer bytes, reading additional bytes, a missing ETag, an upload error, or a completion error fails the transfer.
- The number of parts is naturally bounded by the 200 MB reservation.

## Identity and Idempotency

The existing deterministic storage key remains based on owner ID, generation ID, and deterministic filename. New B2 object metadata identifies the StudioFlow generation without exposing prompt, owner, provider URL, or private content.

Before writing, the adapter performs `HeadObject` on the exact key:

- No object: begin the bounded upload.
- Matching generation metadata, MIME type, and byte length: reuse the object and proceed to database completion.
- Any mismatch: fail closed and require manual review. Do not overwrite or create another version.

After a successful single or multipart upload, perform another `HeadObject`. Database completion may proceed only when generation metadata, MIME type, and byte length match exactly.

This closes the retry gap where B2 completed successfully but `complete_generation_ingest` failed or the worker ended before the database response. The database completion function remains independently idempotent and creates at most one asset, one canonical link, and one generation-linked cost entry.

## Deadline and Cancellation

Create one overall transfer abort signal with a 100-second deadline, leaving time inside Supabase's 150-second free-plan limit for cleanup and database completion. Pass it to the provider fetch and every ordinary B2 operation.

If the deadline or another error occurs after multipart initiation:

1. stop reading the provider stream;
2. attempt `AbortMultipartUpload` with a separate short cleanup signal;
3. return a sanitized retryable ingest failure;
4. leave the generation record on its existing recovery path.

If forced termination prevents aborting, B2's existing three-day abandoned-multipart lifecycle cleanup applies. A retry starts a fresh multipart upload and reuses a previously completed matching object when one exists.

No failure path may submit or retry a provider generation request.

## Error Handling and Privacy

Errors returned or logged describe only the failed stage, such as validation, provider read, part upload, storage verification, or database completion. They must not include:

- provider or signed URLs;
- request or authorization headers;
- B2 credentials or upload authorization;
- storage endpoints;
- prompt text or media contents;
- owner or private record identifiers.

An abort-cleanup failure may produce one generic diagnostic event. It does not replace the original failure and must not expose the multipart upload identifier.

## Testing

Create `src/lib/generated-output-transfer.test.ts` with injected stream and storage fakes. The fake storage adapter records byte counts and concurrency but does not retain all uploaded content.

Required cases:

1. A small result uses the single-upload path and remains within the 8 MiB bound.
2. A larger result uses the expected ordered multipart sizes.
3. Irregular source chunk boundaries reconstruct the exact declared byte sequence.
4. At most one part upload is active.
5. The largest application-owned payload buffer never exceeds 8 MiB.
6. A result above the persisted reservation is rejected before storage begins.
7. Missing, shortened, or additional bytes fail before completion.
8. A provider-stream error aborts an initiated multipart upload.
9. A failed part or missing ETag aborts and never completes.
10. A completion or post-upload verification mismatch fails closed.
11. An exact existing object is reused without uploading.
12. A conflicting existing object is rejected without overwrite.
13. The 100-second deadline stops work and attempts cleanup.
14. Error messages contain no URL, credential, upload identifier, or private record value.
15. Existing generated-image validation, Runway adapter, ingest lifecycle, and idempotency tests remain passing.

The complete source verification is:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:production-guard
npm run build
git diff --check
```

Playwright is not required because this design changes no interface or browser workflow. pgTAP is not required because it changes no database schema, function, grant, trigger, or policy.

## Acceptance Criteria

The source implementation is complete when:

- the ingest function contains no complete-video `arrayBuffer()` or equivalent full-file materialization;
- the orchestrator retains no more than one 8 MiB application payload buffer;
- multipart uploads are sequential, exact-length, abortable, and post-verified;
- matching completed objects are reused and conflicts fail closed;
- every required local test and repository check passes;
- existing still-image behavior remains covered and passing;
- affected architecture, security, setup, feature-state, build, and function documentation is synchronized;
- the feature checkpoint says `source-tested; hosted verification pending`;
- no external provider or deployment action occurred.

## Later Hosted Verification Gate

Source completion does not authorize deployment. A later, separately approved gate may:

1. deploy only the updated `generation-ingest` function and its bundled shared dependencies;
2. reconfirm HTTP 401 denial without internal authentication;
3. reconfirm `generation_enabled=false` and zero active/uncertain jobs;
4. perform an explicitly approved bounded B2 compatibility rehearsal or combine that verification with the separately price-approved first five-second Runway video;
5. verify private preview, exact storage size, one asset/link/cost, released reservations, and no duplicate object version;
6. stop with generation disabled and scheduled reconciliation inactive.

AI-4 provider submission still requires a separate current-price check and exact maximum-credit approval. This design grants no authority to spend credits.

## Locked Decisions

- Five-second video only for the first gate.
- Existing 200 MB video reservation remains unchanged.
- 8 MiB sequential parts; no parallelism.
- One provider-neutral orchestrator plus one Edge-only B2 adapter.
- No provider URL, multipart ID, or storage credential persistence.
- No database migration or cross-invocation multipart resume in this version.
- Deterministic object identity, exact-match reuse, and conflict refusal.
- A 100-second transfer deadline with best-effort explicit abort and lifecycle cleanup fallback.
- Local mock testing precedes any separately approved hosted verification.
