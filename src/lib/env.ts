import { z } from 'zod';

const envSchema = z
  .object({
    VITE_SUPABASE_URL: z.string().url().optional(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    VITE_DEMO_MODE: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default(true),
  })
  .superRefine((value, context) => {
    if (value.VITE_DEMO_MODE) return;
    if (!value.VITE_SUPABASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['VITE_SUPABASE_URL'],
        message: 'Supabase URL is required when demo mode is disabled.',
      });
    }
    if (!value.VITE_SUPABASE_ANON_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['VITE_SUPABASE_ANON_KEY'],
        message: 'Supabase anon key is required when demo mode is disabled.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

const developmentFallback: Env = {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_DEMO_MODE: true,
};

export const validateEnv = (
  source: Record<string, unknown> = import.meta.env,
  mode: string = import.meta.env.MODE
): Env => {
  const parsed = envSchema.safeParse(source);
  const productionDemoEnabled =
    parsed.success && mode === 'production' && parsed.data.VITE_DEMO_MODE;

  if (parsed.success && !productionDemoEnabled) return parsed.data;

  if (mode === 'production') {
    console.error('StudioFlow production environment validation failed.');
    throw new Error('Missing or invalid production environment variables.');
  }

  console.warn('StudioFlow environment validation failed; using the fictional demo workspace.');
  return developmentFallback;
};

export const env = validateEnv();
