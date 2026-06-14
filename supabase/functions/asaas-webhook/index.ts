// Webhook do Asaas: confirma o pagamento (status → pago) quando o Pix cai.
// Protegido por um token compartilhado (configurado no painel do Asaas e como
// secret ASAAS_WEBHOOK_TOKEN). verify_jwt = false (o Asaas não envia JWT Supabase).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { log, revalidateWebCache } from '../_shared/log.ts';

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
    const got = req.headers.get('asaas-access-token') ?? '';
    if (!expected || got !== expected) {
      log('warn', 'webhook forbidden', { hasToken: Boolean(got) });
      return new Response('forbidden', { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const event: string = body?.event ?? '';
    const providerId: string | undefined = body?.payment?.id;
    if (!providerId) {
      log('info', 'webhook ignored', { event });
      return new Response('ignored', { status: 200 });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paidAt = new Date().toISOString();

      const { data: payRows, error: payErr } = await admin
        .from('payments')
        .update({ status: 'pago', paid_at: paidAt })
        .eq('provider_payment_id', providerId)
        .select('id');

      if (payErr) {
        log('error', 'payments update failed', { providerId, event, error: payErr.message });
      }

      const { data: orderRows, error: orderErr } = await admin
        .from('product_orders')
        .update({ status: 'pago', paid_at: paidAt })
        .eq('provider_payment_id', providerId)
        .eq('status', 'aguardando_pagamento')
        .select('id');

      if (orderErr) {
        log('error', 'product_orders update failed', { providerId, event, error: orderErr.message });
      }

      const payCount = payRows?.length ?? 0;
      const orderCount = orderRows?.length ?? 0;
      if (!payErr && !orderErr && payCount === 0 && orderCount === 0) {
        log('warn', 'payment webhook matched no rows', { providerId, event });
      } else {
        log('info', 'payment confirmed', { providerId, event, payCount, orderCount });
        if (orderCount > 0) await revalidateWebCache('catalog');
      }
    } else if (event === 'PAYMENT_REFUNDED') {
      const { error: payErr } = await admin
        .from('payments')
        .update({ status: 'estornado' })
        .eq('provider_payment_id', providerId);
      const { data: orderRows, error: orderErr } = await admin
        .from('product_orders')
        .update({ status: 'cancelado' })
        .eq('provider_payment_id', providerId)
        .select('id');

      if (payErr) log('error', 'payments refund failed', { providerId, error: payErr.message });
      if (orderErr) log('error', 'product_orders refund failed', { providerId, error: orderErr.message });
      if (!payErr && !orderErr) {
        log('info', 'payment refunded', { providerId });
        if ((orderRows?.length ?? 0) > 0) await revalidateWebCache('catalog');
      }
    } else {
      log('info', 'webhook event skipped', { event, providerId });
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    log('error', 'webhook unhandled exception', {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return new Response('ok', { status: 200 });
  }
});
