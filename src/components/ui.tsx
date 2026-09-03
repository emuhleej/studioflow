import { useEffect, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useStudio } from '../state/studio-store';
import { Toast } from './ui/Toast';

export function Button({
  children,
  variant = 'default',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={`button ${variant === 'primary' ? 'button-primary' : ''} ${variant === 'ghost' ? 'button-ghost' : ''} ${variant === 'danger' ? 'button-danger' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button className="button button-ghost icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="quiet text-xs">{hint}</span> : null}
    </label>
  );
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header className="dialog-header">
          <div>
            <h2 id="dialog-title" className="section-title">
              {title}
            </h2>
            {description ? <p className="muted mt-1 text-xs">{description}</p> : null}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="dialog-body">{children}</div>
        {footer ? <footer className="dialog-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="display-title">{title}</h1>
        {description ? (
          <p className="muted mt-2 max-w-2xl text-sm leading-6">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="quiet">{icon}</div>
      <h3 className="section-title">{title}</h3>
      <p className="muted max-w-md text-sm leading-6">{description}</p>
      {action}
    </div>
  );
}

export function SubmitButton({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <Button type="submit" variant="primary" disabled={busy}>
      {busy ? 'Working…' : children}
    </Button>
  );
}

export function FormShell({
  onSubmit,
  children,
  className = '',
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`grid gap-4 ${className}`}>
      {children}
    </form>
  );
}

export function NoticeToast() {
  const { notice, clearNotice } = useStudio();
  if (!notice) return null;
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-5 right-5 z-[80] w-[min(380px,calc(100vw-2rem))]"
    >
      <Toast
        toast={{ id: 'studio-notice', message: notice.message, type: notice.tone, duration: 3_000 }}
        onDismiss={clearNotice}
      />
    </section>
  );
}
