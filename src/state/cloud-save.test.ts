import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../types';
import { rollbackAppendedRecord, rollbackUpdatedRecord, saveWithRetry } from './cloud-save';

const previous: Project = {
  id: 'project-1',
  ownerId: 'owner-1',
  title: 'Previous',
  description: '',
  accent: '#000000',
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

describe('cloud save recovery', () => {
  it('retries one transient failure before succeeding', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    await expect(saveWithRetry(save)).resolves.toBeUndefined();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('reports failure after both attempts fail', async () => {
    const save = vi.fn().mockRejectedValue(new Error('still offline'));
    await expect(saveWithRetry(save)).rejects.toThrow('still offline');
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('removes a failed optimistic append only while it is still current', () => {
    const laterVersion = { ...previous, title: 'Later update' };
    expect(rollbackAppendedRecord([previous], previous)).toEqual([]);
    expect(rollbackAppendedRecord([laterVersion], previous)).toEqual([laterVersion]);
  });

  it('restores a failed optimistic update without overwriting a later change', () => {
    const attempted = { ...previous, title: 'Attempted' };
    const laterVersion = { ...attempted, title: 'Later update' };
    expect(rollbackUpdatedRecord([attempted], attempted, previous)).toEqual([previous]);
    expect(rollbackUpdatedRecord([laterVersion], attempted, previous)).toEqual([laterVersion]);
  });
});
