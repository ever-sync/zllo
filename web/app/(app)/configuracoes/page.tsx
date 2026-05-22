import { createClient } from '@/lib/supabase/server';
import { ConfiguracoesClient, type ShopConfig } from './configuracoes-client';

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Configurações</h1>
        <p className="mt-2 font-body text-sm text-g600">Loja não encontrada.</p>
      </div>
    );
  }

  const cfg: ShopConfig = {
    id: shop.id,
    name: shop.name ?? '',
    cnpj: shop.cnpj ?? '',
    address: shop.address ?? '',
    brands: shop.brands ?? [],
    service_radius_km: Number(shop.service_radius_km ?? 10),
    is_online: shop.is_online ?? true,
    asaas_wallet_id: shop.asaas_wallet_id ?? '',
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <ConfiguracoesClient initial={cfg} />
    </div>
  );
}
