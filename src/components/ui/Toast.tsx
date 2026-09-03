import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastItem, ToastType } from '../../lib/hooks/useToast';

const typeStyles: Record<ToastType, string> = {
  success: 'border-emerald-400/35 text-emerald-100',
  error: 'border-red-400/35 text-red-100',
  info: 'border-violet-400/35 text-violet-100',
  warning: 'border-amber-400/35 text-amber-100',
};

const typeIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} satisfies Record<ToastType, typeof Info>;

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = typeIcons[toast.type];

  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.duration, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex min-h-12 items-center gap-3 rounded-xl border bg-[#1b1e24] px-3 py-2.5 text-sm shadow-2xl ${typeStyles[toast.type]}`}
      role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="shrink-0" size={18} />
      <span className="min-w-0 flex-1 text-[var(--ink)]">{toast.message}</span>
      <button
        aria-label="Dismiss notification"
        className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
        type="button"
        onClick={() => onDismiss(toast.id)}
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: readonly ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-5 right-5 z-[80] grid w-[min(380px,calc(100vw-2rem))] gap-2"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </section>
  );
}
