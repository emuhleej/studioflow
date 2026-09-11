export const GENERATED_OUTPUT_PART_BYTES = 8 * 1024 * 1024;
export const GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS = 100_000;

export interface StoredGeneratedOutput {
  bytes: number;
  contentType: string;
  generationId: string | null;
}

export interface GeneratedOutputStorage {
  inspect(storageKey: string, signal?: AbortSignal): Promise<StoredGeneratedOutput | null>;
  putObject(input: {
    storageKey: string;
    body: Uint8Array;
    contentType: string;
    generationId: string;
    signal?: AbortSignal;
  }): Promise<void>;
  createMultipart(input: {
    storageKey: string;
    contentType: string;
    generationId: string;
    signal?: AbortSignal;
  }): Promise<{ uploadId: string }>;
  uploadPart(input: {
    storageKey: string;
    uploadId: string;
    partNumber: number;
    body: Uint8Array;
    signal?: AbortSignal;
  }): Promise<{ etag: string }>;
  completeMultipart(input: {
    storageKey: string;
    uploadId: string;
    parts: ReadonlyArray<{ partNumber: number; etag: string }>;
    signal?: AbortSignal;
  }): Promise<void>;
  abortMultipart(input: { storageKey: string; uploadId: string }): Promise<void>;
}

export interface GeneratedOutputTransferClock {
  now(): number;
  deadlineAt: number;
}

export interface GeneratedOutputTransferInput {
  body: ReadableStream<Uint8Array>;
  contentLength: number;
  contentType: string;
  maximumBytes: number;
  storageKey: string;
  generationId: string;
  storage: GeneratedOutputStorage;
  signal?: AbortSignal;
  clock?: GeneratedOutputTransferClock;
}

export interface GeneratedOutputTransferResult {
  reused: boolean;
  verifiedBytes: number;
  uploadedParts: number;
  maximumBufferedBytes: number;
}

class GeneratedOutputTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratedOutputTransferError';
  }
}

interface ReaderState {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  pending: Uint8Array | null;
  pendingOffset: number;
}

function validateInput(input: GeneratedOutputTransferInput): void {
  if (!Number.isSafeInteger(input.contentLength) || input.contentLength <= 0) {
    throw new GeneratedOutputTransferError('Generated output length is invalid.');
  }
  if (!Number.isSafeInteger(input.maximumBytes) || input.maximumBytes <= 0) {
    throw new GeneratedOutputTransferError('Generated output reservation is invalid.');
  }
  if (input.contentLength > input.maximumBytes) {
    throw new GeneratedOutputTransferError('Generated output exceeds its reserved size.');
  }
  if (!input.contentType.trim() || !input.storageKey.trim() || !input.generationId.trim()) {
    throw new GeneratedOutputTransferError('Generated output identity is incomplete.');
  }
  if (
    input.clock &&
    (!Number.isFinite(input.clock.deadlineAt) || !Number.isFinite(input.clock.now()))
  ) {
    throw new GeneratedOutputTransferError('Generated output transfer deadline is invalid.');
  }
}

function assertActive(input: GeneratedOutputTransferInput): void {
  if (
    input.signal?.aborted ||
    (input.clock !== undefined && input.clock.now() >= input.clock.deadlineAt)
  ) {
    throw new GeneratedOutputTransferError('Generated output transfer timed out or was cancelled.');
  }
}

function signalOption(signal: AbortSignal | undefined): { signal?: AbortSignal } {
  return signal ? { signal } : {};
}

async function storageStage<T>(
  input: GeneratedOutputTransferInput,
  failureMessage: string,
  operation: () => Promise<T>
): Promise<T> {
  assertActive(input);
  try {
    return await operation();
  } catch (error) {
    assertActive(input);
    if (error instanceof GeneratedOutputTransferError) throw error;
    throw new GeneratedOutputTransferError(failureMessage);
  }
}

async function inspectStoredOutput(
  input: GeneratedOutputTransferInput
): Promise<StoredGeneratedOutput | null> {
  return storageStage(input, 'Unable to inspect generated output storage.', () =>
    input.storage.inspect(input.storageKey, input.signal)
  );
}

function storedOutputMatches(
  stored: StoredGeneratedOutput,
  input: GeneratedOutputTransferInput
): boolean {
  return (
    stored.bytes === input.contentLength &&
    stored.contentType === input.contentType &&
    stored.generationId === input.generationId
  );
}

async function readChunk(
  input: GeneratedOutputTransferInput,
  state: ReaderState
): Promise<ReadableStreamReadResult<Uint8Array>> {
  assertActive(input);
  try {
    const result = await state.reader.read();
    assertActive(input);
    if (!result.done && !(result.value instanceof Uint8Array)) {
      throw new GeneratedOutputTransferError('Generated output stream returned invalid bytes.');
    }
    return result;
  } catch (error) {
    assertActive(input);
    if (error instanceof GeneratedOutputTransferError) throw error;
    throw new GeneratedOutputTransferError('Generated output stream could not be read.');
  }
}

async function readExactPayload(
  input: GeneratedOutputTransferInput,
  state: ReaderState,
  expectedBytes: number
): Promise<Uint8Array> {
  const payload = new Uint8Array(expectedBytes);
  let written = 0;

  while (written < expectedBytes) {
    assertActive(input);
    if (!state.pending || state.pendingOffset >= state.pending.byteLength) {
      const next = await readChunk(input, state);
      if (next.done) {
        throw new GeneratedOutputTransferError(
          'Generated output length did not match Content-Length.'
        );
      }
      if (next.value.byteLength === 0) continue;
      state.pending = next.value;
      state.pendingOffset = 0;
    }

    const available = state.pending.byteLength - state.pendingOffset;
    const copied = Math.min(available, expectedBytes - written);
    payload.set(state.pending.subarray(state.pendingOffset, state.pendingOffset + copied), written);
    state.pendingOffset += copied;
    written += copied;
  }

  return payload;
}

async function requireStreamEnd(
  input: GeneratedOutputTransferInput,
  state: ReaderState
): Promise<void> {
  if (state.pending && state.pendingOffset < state.pending.byteLength) {
    throw new GeneratedOutputTransferError('Generated output length did not match Content-Length.');
  }

  while (true) {
    const next = await readChunk(input, state);
    if (next.done) return;
    if (next.value.byteLength > 0) {
      throw new GeneratedOutputTransferError(
        'Generated output length did not match Content-Length.'
      );
    }
  }
}

async function cancelReader(state: ReaderState | null): Promise<void> {
  if (!state) return;
  try {
    await state.reader.cancel();
  } catch {
    // The original sanitized transfer failure remains authoritative.
  }
}

async function cancelBody(body: ReadableStream<Uint8Array>): Promise<void> {
  try {
    await body.cancel();
  } catch {
    // The inspection result remains authoritative.
  }
}

async function verifyStoredOutput(input: GeneratedOutputTransferInput): Promise<void> {
  const stored = await inspectStoredOutput(input);
  if (!stored || !storedOutputMatches(stored, input)) {
    throw new GeneratedOutputTransferError('Stored generated output verification failed.');
  }
}

export async function transferGeneratedOutput(
  input: GeneratedOutputTransferInput
): Promise<GeneratedOutputTransferResult> {
  validateInput(input);
  assertActive(input);

  const existing = await inspectStoredOutput(input);
  if (existing) {
    await cancelBody(input.body);
    if (!storedOutputMatches(existing, input)) {
      throw new GeneratedOutputTransferError(
        'Stored generated output conflicts with the expected result.'
      );
    }
    return {
      reused: true,
      verifiedBytes: input.contentLength,
      uploadedParts: 0,
      maximumBufferedBytes: 0,
    };
  }

  let state: ReaderState;
  try {
    state = { reader: input.body.getReader(), pending: null, pendingOffset: 0 };
  } catch {
    throw new GeneratedOutputTransferError('Generated output stream could not be opened.');
  }

  if (input.contentLength <= GENERATED_OUTPUT_PART_BYTES) {
    try {
      const payload = await readExactPayload(input, state, input.contentLength);
      await requireStreamEnd(input, state);
      await storageStage(input, 'Generated output single upload failed.', () =>
        input.storage.putObject({
          storageKey: input.storageKey,
          body: payload,
          contentType: input.contentType,
          generationId: input.generationId,
          ...signalOption(input.signal),
        })
      );
      await verifyStoredOutput(input);
      return {
        reused: false,
        verifiedBytes: input.contentLength,
        uploadedParts: 1,
        maximumBufferedBytes: payload.byteLength,
      };
    } catch (error) {
      await cancelReader(state);
      if (error instanceof GeneratedOutputTransferError) throw error;
      throw new GeneratedOutputTransferError('Generated output transfer failed.');
    } finally {
      state.reader.releaseLock();
    }
  }

  let uploadId: string | null = null;
  let multipartCompleted = false;
  let uploadedParts = 0;
  let maximumBufferedBytes = 0;

  try {
    const created = await storageStage(input, 'Generated output multipart setup failed.', () =>
      input.storage.createMultipart({
        storageKey: input.storageKey,
        contentType: input.contentType,
        generationId: input.generationId,
        ...signalOption(input.signal),
      })
    );
    if (!created.uploadId.trim()) {
      throw new GeneratedOutputTransferError(
        'Generated output multipart setup did not return an upload ID.'
      );
    }
    uploadId = created.uploadId;

    let transferred = 0;
    const parts: Array<{ partNumber: number; etag: string }> = [];
    while (transferred < input.contentLength) {
      const expectedBytes = Math.min(
        GENERATED_OUTPUT_PART_BYTES,
        input.contentLength - transferred
      );
      const payload = await readExactPayload(input, state, expectedBytes);
      maximumBufferedBytes = Math.max(maximumBufferedBytes, payload.byteLength);
      const partNumber = parts.length + 1;
      const uploaded = await storageStage(input, 'Generated output part upload failed.', () =>
        input.storage.uploadPart({
          storageKey: input.storageKey,
          uploadId: uploadId as string,
          partNumber,
          body: payload,
          ...signalOption(input.signal),
        })
      );
      if (!uploaded.etag.trim()) {
        throw new GeneratedOutputTransferError(
          'Generated output part upload did not return an ETag.'
        );
      }
      parts.push({ partNumber, etag: uploaded.etag });
      uploadedParts += 1;
      transferred += payload.byteLength;
    }

    await requireStreamEnd(input, state);
    await storageStage(input, 'Generated output multipart completion failed.', () =>
      input.storage.completeMultipart({
        storageKey: input.storageKey,
        uploadId: uploadId as string,
        parts,
        ...signalOption(input.signal),
      })
    );
    multipartCompleted = true;
    await verifyStoredOutput(input);
    return {
      reused: false,
      verifiedBytes: input.contentLength,
      uploadedParts,
      maximumBufferedBytes,
    };
  } catch (error) {
    await cancelReader(state);
    if (uploadId) {
      try {
        await input.storage.abortMultipart({ storageKey: input.storageKey, uploadId });
      } catch {
        // B2 lifecycle cleanup remains the final fallback for abandoned uploads.
      }
    }
    if (error instanceof GeneratedOutputTransferError) throw error;
    throw new GeneratedOutputTransferError(
      multipartCompleted
        ? 'Stored generated output verification failed.'
        : 'Generated output multipart transfer failed.'
    );
  } finally {
    state.reader.releaseLock();
  }
}
