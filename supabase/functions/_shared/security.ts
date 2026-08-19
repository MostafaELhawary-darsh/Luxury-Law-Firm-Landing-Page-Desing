import type { SupabaseClient, User } from "jsr:@supabase/supabase-js@2";

const JSON_HEADERS = { "Content-Type": "application/json" };

function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const origins = allowedOrigins();
  if (!origin || !origins.has(origin)) return { ...JSON_HEADERS, "Vary": "Origin" };
  return {
    ...JSON_HEADERS,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

export function preflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins().has(origin)) {
    return new Response(null, { status: 403, headers: corsHeaders(request) });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

export async function authenticatedUser(supabase: SupabaseClient, request: Request): Promise<User | null> {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  return error ? null : data.user;
}

export function isPrivilegedUser(user: User): boolean {
  const configuredIds = new Set(
    (Deno.env.get("PRIVILEGED_USER_IDS") ?? "").split(",").map((id) => id.trim()).filter(Boolean),
  );
  const role = user.app_metadata?.role;
  const roles = user.app_metadata?.roles;
  return configuredIds.has(user.id) || role === "admin" || (Array.isArray(roles) && roles.includes("admin"));
}

export async function requireAuthenticatedUser(
  supabase: SupabaseClient,
  request: Request,
): Promise<{ user: User } | { response: Response }> {
  const user = await authenticatedUser(supabase, request);
  return user ? { user } : { response: json(request, { error: "Unauthorized" }, 401) };
}

export async function requirePrivilegedUser(
  supabase: SupabaseClient,
  request: Request,
): Promise<{ user: User } | { response: Response }> {
  const result = await requireAuthenticatedUser(supabase, request);
  if ("response" in result) return result;
  return isPrivilegedUser(result.user) ? result : { response: json(request, { error: "Forbidden" }, 403) };
}
