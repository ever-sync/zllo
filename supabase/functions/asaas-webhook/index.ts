// Webhook do Asaas: confirma o pagamento (status → pago) quando o Pix cai.
// Protegido por um token compartilhado (configurado no painel do Asaas e como
// secret ASAAS_WEBHOOK_TOKEN). verify_jwt = false (o Asaas não envia JWT Supabase).
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
    const got = req.headers.get('asaas-access-token') ?? '';
    if (!expected || got !== expected) return new Response('forbidden', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const event: string = body?.event ?? '';
    const providerId: string | undefined = body?.payment?.id;
    if (!providerId) return new Response('ignored', { status: 200 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      await admin
        .from('payments')
        .update({ status: 'pago', paid_at: new Date().toISOString() })
        .eq('provider_payment_id', providerId);
    } else if (event === 'PAYMENT_REFUNDED') {
      await admin.from('payments').update({ status: 'estornado' }).eq('provider_payment_id', providerId);
    }

    return new Response('ok', { status: 200 });
  } catch {
    // 200 evita reentregas infinitas do provedor; erros reais aparecem nos logs.
    return new Response('ok', { status: 200 });
  }
});
