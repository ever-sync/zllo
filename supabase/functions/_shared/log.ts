export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...extra });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Invalida cache do Next.js (catálogo/admin) após pagamento de produto. */
export async function revalidateWebCache(tag: 'catalog' | 'admin') {
  const webUrl = Deno.env.get('WEB_APP_URL')?.replace(/\/$/, '');
  const secret = Deno.env.get('REVALIDATE_SECRET');
  if (!webUrl || !secret) return;

  try {
    const res = await fetch(`${webUrl}/api/revalidate?tag=${tag}`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': secret },
    });
    if (!res.ok) {
      log('warn', 'web cache revalidate failed', { tag, status: res.status });
    }
  } catch (e) {
    log('warn', 'web cache revalidate error', {
      tag,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
