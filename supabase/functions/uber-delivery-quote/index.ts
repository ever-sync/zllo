import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { log } from '../_shared/log.ts';
import {
  createDeliveryQuote,
  formatAddressLabel,
  isUberConfigured,
  isUberMock,
  type AddressParts,
} from '../_shared/uber-direct.ts';

function shopPickup(row: {
  name: string;
  address: string | null;
  pickup_street: string | null;
  pickup_number: string | null;
  pickup_cep: string | null;
  pickup_city: string | null;
  pickup_uf: string | null;
}): AddressParts {
  if (row.pickup_street) {
    return {
      street: row.pickup_street,
      number: row.pickup_number,
      cep: row.pickup_cep,
      city: row.pickup_city,
      uf: row.pickup_uf,
    };
  }
  return { street: row.address ?? row.name, city: 'São Paulo', uf: 'SP', cep: '01310100' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  try {
    const enabled = isUberConfigured() || isUberMock();
    if (!enabled) {
      return jsonResponse(req, { enabled: false });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse(req, { error: 'Não autenticado' }, 401);

    const { shop_id, dropoff } = await req.json().catch(() => ({}));
    if (!shop_id || !dropoff) {
      return jsonResponse(req, { error: 'shop_id e dropoff obrigatórios' }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: shop } = await admin
      .from('shops')
      .select('id, name, address, pickup_street, pickup_number, pickup_cep, pickup_city, pickup_uf')
      .eq('id', shop_id)
      .maybeSingle();
    if (!shop) return jsonResponse(req, { error: 'Loja não encontrada' }, 404);

    const drop = dropoff as AddressParts;
    if (!drop.street || !drop.number || !drop.city || !drop.uf || !drop.cep) {
      return jsonResponse(req, { error: 'Complete rua, número, cidade, UF e CEP no endereço' }, 400);
    }

    const pickup = shopPickup(shop);
    const quote = await createDeliveryQuote(pickup, drop);
    const fee = Number(quote.fee) / 100;

    return jsonResponse(req, {
      enabled: true,
      quote_id: quote.id,
      fee,
      fee_label: fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      duration_minutes: quote.duration ?? null,
      expires: quote.expires ?? null,
      address_label: formatAddressLabel(drop),
    });
  } catch (e) {
    log('error', 'uber-delivery-quote failed', { error: e instanceof Error ? e.message : String(e) });
    return jsonResponse(req, {
      enabled: true,
      error: e instanceof Error ? e.message : 'Não foi possível cotar a entrega',
    }, 422);
  }
});
