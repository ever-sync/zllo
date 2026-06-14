/** CORS restrito para Edge Functions chamadas pelo browser. */

const DEFAULT_DEV = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('WEB_APP_URL') ?? '';
  const fromEnv = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_DEV;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origins = allowedOrigins();
  const origin = req.headers.get('Origin');
  const allow =
    origin && origins.includes(origin) ? origin : origins.length === 1 ? origins[0] : null;

  const base = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (allow) {
    return { ...base, 'Access-Control-Allow-Origin': allow, Vary: 'Origin' };
  }

  return base;
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
