import { describe, expect, it, vi } from 'vitest';
import { validateEnv } from './env';

describe('environment validation', () => {
  it('defaults local development to the fictional demo', () => {
    expect(validateEnv({}, 'development')).toEqual({ VITE_DEMO_MODE: true });
  });

  it('accepts a complete private-workspace configuration', () => {
    expect(
      validateEnv(
        {
          VITE_SUPABASE_URL: 'https://example.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'public-anon-placeholder',
          VITE_DEMO_MODE: 'false',
        },
        'production'
      )
    ).toEqual({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-placeholder',
      VITE_DEMO_MODE: false,
    });
  });

  it('falls back safely in development without logging environment values', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      validateEnv(
        {
          VITE_SUPABASE_URL: 'not-a-url',
          VITE_SUPABASE_ANON_KEY: 'do-not-log-this-value',
          VITE_DEMO_MODE: 'false',
        },
        'development'
      )
    ).toEqual({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_DEMO_MODE: true,
    });
    expect(warning).toHaveBeenCalledWith(
      'StudioFlow environment validation failed; using the fictional demo workspace.'
    );
    expect(JSON.stringify(warning.mock.calls)).not.toContain('do-not-log-this-value');
    warning.mockRestore();
  });

  it('fails closed when production configuration is missing', () => {
    const failure = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => validateEnv({ VITE_DEMO_MODE: 'false' }, 'production')).toThrow(
      'Missing or invalid production environment variables.'
    );
    expect(failure).toHaveBeenCalledWith('StudioFlow production environment validation failed.');
    failure.mockRestore();
  });
});
