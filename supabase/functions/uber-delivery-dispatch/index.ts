import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { log } from '../_shared/log.ts';
import {
  createDelivery,
  createDeliveryQuote,
  isUberConfigured,
  isUberMock,
  mapUberStatus,
  type AddressParts,
} from '../_shared/uber-direct.ts';

function shopPickup(row: {
  name: string;
  address: string | null;
  pickup_phone: string | null;
  pickup_street: string | null;
  pickup_number: string | null;
  pickup_cep: string | null;
  pickup_city: string | null;
  pickup_uf: string | null;
  owner: { phone: string | null; full_name: string | null } | null;
}): { parts: AddressParts; phone: string; name: string } {
  const parts: AddressParts = row.pickup_street
    ? {
      street: row.pickup_street,
      number: row.pickup_number,
      cep: row.pickup_cep,
      city: row.pickup_city,
      uf: row.pickup_uf,
    }
    : { street: row.address ?? row.name, city: 'São Paulo', uf: 'SP', cep: '01310100' };
  const phone = row.pickup_phone ?? row.owner?.phone ?? '+5511999999999';
  return { parts, phone, name: row.name };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  try {
    if (!isUberConfigured() && !isUberMock()) {
      return jsonResponse(req, { error: 'Uber Direct não configurado' }, 503);
    }

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
      .select(
        'id, shop_id, client_id, status, shipping_type, dropoff_json, delivery_provider, items:product_order_items(name, qty, unit_price)',
      )
      .eq('id', product_order_id)
      .maybeSingle();
    if (!order) return jsonResponse(req, { error: 'Pedido não encontrado' }, 404);
    if (order.shipping_type !== 'entrega') {
      return jsonResponse(req, { error: 'Pedido não é entrega' }, 400);
    }
    if (!['pago', 'separando', 'pronto'].includes(order.status)) {
      return jsonResponse(req, { error: 'Pedido ainda não está pronto para despacho' }, 409);
    }

    const { data: shopRow } = await admin
      .from('shops')
      .select(
        'id, name, address, owner_id, pickup_phone, pickup_street, pickup_number, pickup_cep, pickup_city, pickup_uf, owner:profiles!shops_owner_id_fkey(phone, full_name)',
      )
      .eq('id', order.shop_id)
      .maybeSingle();
    if (!shopRow || shopRow.owner_id !== user.id) {
      return jsonResponse(req, { error: 'Sem permissão' }, 403);
    }

    const { data: existing } = await admin
      .from('uber_deliveries')
      .select('id, status, tracking_url')
      .eq('kind', 'product_order')
      .eq('ref_id', product_order_id)
      .maybeSingle();
    if (existing && !['canceled', 'failed', 'delivered'].includes(existing.status)) {
      return jsonResponse(req, {
        ok: true,
        tracking_url: existing.tracking_url,
        status: existing.status,
      });
    }

    const dropoff = order.dropoff_json as AddressParts | null;
    if (!dropoff?.street) {
      return jsonResponse(req, { error: 'Endereço de entrega incompleto no pedido' }, 422);
    }

    const { data: client } = await admin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.client_id)
      .maybeSingle();

    const pickup = shopPickup({
      ...shopRow,
      owner: (shopRow.owner as { phone: string | null; full_name: string | null } | null) ?? null,
    });

    const quote = await createDeliveryQuote(pickup.parts, dropoff);
    const delivery = await createDelivery({
      quoteId: quote.id,
      pickupName: pickup.name,
      pickupPhone: pickup.phone,
      pickup: pickup.parts,
      dropoffName: client?.full_name ?? 'Cliente',
      dropoffPhone: client?.phone ?? '+5511999999999',
      dropoff,
      items: ((order.items as { name: string; qty: number; unit_price: number }[]) ?? []).map((it) => ({
        name: it.name,
        quantity: it.qty,
        price: Number(it.unit_price),
      })),
      externalId: product_order_id,
    });

    const status = mapUberStatus(delivery.status ?? 'pending');
    await admin.from('uber_deliveries').upsert({
      kind: 'product_order',
      ref_id: product_order_id,
      shop_id: order.shop_id,
      uber_delivery_id: delivery.id,
      uber_quote_id: quote.id,
      status,
      fee_cents: Number(delivery.fee ?? quote.fee),
      tracking_url: delivery.tracking_url ?? null,
      pickup_address_json: pickup.parts,
      dropoff_address_json: dropoff,
    }, { onConflict: 'kind,ref_id' });

    await admin
      .from('product_orders')
      .update({ delivery_provider: 'uber_direct' })
      .eq('id', product_order_id);

    await admin.from('notifications').insert({
      user_id: order.client_id,
      title: 'Entregador a caminho',
      body: 'Seu pedido saiu para entrega. Toque para acompanhar.',
      type: 'delivery_update',
      data: { product_order_id, tracking_url: delivery.tracking_url ?? null },
    });

    return jsonResponse(req, {
      ok: true,
      tracking_url: delivery.tracking_url,
      status,
    });
  } catch (e) {
    log('error', 'uber-delivery-dispatch failed', { error: e instanceof Error ? e.message : String(e) });
    return jsonResponse(req, { error: e instanceof Error ? e.message : 'Erro ao despachar entrega' }, 500);
  }
});
