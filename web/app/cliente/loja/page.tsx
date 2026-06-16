import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/format';
import { STATUS_META } from '@/lib/product-orders';
import { ClientShell } from '../client-shell';
import { LojaProductCard } from './loja-product-card';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  shop_id: string;
  photos: string[];
  shop: { name: string; rating: number } | null;
};

type ProductOrder = {
  id: string;
  total: number;
  status: string;
  shipping_type: string;
  created_at: string;
  shop: { name: string } | null;
  items: { id: string; name: string; qty: number; subtotal: number }[];
};

export default async function ClienteLojaPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, category, price, stock, shop_id, photos, shop:shops(name, rating)')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('product_orders')
      .select('id, total, status, shipping_type, created_at, shop:shops(name), items:product_order_items(id, name, qty, subtotal)')
      .order('created_at', { ascending: false }),
  ]);

  const productRows = (products as unknown as Product[] | null) ?? [];
  const orderRows = (orders as unknown as ProductOrder[] | null) ?? [];

  return (
    <ClientShell>
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">Loja</h1>
          <p className="mt-1 text-sm text-g600">Produtos das assistências perto de você.</p>
        </div>
        <Link
          href="/cliente/carrinho"
          className="rounded-xl border border-line bg-white px-4 py-2.5 font-head text-sm font-bold text-ink hover:bg-g100"
        >
          Ver carrinho →
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {productRows.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center text-sm text-g600 md:col-span-2 xl:col-span-3">
            Nenhum produto ativo encontrado.
          </div>
        ) : (
          productRows.map((product) => <LojaProductCard key={product.id} product={product} />)
        )}
      </section>

      <section className="mt-6 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
        <h2 className="font-head text-lg font-extrabold text-ink">Minhas compras</h2>
        <div className="mt-4 flex flex-col gap-3">
          {orderRows.length === 0 ? (
            <p className="text-sm text-g600">Nenhuma compra ainda.</p>
          ) : (
            orderRows.map((order) => {
              const st = STATUS_META[order.status] ?? { label: order.status, cls: 'bg-g100 text-g600' };
              return (
                <Link
                  key={order.id}
                  href={`/cliente/pedido-produto/${order.id}`}
                  className="block rounded-xl border border-line p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-head text-base text-ink">{order.shop?.name ?? 'Loja'}</strong>
                    <span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + st.cls}>{st.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-g600">
                    {order.items.map((item) => `${item.qty}x ${item.name}`).join(', ') || 'Itens do pedido'}
                  </p>
                  <strong className="mt-2 block font-head text-sm text-blue">{formatBRL(Number(order.total))}</strong>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
    </ClientShell>
  );
}
