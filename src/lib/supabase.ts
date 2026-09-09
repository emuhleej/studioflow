import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null;

export async function signInWithGitHub(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
