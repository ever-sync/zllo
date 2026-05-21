// E2E do Pix do marketplace (sandbox Asaas).
// Roda via scripts/pix-test.sh (que injeta API_URL/ANON_KEY/SERVICE_ROLE_KEY/ASAAS_WEBHOOK_TOKEN).
// Fluxo: cria pedido → gera Pix (cobrança real no Asaas) → simula webhook → confirma pago + baixa estoque.
import { createClient } from '@supabase/supabase-js';

const { API_URL, ANON_KEY, SERVICE_ROLE_KEY, ASAAS_WEBHOOK_TOKEN } = process.env;
const FN = `${API_URL}/functions/v1`;

const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cli = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });

console.log('— Teste Pix (sandbox) —');
await cli.auth.signInWithPassword({ email: 'cliente@zllo.dev', password: 'senha123' });

const { data: l1 } = await admin.from('shops').select('id, asaas_wallet_id').eq('name', 'Reparo Smart').single();
console.log('walletId loja1:', l1.asaas_wallet_id ?? '(vazio — defina em Configurações)');

const { data: prod } = await admin
  .from('products').select('id, name, stock').eq('shop_id', l1.id).gt('stock', 0).limit(1).single();

const { data: orderId, error: oErr } = await cli.rpc('create_product_order', {
  p_shop_id: l1.id, p_items: [{ product_id: prod.id, qty: 1 }], p_shipping_type: 'retirada',
});
if (oErr) { console.error('falha ao criar pedido:', oErr.message); process.exit(1); }
console.log('pedido criado:', String(orderId).slice(0, 8), '·', prod.name);

const { data: pay, error: payErr } = await cli.functions.invoke('create-product-payment', {
  body: { product_order_id: orderId },
});
if (payErr || pay?.error) {
  let msg = pay?.error ?? null;
  try { msg = msg ?? (await payErr.context.json())?.error; } catch {}
  console.log('❌ Pix NÃO gerado:', payErr?.context?.status ?? '', msg ?? payErr?.message);
  console.log('   → preencha ASAAS_API_KEY em supabase/functions/.env e o walletId da loja em Configurações.');
  await admin.from('product_orders').delete().eq('id', orderId);
  process.exit(1);
}
console.log('✅ Pix gerado! payload:', String(pay.payload).slice(0, 36) + '…', '| QR:', pay.encodedImage ? 'sim' : 'não', '| R$' + pay.value);

const { data: ord } = await admin
  .from('product_orders').select('provider_payment_id, commission, shop_amount').eq('id', orderId).single();
console.log('   cobrança Asaas:', ord.provider_payment_id, '| split → loja R$' + ord.shop_amount + ' · zllo R$' + ord.commission);

// simula o webhook de confirmação do Asaas
const stockBefore = (await admin.from('products').select('stock').eq('id', prod.id).single()).data.stock;
const wh = await fetch(`${FN}/asaas-webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'asaas-access-token': ASAAS_WEBHOOK_TOKEN },
  body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', payment: { id: ord.provider_payment_id } }),
});
console.log('webhook ->', wh.status);

const { data: ord2 } = await admin.from('product_orders').select('status, paid_at').eq('id', orderId).single();
const stockAfter = (await admin.from('products').select('stock').eq('id', prod.id).single()).data.stock;
console.log(ord2.status === 'pago' ? '✅ pedido PAGO + paid_at' : '❌ status=' + ord2.status);
console.log('estoque:', stockBefore, '→', stockAfter, stockAfter === stockBefore - 1 ? '✅ baixou' : '(confira)');
console.log('\nPedido', String(orderId).slice(0, 8), 'aparece PAGO no console (Pedidos) e no Financeiro.');
