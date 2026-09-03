import type { AssetKind } from '../types';

export type UploadTaskStatus =
  'queued' | 'uploading' | 'paused' | 'failed' | 'cancelling' | 'cancelled' | 'completed';

export interface UploadTask {
  id: string;
  filename: string;
  bytes: number;
  kind: AssetKind;
  progress: number;
  status: UploadTaskStatus;
  error?: string | undefined;
  assetId?: string;
  createdAt: string;
}

export type UploadTaskEvent =
  | { type: 'start' }
  | { type: 'progress'; progress: number }
  | { type: 'pause' }
  | { type: 'fail'; error: string }
  | { type: 'cancel-requested' }
  | { type: 'cancelled' }
  | { type: 'complete'; assetId: string };

export function createUploadTask(input: {
  id: string;
  filename: string;
  bytes: number;
  kind: AssetKind;
  createdAt: string;
}): UploadTask {
  return { ...input, progress: 0, status: 'queued' };
}

export function transitionUploadTask(task: UploadTask, event: UploadTaskEvent): UploadTask {
  switch (event.type) {
    case 'start':
      if (!['queued', 'paused', 'failed'].includes(task.status)) return task;
      return { ...task, status: 'uploading', error: undefined };
    case 'progress':
      if (task.status !== 'uploading') return task;
      return {
        ...task,
        progress: Math.max(task.progress, Math.min(1, Math.max(0, event.progress))),
      };
    case 'pause':
      return task.status === 'uploading' ? { ...task, status: 'paused' } : task;
    case 'fail':
      if (['completed', 'cancelled'].includes(task.status)) return task;
      return { ...task, status: 'failed', error: event.error };
    case 'cancel-requested':
      if (['completed', 'cancelled', 'cancelling'].includes(task.status)) return task;
      return { ...task, status: 'cancelling', error: undefined };
    case 'cancelled':
      return task.status === 'completed'
        ? task
        : { ...task, status: 'cancelled', error: undefined };
    case 'complete':
      return {
        ...task,
        status: 'completed',
        progress: 1,
        error: undefined,
        assetId: event.assetId,
      };
  }
}
