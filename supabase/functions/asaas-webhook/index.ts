// Webhook do Asaas: confirma o pagamento (status → pago) quando o Pix cai.
// Protegido por um token compartilhado (configurado no painel do Asaas e como
// secret ASAAS_WEBHOOK_TOKEN). verify_jwt = false (o Asaas não envia JWT Supabase).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { log, revalidateWebCache } from '../_shared/log.ts';
import { recordWebhookEvent } from '../_shared/webhook-log.ts';

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let event = '';
  let providerId: string | undefined;

  try {
    const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
    const got = req.headers.get('asaas-access-token') ?? '';
    if (!expected || got !== expected) {
      log('warn', 'webhook forbidden', { hasToken: Boolean(got) });
      await recordWebhookEvent(admin, { event: 'auth', outcome: 'error', details: { reason: 'forbidden' } });
      return new Response('forbidden', { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    event = body?.event ?? '';
    providerId = body?.payment?.id;
    if (!providerId) {
      await recordWebhookEvent(admin, { event: event || 'unknown', outcome: 'ignored', details: { reason: 'no_payment_id' } });
      log('info', 'webhook ignored', { event });
      return new Response('ignored', { status: 200 });
    }

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paidAt = new Date().toISOString();

      const { data: payRows, error: payErr } = await admin
        .from('payments')
        .update({ status: 'pago', paid_at: paidAt })
        .eq('provider_payment_id', providerId)
        .eq('status', 'pendente')
        .select('id');

      if (payErr) {
        log('error', 'payments update failed', { providerId, event, error: payErr.message });
        await recordWebhookEvent(admin, {
          event,
          provider_payment_id: providerId,
          outcome: 'error',
          details: { table: 'payments', error: payErr.message },
        });
        return new Response('error', { status: 500 });
      }

      const { data: orderRows, error: orderErr } = await admin
        .from('product_orders')
        .update({ status: 'pago', paid_at: paidAt })
        .eq('provider_payment_id', providerId)
        .eq('status', 'aguardando_pagamento')
        .select('id');

      if (orderErr) {
        log('error', 'product_orders update failed', { providerId, event, error: orderErr.message });
        await recordWebhookEvent(admin, {
          event,
          provider_payment_id: providerId,
          outcome: 'error',
          details: { table: 'product_orders', error: orderErr.message },
        });
        return new Response('error', { status: 500 });
      }

      const payCount = payRows?.length ?? 0;
      const orderCount = orderRows?.length ?? 0;

      if (payCount === 0 && orderCount === 0) {
        const { count: alreadyPaid } = await admin
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_payment_id', providerId)
          .eq('status', 'pago');
        const { count: orderPaid } = await admin
          .from('product_orders')
          .select('id', { count: 'exact', head: true })
          .eq('provider_payment_id', providerId)
          .neq('status', 'aguardando_pagamento');

        if ((alreadyPaid ?? 0) > 0 || (orderPaid ?? 0) > 0) {
          await recordWebhookEvent(admin, {
            event,
            provider_payment_id: providerId,
            outcome: 'duplicate',
            details: { payCount: alreadyPaid, orderCount: orderPaid },
          });
          log('info', 'payment webhook duplicate (already paid)', { providerId, event });
        } else {
          await recordWebhookEvent(admin, {
            event,
            provider_payment_id: providerId,
            outcome: 'no_match',
            details: { providerId },
          });
          log('warn', 'payment webhook matched no rows', { providerId, event });
        }
      } else {
        await recordWebhookEvent(admin, {
          event,
          provider_payment_id: providerId,
          outcome: 'ok',
          details: { payCount, orderCount },
        });
        log('info', 'payment confirmed', { providerId, event, payCount, orderCount });

        if (orderCount > 0) {
          const webUrl = Deno.env.get('WEB_APP_URL')?.replace(/\/$/, '');
          const secret = Deno.env.get('REVALIDATE_SECRET');
          if (webUrl && secret) {
            try {
              const res = await fetch(`${webUrl}/api/revalidate?tag=catalog`, {
                method: 'POST',
                headers: { 'x-revalidate-secret': secret },
              });
              if (!res.ok) {
                await recordWebhookEvent(admin, {
                  event,
                  provider_payment_id: providerId,
                  outcome: 'revalidate_failed',
                  details: { status: res.status },
                });
                log('warn', 'web cache revalidate failed', { status: res.status });
              }
            } catch (e) {
              await recordWebhookEvent(admin, {
                event,
                provider_payment_id: providerId,
                outcome: 'revalidate_failed',
                details: { error: e instanceof Error ? e.message : String(e) },
              });
            }
          }
        }
      }
    } else if (event === 'PAYMENT_REFUNDED') {
      const { error: payErr } = await admin
        .from('payments')
        .update({ status: 'estornado' })
        .eq('provider_payment_id', providerId)
        .neq('status', 'estornado');
      const { data: orderRows, error: orderErr } = await admin
        .from('product_orders')
        .update({ status: 'cancelado' })
        .eq('provider_payment_id', providerId)
        .neq('status', 'cancelado')
        .select('id');

      if (payErr || orderErr) {
        await recordWebhookEvent(admin, {
          event,
          provider_payment_id: providerId,
          outcome: 'error',
          details: { payErr: payErr?.message, orderErr: orderErr?.message },
        });
        log('error', 'payment refund failed', { providerId, payErr: payErr?.message, orderErr: orderErr?.message });
        return new Response('error', { status: 500 });
      }

      await recordWebhookEvent(admin, {
        event,
        provider_payment_id: providerId,
        outcome: 'ok',
        details: { orderCount: orderRows?.length ?? 0 },
      });
      log('info', 'payment refunded', { providerId });
      if ((orderRows?.length ?? 0) > 0) await revalidateWebCache('catalog');
    } else {
      await recordWebhookEvent(admin, {
        event,
        provider_payment_id: providerId,
        outcome: 'ignored',
        details: { reason: 'unsupported_event' },
      });
      log('info', 'webhook event skipped', { event, providerId });
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordWebhookEvent(admin, {
      event: event || 'unknown',
      provider_payment_id: providerId,
      outcome: 'error',
      details: { error: msg, stack: e instanceof Error ? e.stack : undefined },
    });
    log('error', 'webhook unhandled exception', { error: msg, stack: e instanceof Error ? e.stack : undefined });
    return new Response('error', { status: 500 });
  }
});
