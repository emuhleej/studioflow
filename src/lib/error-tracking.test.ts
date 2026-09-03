import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorTracker } from './error-tracking';

const mocks = vi.hoisted(() => ({ recordClientError: vi.fn() }));

vi.mock('./error-logging', () => ({ recordClientError: mocks.recordClientError }));

describe('ErrorTracker', () => {
  beforeEach(() => {
    errorTracker.clearReports();
    mocks.recordClientError.mockReset();
  });

  it('captures a bounded report and forwards only a safe context label', () => {
    const report = errorTracker.captureError(new Error('Fictional failure'), {
      type: 'unhandledrejection',
      nested: { private: 'not retained' },
    });

    expect(report.message).toBe('Fictional failure');
    expect(report.context).toEqual({ type: 'unhandledrejection', nested: '[redacted]' });
    expect(report.userAgent).toBe(navigator.userAgent);
    expect(mocks.recordClientError).toHaveBeenCalledWith(expect.any(Error), 'unhandledrejection');
  });

  it('retains only the latest 50 reports and returns a copied collection', () => {
    for (let index = 0; index < 51; index += 1) {
      errorTracker.captureError(new Error(`Failure ${index}`));
    }

    const reports = errorTracker.getReports();
    expect(reports).toHaveLength(50);
    expect(reports[0]?.message).toBe('Failure 1');
    reports.pop();
    expect(errorTracker.getReports()).toHaveLength(50);
  });
});
