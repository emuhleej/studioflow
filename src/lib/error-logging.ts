import { supabase } from './supabase';

export async function recordClientError(error: unknown, context: string): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  if (import.meta.env.DEV) console.error(`[StudioFlow:${context}]`, error);
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('error_events').insert({
    owner_id: data.user.id,
    message: message.slice(0, 2000),
    context: context.slice(0, 240),
    path: window.location.pathname.slice(0, 500),
    user_agent: navigator.userAgent.slice(0, 500),
  });
}
