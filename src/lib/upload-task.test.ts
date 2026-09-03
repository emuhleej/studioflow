import { describe, expect, it } from 'vitest';
import { getMultipartPlan } from './media-upload';
import { createUploadTask, transitionUploadTask } from './upload-task';

const task = () =>
  createUploadTask({
    id: 'task-1',
    filename: 'episode.mp4',
    bytes: 100,
    kind: 'video',
    createdAt: '2026-09-01T00:00:00.000Z',
  });

describe('upload task lifecycle', () => {
  it('moves through upload, pause, resume, and completion', () => {
    const uploading = transitionUploadTask(task(), { type: 'start' });
    const progressed = transitionUploadTask(uploading, { type: 'progress', progress: 0.42 });
    const paused = transitionUploadTask(progressed, { type: 'pause' });
    const resumed = transitionUploadTask(paused, { type: 'start' });
    const completed = transitionUploadTask(resumed, { type: 'complete', assetId: 'asset-1' });

    expect(progressed.progress).toBe(0.42);
    expect(paused.status).toBe('paused');
    expect(resumed).toMatchObject({ status: 'uploading', progress: 0.42 });
    expect(completed).toMatchObject({ status: 'completed', progress: 1, assetId: 'asset-1' });
  });

  it('retains progress while retrying a failed task', () => {
    const progressed = transitionUploadTask(transitionUploadTask(task(), { type: 'start' }), {
      type: 'progress',
      progress: 0.6,
    });
    const failed = transitionUploadTask(progressed, { type: 'fail', error: 'Connection lost.' });
    const retried = transitionUploadTask(failed, { type: 'start' });

    expect(failed).toMatchObject({ status: 'failed', progress: 0.6, error: 'Connection lost.' });
    expect(retried).toMatchObject({ status: 'uploading', progress: 0.6, error: undefined });
  });

  it('moves cancellation through an explicit pending state', () => {
    const uploading = transitionUploadTask(task(), { type: 'start' });
    const cancelling = transitionUploadTask(uploading, { type: 'cancel-requested' });
    const cancelled = transitionUploadTask(cancelling, { type: 'cancelled' });

    expect(cancelling.status).toBe('cancelling');
    expect(cancelled.status).toBe('cancelled');
  });

  it('does not regress progress or mutate terminal tasks', () => {
    const uploading = transitionUploadTask(task(), { type: 'start' });
    const progressed = transitionUploadTask(uploading, { type: 'progress', progress: 0.8 });
    const lowerProgress = transitionUploadTask(progressed, { type: 'progress', progress: 0.2 });
    const completed = transitionUploadTask(lowerProgress, { type: 'complete', assetId: 'asset-1' });

    expect(lowerProgress.progress).toBe(0.8);
    expect(transitionUploadTask(completed, { type: 'fail', error: 'Too late' })).toEqual(completed);
  });
});

describe('multipart recovery plan', () => {
  it('skips completed parts and reconstructs uploaded bytes', () => {
    const plan = getMultipartPlan(45, 10, [
      { ETag: 'one', PartNumber: 1 },
      { ETag: 'three', PartNumber: 3 },
      { ETag: 'five', PartNumber: 5 },
    ]);

    expect(plan).toEqual({ partCount: 5, pendingPartNumbers: [2, 4], completedBytes: 25 });
  });

  it('ignores duplicate and out-of-range completed parts', () => {
    const plan = getMultipartPlan(25, 10, [
      { ETag: 'one', PartNumber: 1 },
      { ETag: 'duplicate', PartNumber: 1 },
      { ETag: 'invalid', PartNumber: 4 },
    ]);

    expect(plan).toEqual({ partCount: 3, pendingPartNumbers: [2, 3], completedBytes: 10 });
  });
});
