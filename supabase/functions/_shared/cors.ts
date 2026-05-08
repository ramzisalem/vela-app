/**
 * Strict CORS allowlist (file 03).
 *
 * Native iOS clients send no Origin header — those requests are accepted.
 * Browser preflights with disallowed origins receive a 403, never a wildcard.
 */
const ALLOWED_ORIGINS = new Set<string>([
  'https://getvela.app',
  'https://staging.getvela.app',
  // Local dev — Supabase Studio, Edge Functions runtime.
  'http://localhost:8081',
  'http://localhost:54321',
]);

export function corsHeaders(origin: string | null): HeadersInit {
  // Native client (no Origin) — return a permissive but minimal set.
  if (!origin) {
    return {
      'access-control-allow-methods': 'POST, GET, OPTIONS',
      'access-control-allow-headers':
        'authorization, content-type, apikey, x-client-info',
    };
  }
  if (!ALLOWED_ORIGINS.has(origin)) {
    return {};
  }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers':
      'authorization, content-type, apikey, x-client-info',
    vary: 'origin',
  };
}

export function preflight(origin: string | null): Response | null {
  const headers = corsHeaders(origin);
  if (origin && Object.keys(headers).length === 0) {
    return new Response('Forbidden', { status: 403 });
  }
  return new Response(null, { status: 204, headers });
}
