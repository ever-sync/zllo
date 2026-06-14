import { parseShopLocation } from '@/lib/shop-location';
import { createClient } from '@/lib/supabase/server';
import { ConfiguracoesClient, type ShopConfig } from './configuracoes-client';

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  let initial: ShopConfig | null = null;

  if (shop) {
    const loc = parseShopLocation(shop.location);
    initial = {
      id: shop.id,
      name: shop.name ?? '',
      cnpj: shop.cnpj ?? '',
      address: shop.address ?? '',
      brands: shop.brands ?? [],
      service_radius_km: Number(shop.service_radius_km ?? 10),
      is_online: shop.is_online ?? true,
      asaas_wallet_id: shop.asaas_wallet_id ?? '',
      lat: loc?.lat,
      lng: loc?.lng,
    };
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-head text-2xl font-black text-ink">
        {initial ? 'Configurações' : 'Configurar loja'}
      </h1>
      <p className="mt-1 font-body text-sm text-g600">
        {initial
          ? 'Dados da loja, raio de atendimento e recebimento.'
          : 'Complete o cadastro para receber orçamentos.'}
      </p>
      <div className="mt-6">
        <ConfiguracoesClient initial={initial} />
      </div>
    </div>
  );
}
