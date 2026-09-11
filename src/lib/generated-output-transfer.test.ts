import { describe, expect, it } from 'vitest';
import {
  GENERATED_OUTPUT_PART_BYTES,
  GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS,
  type GeneratedOutputStorage,
  type GeneratedOutputTransferClock,
  type GeneratedOutputTransferInput,
  type StoredGeneratedOutput,
  transferGeneratedOutput,
} from './generated-output-transfer';

const storageKey = 'owners/owner/media/generation/result.mp4';
const generationId = 'generation-fixture';
const contentType = 'video/mp4';

function patternByte(offset: number): number {
  return (offset * 31 + 17) % 251;
}

function addDigest(current: number, bytes: Uint8Array): number {
  let digest = current;
  for (const byte of bytes) digest = (digest * 33 + byte) >>> 0;
  return digest;
}

function expectedDigest(bytes: number): number {
  let digest = 0;
  for (let index = 0; index < bytes; index += 1) {
    digest = (digest * 33 + patternByte(index)) >>> 0;
  }
  return digest;
}

function patternedStream(
  emittedBytes: number,
  chunkSizes: readonly number[] = [64 * 1024],
  errorAt?: number
): ReadableStream<Uint8Array> {
  let offset = 0;
  let chunkIndex = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (errorAt !== undefined && offset >= errorAt) {
        controller.error(new Error('https://temporary.example/private?credential=secret'));
        return;
      }
      if (offset >= emittedBytes) {
        controller.close();
        return;
      }
      const requested = chunkSizes[chunkIndex % chunkSizes.length] ?? 1;
      const chunkBytes = Math.min(requested, emittedBytes - offset);
      const chunk = new Uint8Array(chunkBytes);
      for (let index = 0; index < chunkBytes; index += 1) {
        chunk[index] = patternByte(offset + index);
      }
      offset += chunkBytes;
      chunkIndex += 1;
      controller.enqueue(chunk);
    },
  });
}

class FakeStorage implements GeneratedOutputStorage {
  object: StoredGeneratedOutput | null = null;
  inspectCalls = 0;
  putCalls = 0;
  createCalls = 0;
  uploadCalls = 0;
  completeCalls = 0;
  abortCalls = 0;
  activePartUploads = 0;
  maximumActivePartUploads = 0;
  maximumPayloadBytes = 0;
  partNumbers: number[] = [];
  partSizes: number[] = [];
  uploadedDigest = 0;
  uploadedBytes = 0;
  failPartNumber: number | null = null;
  missingEtagPartNumber: number | null = null;
  failCompletion = false;
  postVerificationMismatch = false;
  afterCreate: (() => void) | null = null;
  private multipartContentType = '';
  private multipartGenerationId = '';

  async inspect() {
    this.inspectCalls += 1;
    return this.object;
  }

  async putObject(input: {
    storageKey: string;
    body: Uint8Array;
    contentType: string;
    generationId: string;
    signal?: AbortSignal;
  }) {
    this.putCalls += 1;
    this.maximumPayloadBytes = Math.max(this.maximumPayloadBytes, input.body.byteLength);
    this.uploadedBytes = input.body.byteLength;
    this.uploadedDigest = addDigest(0, input.body);
    this.object = {
      bytes: this.postVerificationMismatch ? input.body.byteLength + 1 : input.body.byteLength,
      contentType: input.contentType,
      generationId: input.generationId,
    };
  }

  async createMultipart(input: {
    storageKey: string;
    contentType: string;
    generationId: string;
    signal?: AbortSignal;
  }) {
    this.createCalls += 1;
    this.multipartContentType = input.contentType;
    this.multipartGenerationId = input.generationId;
    this.afterCreate?.();
    return { uploadId: 'private-upload-identifier' };
  }

  async uploadPart(input: {
    storageKey: string;
    uploadId: string;
    partNumber: number;
    body: Uint8Array;
    signal?: AbortSignal;
  }) {
    this.uploadCalls += 1;
    this.activePartUploads += 1;
    this.maximumActivePartUploads = Math.max(this.maximumActivePartUploads, this.activePartUploads);
    try {
      await Promise.resolve();
      if (input.partNumber === this.failPartNumber) {
        throw new Error(
          'upload private-upload-identifier failed at https://storage.example with credential=secret'
        );
      }
      this.partNumbers.push(input.partNumber);
      this.partSizes.push(input.body.byteLength);
      this.maximumPayloadBytes = Math.max(this.maximumPayloadBytes, input.body.byteLength);
      this.uploadedBytes += input.body.byteLength;
      this.uploadedDigest = addDigest(this.uploadedDigest, input.body);
      return {
        etag: input.partNumber === this.missingEtagPartNumber ? '' : `etag-${input.partNumber}`,
      };
    } finally {
      this.activePartUploads -= 1;
    }
  }

  async completeMultipart() {
    this.completeCalls += 1;
    if (this.failCompletion) throw new Error('private completion details');
    this.object = {
      bytes: this.postVerificationMismatch ? this.uploadedBytes + 1 : this.uploadedBytes,
      contentType: this.multipartContentType,
      generationId: this.multipartGenerationId,
    };
  }

  async abortMultipart() {
    this.abortCalls += 1;
  }
}

function transferInput(options: {
  declaredBytes: number;
  storage: FakeStorage;
  emittedBytes?: number;
  chunkSizes?: readonly number[];
  errorAt?: number;
  maximumBytes?: number;
  signal?: AbortSignal;
  clock?: GeneratedOutputTransferClock;
}): GeneratedOutputTransferInput {
  const emittedBytes = options.emittedBytes ?? options.declaredBytes;
  return {
    body: patternedStream(emittedBytes, options.chunkSizes, options.errorAt),
    contentLength: options.declaredBytes,
    contentType,
    maximumBytes: options.maximumBytes ?? options.declaredBytes,
    storageKey,
    generationId,
    storage: options.storage,
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.clock ? { clock: options.clock } : {}),
  };
}

describe('generated output transfer', () => {
  it('uses one bounded upload for a small exact-length result', async () => {
    const storage = new FakeStorage();
    const result = await transferGeneratedOutput(
      transferInput({ declaredBytes: 1024, storage, chunkSizes: [13, 127, 7] })
    );

    expect(result).toEqual({
      reused: false,
      verifiedBytes: 1024,
      uploadedParts: 1,
      maximumBufferedBytes: 1024,
    });
    expect(storage.putCalls).toBe(1);
    expect(storage.createCalls).toBe(0);
    expect(storage.uploadedDigest).toBe(expectedDigest(1024));
  });

  it('reconstructs irregular chunks into ordered sequential 8 MiB parts', async () => {
    const storage = new FakeStorage();
    const bytes = GENERATED_OUTPUT_PART_BYTES * 2 + 257;
    const result = await transferGeneratedOutput(
      transferInput({
        declaredBytes: bytes,
        storage,
        chunkSizes: [3, 65_537, 1_000_003, 19],
      })
    );

    expect(storage.partNumbers).toEqual([1, 2, 3]);
    expect(storage.partSizes).toEqual([
      GENERATED_OUTPUT_PART_BYTES,
      GENERATED_OUTPUT_PART_BYTES,
      257,
    ]);
    expect(storage.maximumActivePartUploads).toBe(1);
    expect(storage.uploadedDigest).toBe(expectedDigest(bytes));
    expect(result).toEqual({
      reused: false,
      verifiedBytes: bytes,
      uploadedParts: 3,
      maximumBufferedBytes: GENERATED_OUTPUT_PART_BYTES,
    });
  });

  it('rejects a result above its reservation before storage begins', async () => {
    const storage = new FakeStorage();
    await expect(
      transferGeneratedOutput(transferInput({ declaredBytes: 2_000, maximumBytes: 1_999, storage }))
    ).rejects.toThrow('exceeds its reserved size');
    expect(storage.inspectCalls).toBe(0);
  });

  it('rejects shortened and additional bytes before a single upload', async () => {
    const shortenedStorage = new FakeStorage();
    await expect(
      transferGeneratedOutput(
        transferInput({ declaredBytes: 1024, emittedBytes: 1023, storage: shortenedStorage })
      )
    ).rejects.toThrow('did not match Content-Length');
    expect(shortenedStorage.putCalls).toBe(0);

    const additionalStorage = new FakeStorage();
    await expect(
      transferGeneratedOutput(
        transferInput({ declaredBytes: 1024, emittedBytes: 1025, storage: additionalStorage })
      )
    ).rejects.toThrow('did not match Content-Length');
    expect(additionalStorage.putCalls).toBe(0);
  });

  it('aborts multipart storage when the provider stream fails', async () => {
    const storage = new FakeStorage();
    const bytes = GENERATED_OUTPUT_PART_BYTES + 1;
    await expect(
      transferGeneratedOutput(
        transferInput({ declaredBytes: bytes, storage, errorAt: GENERATED_OUTPUT_PART_BYTES })
      )
    ).rejects.toThrow('stream could not be read');
    expect(storage.uploadCalls).toBe(1);
    expect(storage.abortCalls).toBe(1);
    expect(storage.completeCalls).toBe(0);
  });

  it('aborts after a failed part and never completes', async () => {
    const storage = new FakeStorage();
    storage.failPartNumber = 1;
    await expect(
      transferGeneratedOutput(
        transferInput({ declaredBytes: GENERATED_OUTPUT_PART_BYTES + 1, storage })
      )
    ).rejects.toThrow('part upload failed');
    expect(storage.abortCalls).toBe(1);
    expect(storage.completeCalls).toBe(0);
  });

  it('aborts when a part has no ETag', async () => {
    const storage = new FakeStorage();
    storage.missingEtagPartNumber = 1;
    await expect(
      transferGeneratedOutput(
        transferInput({ declaredBytes: GENERATED_OUTPUT_PART_BYTES + 1, storage })
      )
    ).rejects.toThrow('did not return an ETag');
    expect(storage.abortCalls).toBe(1);
    expect(storage.completeCalls).toBe(0);
  });

  it('fails closed when completion fails or the completed object does not verify', async () => {
    const completionStorage = new FakeStorage();
    completionStorage.failCompletion = true;
    await expect(
      transferGeneratedOutput(
        transferInput({
          declaredBytes: GENERATED_OUTPUT_PART_BYTES + 1,
          storage: completionStorage,
        })
      )
    ).rejects.toThrow('multipart completion failed');
    expect(completionStorage.abortCalls).toBe(1);

    const mismatchStorage = new FakeStorage();
    mismatchStorage.postVerificationMismatch = true;
    await expect(
      transferGeneratedOutput(
        transferInput({ declaredBytes: GENERATED_OUTPUT_PART_BYTES + 1, storage: mismatchStorage })
      )
    ).rejects.toThrow('verification failed');
    expect(mismatchStorage.completeCalls).toBe(1);
    expect(mismatchStorage.abortCalls).toBe(1);
  });

  it('reuses an exact existing object without uploading', async () => {
    const storage = new FakeStorage();
    storage.object = { bytes: 4096, contentType, generationId };
    const result = await transferGeneratedOutput(transferInput({ declaredBytes: 4096, storage }));

    expect(result).toEqual({
      reused: true,
      verifiedBytes: 4096,
      uploadedParts: 0,
      maximumBufferedBytes: 0,
    });
    expect(storage.putCalls).toBe(0);
    expect(storage.createCalls).toBe(0);
  });

  it('refuses to overwrite a conflicting existing object', async () => {
    const storage = new FakeStorage();
    storage.object = { bytes: 4097, contentType, generationId };
    await expect(
      transferGeneratedOutput(transferInput({ declaredBytes: 4096, storage }))
    ).rejects.toThrow('conflicts');
    expect(storage.putCalls).toBe(0);
    expect(storage.createCalls).toBe(0);
  });

  it('stops at the injected deadline and attempts multipart cleanup', async () => {
    const storage = new FakeStorage();
    let now = 0;
    storage.afterCreate = () => {
      now = GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS;
    };
    await expect(
      transferGeneratedOutput(
        transferInput({
          declaredBytes: GENERATED_OUTPUT_PART_BYTES + 1,
          storage,
          clock: { now: () => now, deadlineAt: GENERATED_OUTPUT_TRANSFER_TIMEOUT_MS },
        })
      )
    ).rejects.toThrow('timed out or was cancelled');
    expect(storage.abortCalls).toBe(1);
    expect(storage.uploadCalls).toBe(0);
  });

  it('never exposes private adapter details in a transfer error', async () => {
    const storage = new FakeStorage();
    storage.failPartNumber = 1;
    let message = '';
    try {
      await transferGeneratedOutput(
        transferInput({ declaredBytes: GENERATED_OUTPUT_PART_BYTES + 1, storage })
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe('Generated output part upload failed.');
    expect(message).not.toContain('temporary.example');
    expect(message).not.toContain('storage.example');
    expect(message).not.toContain('credential');
    expect(message).not.toContain('private-upload-identifier');
  });
});
