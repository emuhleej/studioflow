import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('StudioFlow application shell', () => {
  it('opens the safe fictional Creator HQ demo', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Your studio, at a glance.' })
    ).toBeInTheDocument();
    expect(screen.getByText('Fictional demo workspace')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  });

  it('exposes the health check without opening the private workspace', () => {
    render(
      <MemoryRouter initialEntries={['/health']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'StudioFlow Health Check' })).toBeInTheDocument();
    const payload = JSON.parse(screen.getByTestId('health-payload').textContent ?? '{}') as {
      status?: string;
      version?: string;
    };
    expect(payload).toMatchObject({ status: 'ok', version: '0.1.0' });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
