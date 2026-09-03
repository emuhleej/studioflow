import type { Asset, AssetKind } from '../types';
import { supabase } from './supabase';

export interface CompletedUploadPart {
  ETag: string;
  PartNumber: number;
}

export interface RemoteUploadSession {
  asset: Asset;
  mode: 'single' | 'multipart';
  uploadId?: string | undefined;
  uploadUrl?: string | undefined;
  partSize?: number | undefined;
  completedParts: CompletedUploadPart[];
  completed?: boolean | undefined;
}

interface StartUploadResponse {
  asset: Asset;
  mode: 'single' | 'multipart';
  uploadId?: string;
  uploadUrl?: string;
  partSize?: number;
}

interface ResumeUploadResponse {
  mode: 'single' | 'multipart';
  state: 'started' | 'uploading' | 'completed' | 'cancelled' | 'failed';
  uploadId?: string;
  uploadUrl?: string;
  partSize?: number;
  completedParts?: CompletedUploadPart[];
  completed?: boolean;
}

function abortError(): DOMException {
  return new DOMException('The upload was paused or cancelled.', 'AbortError');
}

export function isUploadAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function putWithProgress(
  url: string,
  body: Blob,
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;

    const abortRequest = () => request.abort();
    const cleanup = () => signal.removeEventListener('abort', abortRequest);
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    request.open('PUT', url);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener('load', () => {
      finish(() => {
        if (request.status >= 200 && request.status < 300)
          resolve(request.getResponseHeader('etag'));
        else reject(new Error(`Upload failed with status ${request.status}.`));
      });
    });
    request.addEventListener('error', () =>
      finish(() => reject(new Error('The upload connection failed.')))
    );
    request.addEventListener('abort', () => finish(() => reject(abortError())));
    signal.addEventListener('abort', abortRequest, { once: true });

    if (signal.aborted) {
      abortRequest();
      return;
    }
    request.send(body);
  });
}

export function getMultipartPlan(
  fileSize: number,
  partSize: number,
  completedParts: CompletedUploadPart[]
): { partCount: number; pendingPartNumbers: number[]; completedBytes: number } {
  const partCount = Math.ceil(fileSize / partSize);
  const completedNumbers = new Set(
    completedParts
      .map((part) => part.PartNumber)
      .filter(
        (partNumber) => Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= partCount
      )
  );
  const pendingPartNumbers: number[] = [];
  let completedBytes = 0;

  for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
    const offset = (partNumber - 1) * partSize;
    const bytes = Math.min(partSize, fileSize - offset);
    if (completedNumbers.has(partNumber)) completedBytes += bytes;
    else pendingPartNumbers.push(partNumber);
  }

  return { partCount, pendingPartNumbers, completedBytes };
}

export async function startRemoteMediaUpload(
  file: File,
  projectId: string,
  episodeId: string | undefined,
  kind: AssetKind
): Promise<RemoteUploadSession> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.functions.invoke<StartUploadResponse>(
    'media-upload-start',
    {
      body: {
        filename: file.name,
        bytes: file.size,
        mimeType: file.type,
        projectId,
        episodeId,
        kind,
      },
    }
  );
  if (error || !data) throw error ?? new Error('Upload could not be started.');
  return { ...data, completedParts: [] };
}

export async function resumeRemoteMediaUpload(
  session: RemoteUploadSession
): Promise<RemoteUploadSession> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.functions.invoke<ResumeUploadResponse>(
    'media-upload-resume',
    {
      body: { assetId: session.asset.id },
    }
  );
  if (error || !data) throw error ?? new Error('Upload could not be resumed.');
  if (data.state === 'cancelled') throw new Error('This upload was cancelled.');
  return {
    asset: session.asset,
    mode: data.mode,
    uploadId: data.uploadId,
    uploadUrl: data.uploadUrl,
    partSize: data.partSize,
    completedParts: data.completedParts ?? [],
    completed: data.completed ?? data.state === 'completed',
  };
}

export async function transferRemoteMediaUpload(
  session: RemoteUploadSession,
  file: File,
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  throwIfAborted(signal);
  if (session.completed) {
    onProgress(1);
    return;
  }

  if (session.mode === 'single') {
    if (!session.uploadUrl) throw new Error('The upload URL is missing.');
    await putWithProgress(session.uploadUrl, file, onProgress, signal);
    throwIfAborted(signal);
    const { error } = await supabase.functions.invoke('media-upload-complete', {
      body: { assetId: session.asset.id },
    });
    if (error) throw error;
    onProgress(1);
    return;
  }

  if (!session.uploadId || !session.partSize)
    throw new Error('Multipart upload details are missing.');
  const plan = getMultipartPlan(file.size, session.partSize, session.completedParts);
  const parts = [...session.completedParts].filter(
    (part) => part.ETag && part.PartNumber >= 1 && part.PartNumber <= plan.partCount
  );
  let completedBytes = plan.completedBytes;
  onProgress(completedBytes / file.size);

  for (const partNumber of plan.pendingPartNumbers) {
    throwIfAborted(signal);
    const offset = (partNumber - 1) * session.partSize;
    const chunk = file.slice(offset, Math.min(file.size, offset + session.partSize));
    const { data, error } = await supabase.functions.invoke<{ uploadUrl: string }>(
      'media-upload-part',
      {
        body: { assetId: session.asset.id, uploadId: session.uploadId, partNumber },
      }
    );
    if (error || !data) throw error ?? new Error('An upload part could not be signed.');
    throwIfAborted(signal);
    const etag = await putWithProgress(
      data.uploadUrl,
      chunk,
      (partProgress) => onProgress((completedBytes + chunk.size * partProgress) / file.size),
      signal
    );
    if (!etag) throw new Error('The media provider did not return an ETag.');
    parts.push({ ETag: etag.replaceAll('"', ''), PartNumber: partNumber });
    completedBytes += chunk.size;
    onProgress(completedBytes / file.size);
  }

  throwIfAborted(signal);
  const { error } = await supabase.functions.invoke('media-upload-complete', {
    body: {
      assetId: session.asset.id,
      uploadId: session.uploadId,
      parts: parts.sort((left, right) => left.PartNumber - right.PartNumber),
    },
  });
  if (error) throw error;
  onProgress(1);
}

export async function uploadMediaToB2(
  file: File,
  projectId: string,
  episodeId: string | undefined,
  kind: AssetKind,
  onProgress: (progress: number) => void
): Promise<Asset> {
  const session = await startRemoteMediaUpload(file, projectId, episodeId, kind);
  await transferRemoteMediaUpload(session, file, onProgress, new AbortController().signal);
  return session.asset;
}

export async function cancelRemoteMediaUpload(assetId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('media-upload-cancel', { body: { assetId } });
  if (error) throw error;
}

export interface RemoteAssetAccess {
  url: string;
  expiresInSeconds: number;
}

export async function getRemoteAssetAccess(
  assetId: string,
  disposition: 'inline' | 'attachment' = 'inline'
): Promise<RemoteAssetAccess> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke<RemoteAssetAccess>('media-url', {
    body: { assetId, disposition },
  });
  if (error || !data) throw error ?? new Error('A media preview URL could not be created.');
  return data;
}

export async function getRemoteAssetUrl(assetId: string): Promise<string> {
  return (await getRemoteAssetAccess(assetId)).url;
}

export async function deleteRemoteAsset(assetId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('media-delete', { body: { assetId } });
  if (error) throw error;
}
