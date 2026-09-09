import { useCallback, useMemo, useState } from 'react';

export const DEFAULT_TOAST_DURATION = 3_000;

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface UseToastResult {
  toasts: readonly ToastItem[];
  showToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
}

let toastSequence = 0;

function nextToastId(): string {
  toastSequence += 1;
  return `toast-${toastSequence}`;
}

export function useToast(defaultDuration = DEFAULT_TOAST_DURATION): UseToastResult {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const normalizedMessage = message.trim();
      if (!normalizedMessage) throw new Error('Toast messages cannot be empty.');

      const toast: ToastItem = {
        id: nextToastId(),
        message: normalizedMessage,
        type: options.type ?? 'info',
        duration: Math.max(0, options.duration ?? defaultDuration),
      };
      setToasts((current) => [...current, toast]);
      return toast.id;
    },
    [defaultDuration]
  );

  const success = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) =>
      showToast(message, { ...options, type: 'success' }),
    [showToast]
  );
  const error = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) =>
      showToast(message, { ...options, type: 'error' }),
    [showToast]
  );
  const info = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) =>
      showToast(message, { ...options, type: 'info' }),
    [showToast]
  );
  const warning = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) =>
      showToast(message, { ...options, type: 'warning' }),
    [showToast]
  );

  return useMemo(
    () => ({ toasts, showToast, dismissToast, clearToasts, success, error, info, warning }),
    [clearToasts, dismissToast, error, info, showToast, success, toasts, warning]
  );
}
