// E2E do fluxo de reparo (modo teste, sem Asaas real).
// Roda via scripts/repair-e2e.sh
import { createClient } from '@supabase/supabase-js';

const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = process.env;
if (!API_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Defina API_URL, ANON_KEY e SERVICE_ROLE_KEY em supabase/functions/.env');
  process.exit(1);
}

const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const client = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
const shopUser = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });

console.log('— E2E reparo (teste) —');

await client.auth.signInWithPassword({ email: 'cliente@zllo.dev', password: 'senha123' });
await shopUser.auth.signInWithPassword({ email: 'assistencia@zllo.dev', password: 'senha123' });

const { data: device } = await client
  .from('devices')
  .select('id')
  .limit(1)
  .maybeSingle();
if (!device?.id) {
  console.error('Cliente seed sem aparelho cadastrado.');
  process.exit(1);
}

const { data: requestId, error: reqErr } = await client.rpc('create_repair_request', {
  p_device_id: device.id,
  p_description: 'E2E teste — tela não liga após queda.',
  p_photos: [],
  p_shipping_type: 'levar_local',
  p_lat: -23.5614,
  p_lng: -46.6559,
});
if (reqErr) {
  console.error('create_repair_request:', reqErr.message);
  process.exit(1);
}
console.log('solicitação:', String(requestId).slice(0, 8));

const { data: shop } = await admin.from('shops').select('id').eq('name', 'Reparo Smart').single();
const { data: target } = await admin
  .from('request_targets')
  .select('id')
  .eq('request_id', requestId)
  .eq('shop_id', shop.id)
  .maybeSingle();

const { data: quote, error: qErr } = await shopUser
  .from('quotes')
  .insert({
    request_id: requestId,
    shop_id: shop.id,
    value: 199,
    description: 'Troca de tela (E2E)',
    warranty_days: 90,
  })
  .select('id')
  .single();
if (qErr) {
  console.error('quote insert:', qErr.message);
  process.exit(1);
}
await shopUser
  .from('request_targets')
  .update({ status: 'orcou' })
  .eq('id', target?.id);
console.log('orçamento enviado:', String(quote.id).slice(0, 8));

const { data: orderId, error: accErr } = await client.rpc('accept_quote', { p_quote_id: quote.id });
if (accErr) {
  console.error('accept_quote:', accErr.message);
  process.exit(1);
}
console.log('OS criada:', String(orderId).slice(0, 8));

const { error: payErr } = await client.rpc('confirm_payment_test', { p_kind: 'reparo', p_order_id: orderId });
if (payErr) {
  console.error('confirm_payment_test:', payErr.message);
  process.exit(1);
}

const { data: pay } = await admin.from('payments').select('status').eq('order_id', orderId).maybeSingle();
console.log('pagamento:', pay?.status);
console.log('\n✅ Fluxo reparo OK (solicitar → orçar → aceitar → pagar teste).');
