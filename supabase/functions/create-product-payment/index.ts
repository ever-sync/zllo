// Cria uma cobrança Pix no Asaas (split 97% loja / 3% zllo) para um pedido de
// produtos do marketplace e grava o Pix em `product_orders`. Retorna o QR Code.
// Espelha create-pix-payment (reparo), mas para a tabela product_orders.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { log } from '../_shared/log.ts';

const ASAAS_BASE = Deno.env.get('ASAAS_BASE_URL') ?? 'https://api-sandbox.asaas.com/v3';
const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
const COMMISSION = 0.03;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// Asaas autentica via header `access_token` (não Bearer).
async function asaas(path: string, init?: RequestInit) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY, ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.errors?.[0]?.description ?? `Asaas ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Não autenticado' }, 401);

    const { product_order_id } = await req.json().catch(() => ({}));
    if (!product_order_id) return json({ error: 'product_order_id obrigatório' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: order } = await admin
      .from('product_orders')
      .select('id, total, client_id, shop_id, status, pix_payload, pix_qr')
      .eq('id', product_order_id)
      .maybeSingle();
    if (!order) return json({ error: 'Pedido não encontrado' }, 404);
    if (order.client_id !== user.id) return json({ error: 'Sem permissão' }, 403);
    if (order.status === 'pago') return json({ error: 'Este pedido já foi pago.' }, 409);
    if (order.status === 'cancelado') return json({ error: 'Pedido cancelado.' }, 409);
    // Idempotente: se já há Pix pendente, devolve o mesmo.
    if (order.pix_payload) {
      return json({ payload: order.pix_payload, encodedImage: order.pix_qr, value: Number(order.total) });
    }

    const { data: shop } = await admin
      .from('shops')
      .select('asaas_wallet_id')
      .eq('id', order.shop_id)
      .maybeSingle();
    if (!shop?.asaas_wallet_id) return json({ error: 'A loja ainda não configurou a conta de recebimento.' }, 422);

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, cpf, asaas_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.asaas_customer_id as string | null;
    if (!customerId) {
      const customer = await asaas('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: profile?.full_name ?? 'Cliente zllo', cpfCnpj: profile?.cpf }),
      });
      customerId = customer.id;
      await admin.from('profiles').update({ asaas_customer_id: customerId }).eq('id', user.id);
    }

    const value = Number(order.total);
    const charge = await asaas('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate: new Date().toISOString().slice(0, 10),
        description: `Compra zllo • Pedido ${String(product_order_id).slice(0, 8)}`,
        externalReference: product_order_id,
        split: [{ walletId: shop.asaas_wallet_id, percentualValue: 97 }],
      }),
    });

    const qr = await asaas(`/payments/${charge.id}/pixQrCode`);

    const commission = Math.round(value * COMMISSION * 100) / 100;
    await admin
      .from('product_orders')
      .update({
        commission,
        shop_amount: Math.round((value - commission) * 100) / 100,
        provider_payment_id: charge.id,
        pix_payload: qr.payload,
        pix_qr: qr.encodedImage,
      })
      .eq('id', product_order_id);

    return json({ payload: qr.payload, encodedImage: qr.encodedImage, value });
  } catch (e) {
    log('error', 'create-product-payment failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500);
  }
});
