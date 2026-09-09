import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TOAST_DURATION, useToast } from './useToast';

describe('useToast', () => {
  it('queues all four toast types with the default duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Saved');
      result.current.error('Failed');
      result.current.info('Processing');
      result.current.warning('Storage is nearly full');
    });

    expect(result.current.toasts.map((toast) => toast.type)).toEqual([
      'success',
      'error',
      'info',
      'warning',
    ]);
    expect(result.current.toasts.every((toast) => toast.duration === DEFAULT_TOAST_DURATION)).toBe(
      true
    );
  });

  it('supports a configurable duration and explicit dismissal', () => {
    const { result } = renderHook(() => useToast());
    let toastId = '';

    act(() => {
      toastId = result.current.showToast('Longer notice', { duration: 5_000 });
    });
    expect(result.current.toasts[0]?.duration).toBe(5_000);

    act(() => result.current.dismissToast(toastId));
    expect(result.current.toasts).toHaveLength(0);
  });
});
