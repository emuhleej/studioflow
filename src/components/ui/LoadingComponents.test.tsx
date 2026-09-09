import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingSpinner } from './LoadingSpinner';
import { Skeleton } from './Skeleton';

describe('loading components', () => {
  it('renders an accessible spinning status', () => {
    render(<LoadingSpinner label="Opening workspace" />);

    expect(screen.getByRole('status', { name: 'Opening workspace' })).toHaveClass('animate-spin');
  });

  it('renders a decorative pulse skeleton with custom sizing', () => {
    const { container } = render(<Skeleton className="h-6 w-full" data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');

    expect(skeleton).toHaveClass('animate-pulse', 'h-6', 'w-full');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toBe(skeleton);
  });
});
