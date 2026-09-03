import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

function requireEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

export function adminClient(): SupabaseClient {
  const encodedSecrets = Deno.env.get("SUPABASE_SECRET_KEYS");
  let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret && encodedSecrets) {
    try {
      secret = (JSON.parse(encodedSecrets) as { default?: string }).default ?? "";
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS is not valid JSON.");
    }
  }
  if (!secret) throw new Error("Missing Supabase server secret.");
  return createClient(requireEnvironment("SUPABASE_URL"), secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireOwner(request: Request): Promise<{ admin: SupabaseClient; user: User }> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Unauthorized: missing bearer token.");

  const admin = adminClient();
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized: invalid session.");

  const { data: owner, error: ownerError } = await admin
    .from("app_owners")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) throw new Error("Forbidden: this account is not the configured StudioFlow owner.");

  return { admin, user: data.user };
}

export function isBackupJob(request: Request): boolean {
  const configured = Deno.env.get("BACKUP_JOB_SECRET") ?? "";
  const supplied = request.headers.get("x-backup-secret") ?? "";
  return configured.length >= 32 && configured === supplied;
}

export function requireGenerationJob(request: Request): void {
  if (request.headers.has("authorization")) {
    throw new Error("Unauthorized: generation recovery accepts internal service authentication only.");
  }
  const configured = Deno.env.get("GENERATION_JOB_SECRET") ?? "";
  const supplied = request.headers.get("x-generation-job-secret") ?? "";
  if (configured.length < 32 || configured !== supplied) {
    throw new Error("Unauthorized: invalid generation recovery credential.");
  }
}
