import { createClient } from '@/lib/supabase/server';
import { SHOP_ORDER_SELECT, type ShopOrder } from '@/lib/product-orders';
import { PedidosClient } from './pedidos-client';

export default async function PedidosPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Pedidos</h1>
        <p className="mt-2 font-body text-sm text-g600">Configure sua loja para receber pedidos.</p>
      </div>
    );
  }

  const { data: orders } = await supabase
    .from('product_orders')
    .select(SHOP_ORDER_SELECT)
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PedidosClient shopId={shop.id} initial={(orders as unknown as ShopOrder[]) ?? []} />
    </div>
  );
}
