const configuredOrigins = (Deno.env.get("APP_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localOrigins = ["http://localhost:4173", "http://127.0.0.1:4173"];

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allowed = [...localOrigins, ...configuredOrigins];
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-backup-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

export function options(request: Request): Response | null {
  return request.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders(request) }) : null;
}

export function errorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected media service error.";
  const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : message.includes("not found") ? 404 : 400;
  return json(request, { error: message }, status);
}
