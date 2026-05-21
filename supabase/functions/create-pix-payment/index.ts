// Cria uma cobrança Pix no Asaas com split (97% loja, 3% zllo fica com a conta
// marketplace automaticamente) e grava em `payments`. Retorna o QR Code Pix.
// O provedor está isolado aqui: trocar p/ Pagar.me/Stripe = mudar só este arquivo.
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

    // Identifica o usuário pelo JWT recebido.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Não autenticado' }, 401);

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: 'order_id obrigatório' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: order } = await admin
      .from('service_orders')
      .select('id, value, client_id, shop_id, status')
      .eq('id', order_id)
      .maybeSingle();
    if (!order) return json({ error: 'OS não encontrada' }, 404);
    if (order.client_id !== user.id) return json({ error: 'Sem permissão' }, 403);

    const { data: existing } = await admin
      .from('payments')
      .select('status, pix_payload, pix_qr')
      .eq('order_id', order_id)
      .maybeSingle();
    if (existing?.status === 'pago') return json({ error: 'Esta OS já foi paga.' }, 409);
    // Se já existe um Pix pendente, devolve o mesmo (idempotente).
    if (existing?.pix_payload) {
      return json({ payload: existing.pix_payload, encodedImage: existing.pix_qr, value: Number(order.value) });
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

    const value = Number(order.value);
    const charge = await asaas('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate: new Date().toISOString().slice(0, 10),
        description: `Reparo zllo • OS ${String(order_id).slice(0, 8)}`,
        externalReference: order_id,
        split: [{ walletId: shop.asaas_wallet_id, percentualValue: 97 }],
      }),
    });

    const qr = await asaas(`/payments/${charge.id}/pixQrCode`);

    const commission = Math.round(value * COMMISSION * 100) / 100;
    await admin.from('payments').upsert(
      {
        order_id,
        client_id: user.id,
        shop_id: order.shop_id,
        amount: value,
        commission,
        shop_amount: Math.round((value - commission) * 100) / 100,
        status: 'pendente',
        method: 'pix',
        provider: 'asaas',
        provider_payment_id: charge.id,
        pix_payload: qr.payload,
        pix_qr: qr.encodedImage,
      },
      { onConflict: 'order_id' },
    );

    return json({ payload: qr.payload, encodedImage: qr.encodedImage, value });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500);
  }
});
