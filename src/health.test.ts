import { describe, expect, it } from 'vitest';
import { healthCheck } from './health';

describe('healthCheck', () => {
  it('returns a stable status shape with the current application version', () => {
    expect(healthCheck(() => new Date('2026-09-03T12:00:00.000Z'))).toEqual({
      status: 'ok',
      timestamp: '2026-09-03T12:00:00.000Z',
      version: '0.1.0',
    });
  });
});
