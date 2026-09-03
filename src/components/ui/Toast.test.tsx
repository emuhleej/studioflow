import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically dismisses after three seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{ id: 'toast-1', message: 'Saved', type: 'success', duration: 3_000 }}
        onDismiss={onDismiss}
      />
    );

    act(() => vi.advanceTimersByTime(2_999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('renders warning notifications as alerts', () => {
    render(
      <Toast
        toast={{ id: 'toast-2', message: 'Storage is nearly full', type: 'warning', duration: 0 }}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Storage is nearly full');
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
  });
});
