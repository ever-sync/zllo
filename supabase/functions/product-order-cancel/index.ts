import { createClient } from 'jsr:@supabase/supabase-js@2';
import { refundAsaasPayment } from '../_shared/asaas.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { log } from '../_shared/log.ts';
import { notifyUserPush } from '../_shared/notify.ts';
import { cancelDelivery, isUberConfigured, isUberMock } from '../_shared/uber-direct.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse(req, { error: 'Não autenticado' }, 401);

    const { product_order_id } = await req.json().catch(() => ({}));
    if (!product_order_id) return jsonResponse(req, { error: 'product_order_id obrigatório' }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: order } = await admin
      .from('product_orders')
      .select('id, status, client_id, shop_id, provider_payment_id, paid_at, delivery_provider, shop:shops(owner_id)')
      .eq('id', product_order_id)
      .maybeSingle();
    if (!order) return jsonResponse(req, { error: 'Pedido não encontrado' }, 404);

    const ownerId = (order.shop as { owner_id: string } | null)?.owner_id;
    if (!ownerId || ownerId !== user.id) {
      return jsonResponse(req, { error: 'Sem permissão' }, 403);
    }
    if (!['pago', 'separando', 'pronto'].includes(order.status)) {
      return jsonResponse(req, { error: 'Pedido não pode ser cancelado neste status' }, 409);
    }

    const { data: uberRow } = await admin
      .from('uber_deliveries')
      .select('id, uber_delivery_id, status')
      .eq('kind', 'product_order')
      .eq('ref_id', product_order_id)
      .maybeSingle();

    let uberCanceled = false;
    const needsUberCancel = Boolean(
      uberRow?.uber_delivery_id &&
        !['canceled', 'failed', 'delivered'].includes(uberRow.status),
    );
    if (needsUberCancel) {
      if (!isUberConfigured() && !isUberMock()) {
        return jsonResponse(req, { error: 'Entrega Uber ativa — configure Uber Direct para cancelar' }, 503);
      }
      await cancelDelivery(uberRow!.uber_delivery_id!);
      await admin
        .from('uber_deliveries')
        .update({ status: 'canceled' })
        .eq('id', uberRow!.id);
      uberCanceled = true;
    }

    let refunded = false;
    if (order.provider_payment_id && order.paid_at) {
      await refundAsaasPayment(order.provider_payment_id);
      refunded = true;
    }

    const { error: updErr } = await admin
      .from('product_orders')
      .update({ status: 'cancelado' })
      .eq('id', product_order_id);
    if (updErr) throw updErr;

    await notifyUserPush(
      admin,
      order.client_id,
      'Pedido cancelado',
      refunded
        ? 'A loja cancelou seu pedido. O estorno Pix será processado em breve.'
        : 'A loja cancelou seu pedido.',
      'product_order',
      { product_order_id },
    );

    return jsonResponse(req, {
      ok: true,
      refunded,
      uber_canceled: uberCanceled,
    });
  } catch (e) {
    log('error', 'product-order-cancel failed', { error: e instanceof Error ? e.message : String(e) });
    return jsonResponse(req, { error: e instanceof Error ? e.message : 'Erro ao cancelar pedido' }, 500);
  }
});
