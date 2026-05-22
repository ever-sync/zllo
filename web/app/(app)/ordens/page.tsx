import { createClient } from '@/lib/supabase/server';
import { OrdensClient, type ServiceOrder } from './ordens-client';

export default async function OrdensPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Ordens de serviço</h1>
        <p className="mt-2 font-body text-sm text-g600">Configure sua loja para receber ordens.</p>
      </div>
    );
  }

  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, status, value, created_at, device:devices(brand, model, nickname), client:profiles(full_name)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <OrdensClient shopId={shop.id} initial={(orders as unknown as ServiceOrder[]) ?? []} />
    </div>
  );
}
