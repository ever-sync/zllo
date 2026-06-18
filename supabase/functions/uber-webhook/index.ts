import { createClient } from 'jsr:@supabase/supabase-js@2';
import { log } from '../_shared/log.ts';
import { mapUberStatus, verifyUberWebhookSignature } from '../_shared/uber-direct.ts';

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const raw = await req.text();
    const sig = req.headers.get('x-uber-signature') ?? req.headers.get('x-postmates-signature');
    const ok = await verifyUberWebhookSignature(raw, sig);
    if (!ok) {
      log('warn', 'uber webhook invalid signature');
      return new Response('forbidden', { status: 401 });
    }

    const body = JSON.parse(raw) as {
      kind?: string;
      event_type?: string;
      data?: {
        id?: string;
        status?: string;
        tracking_url?: string;
        external_id?: string;
        courier?: { lat?: number; lng?: number };
      };
    };

    const deliveryId = body.data?.id;
    const externalId = body.data?.external_id;
    const status = mapUberStatus(body.data?.status ?? body.event_type ?? 'created');

    let row = null;
    if (deliveryId) {
      const { data } = await admin
        .from('uber_deliveries')
        .select('id, ref_id, shop_id, status')
        .eq('uber_delivery_id', deliveryId)
        .maybeSingle();
      row = data;
    }
    if (!row && externalId) {
      const { data } = await admin
        .from('uber_deliveries')
        .select('id, ref_id, shop_id, status')
        .eq('ref_id', externalId)
        .maybeSingle();
      row = data;
    }
    if (!row) {
      log('info', 'uber webhook no match', { deliveryId, externalId });
      return new Response('ignored', { status: 200 });
    }

    await admin
      .from('uber_deliveries')
      .update({
        status,
        tracking_url: body.data?.tracking_url ?? undefined,
        courier_lat: body.data?.courier?.lat ?? null,
        courier_lng: body.data?.courier?.lng ?? null,
        raw_last_event: body,
      })
      .eq('id', row.id);

    const { data: order } = await admin
      .from('product_orders')
      .select('client_id, shop_id')
      .eq('id', row.ref_id)
      .maybeSingle();

    if (order?.client_id && status !== row.status) {
      const labels: Record<string, string> = {
        pickup: 'Entregador indo buscar seu pedido',
        in_transit: 'Seu pedido está a caminho',
        delivered: 'Pedido entregue',
        canceled: 'Entrega cancelada',
      };
      const label = labels[status];
      if (label) {
        await admin.from('notifications').insert({
          user_id: order.client_id,
          title: 'Atualização da entrega',
          body: label,
          type: 'delivery_update',
          data: {
            product_order_id: row.ref_id,
            tracking_url: body.data?.tracking_url ?? null,
          },
        });
      }
    }

    if (status === 'delivered') {
      await admin
        .from('product_orders')
        .update({ status: 'concluido' })
        .eq('id', row.ref_id)
        .in('status', ['pago', 'separando', 'pronto']);
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    log('error', 'uber webhook failed', { error: e instanceof Error ? e.message : String(e) });
    return new Response('error', { status: 500 });
  }
});
