import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type WebhookOutcome =
  | 'ok'
  | 'duplicate'
  | 'no_match'
  | 'error'
  | 'ignored'
  | 'revalidate_failed';

export async function recordWebhookEvent(
  admin: SupabaseClient,
  row: {
    event: string;
    provider_payment_id?: string | null;
    outcome: WebhookOutcome;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from('webhook_events').insert({
    source: 'asaas',
    event: row.event,
    provider_payment_id: row.provider_payment_id ?? null,
    outcome: row.outcome,
    details: row.details ?? null,
  });
  if (error) {
    console.error(JSON.stringify({ level: 'error', msg: 'webhook_events insert failed', error: error.message }));
  }
}
