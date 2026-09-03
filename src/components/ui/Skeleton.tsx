import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-[var(--panel-soft)] ${className}`.trim()}
    />
  );
}
