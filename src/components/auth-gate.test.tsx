import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from './auth-gate';

const mocks = vi.hoisted(() => ({
  useStudio: vi.fn(),
  logout: vi.fn(),
  retryOwnerVerification: vi.fn(),
}));

vi.mock('../state/studio-store', () => ({ useStudio: mocks.useStudio }));

const baseState = {
  isDemo: false,
  user: { id: 'test-user' },
  ownerAuthorized: null,
  ownerVerificationError: null,
  authLoading: false,
  dataLoading: false,
  login: vi.fn(),
  logout: mocks.logout,
  retryOwnerVerification: mocks.retryOwnerVerification,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useStudio.mockReturnValue(baseState);
});

describe('AuthGate owner verification states', () => {
  it('shows genuine owner denial only when the owner RPC returns false', () => {
    mocks.useStudio.mockReturnValue({ ...baseState, ownerAuthorized: false });
    render(
      <AuthGate>
        <div>Private workspace</div>
      </AuthGate>
    );

    expect(
      screen.getByRole('heading', { name: 'This account is not the StudioFlow owner.' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try verification again' })
    ).not.toBeInTheDocument();
  });

  it('shows a retry action for verification errors instead of calling the user a non-owner', async () => {
    const user = userEvent.setup();
    mocks.useStudio.mockReturnValue({ ...baseState, ownerVerificationError: 'Unauthorized' });
    render(
      <AuthGate>
        <div>Private workspace</div>
      </AuthGate>
    );

    expect(
      screen.getByRole('heading', { name: 'StudioFlow couldn’t verify this sign-in.' })
    ).toBeInTheDocument();
    expect(screen.queryByText('This account is not the StudioFlow owner.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try verification again' }));
    expect(mocks.retryOwnerVerification).toHaveBeenCalledOnce();
  });
});
