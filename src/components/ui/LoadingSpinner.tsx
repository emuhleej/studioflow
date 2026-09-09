import type { ComponentPropsWithoutRef } from 'react';
import { LoaderCircle } from 'lucide-react';

export interface LoadingSpinnerProps extends Omit<
  ComponentPropsWithoutRef<typeof LoaderCircle>,
  'aria-label'
> {
  label?: string;
}

export function LoadingSpinner({
  className = '',
  label = 'Loading',
  size = 20,
  ...props
}: LoadingSpinnerProps) {
  return (
    <LoaderCircle
      {...props}
      aria-label={label}
      className={`animate-spin ${className}`.trim()}
      role="status"
      size={size}
    />
  );
}
