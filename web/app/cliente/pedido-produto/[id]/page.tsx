import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../../client-shell';
import { PedidoProdutoClient } from './pedido-produto-client';

type Order = {
  id: string;
  shop_id: string;
  total: number;
  status: string;
  shipping_type: 'retirada' | 'entrega';
  address: string | null;
  created_at: string;
  paid_at: string | null;
  shop: { name: string } | null;
  items: { id: string; name: string; qty: number; unit_price: number; subtotal: number }[];
};

export default async function PedidoProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_orders')
    .select(
      'id, shop_id, total, status, shipping_type, address, created_at, paid_at, shop:shops(name), items:product_order_items(id, name, qty, unit_price, subtotal)',
    )
    .eq('id', id)
    .maybeSingle();

  return (
    <ClientShell>
      <PedidoProdutoClient
        orderId={id}
        initial={(data as unknown as Order) ?? null}
        initialError={!!error}
      />
    </ClientShell>
  );
}
