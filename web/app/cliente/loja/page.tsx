import { createClient } from '@/lib/supabase/server';
import { fetchActiveProducts } from '@/lib/cached-data';
import { formatBRL } from '@/lib/format';
import { ClientShell } from '../client-shell';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
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
  const [products, { data: orders }] = await Promise.all([
    fetchActiveProducts(),
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
      <div className="mb-6">
        <h1 className="font-head text-2xl font-extrabold text-ink">Loja</h1>
        <p className="mt-1 text-sm text-g600">Veja produtos disponíveis nas assistências e acompanhe compras.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {productRows.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center text-sm text-g600">
            Nenhum produto ativo encontrado.
          </div>
        ) : (
          productRows.map((product) => (
            <article key={product.id} className="rounded-[14px] border border-line bg-white p-4">
              <div className="mb-4 flex h-28 items-center justify-center rounded-xl bg-g100 font-head text-4xl font-black text-blue">
                {product.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="font-head text-base font-extrabold text-ink">{product.name}</h2>
                <strong className="whitespace-nowrap font-head text-sm text-blue">{formatBRL(Number(product.price))}</strong>
              </div>
              <p className="line-clamp-2 min-h-10 text-sm text-g600">{product.description || product.category || 'Produto disponível.'}</p>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-g600">
                <span className="truncate">{product.shop?.name ?? 'Loja zllo'}</span>
                <span>{product.stock} em estoque</span>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="mt-6 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
        <h2 className="font-head text-lg font-extrabold text-ink">Minhas compras</h2>
        <div className="mt-4 flex flex-col gap-3">
          {orderRows.length === 0 ? (
            <p className="text-sm text-g600">Nenhuma compra feita pela web/app ainda.</p>
          ) : (
            orderRows.map((order) => (
              <div key={order.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-head text-base text-ink">{order.shop?.name ?? 'Loja'}</strong>
                  <span className="rounded-full bg-g100 px-2.5 py-1 text-xs font-bold text-g600">{productStatus(order.status)}</span>
                </div>
                <p className="mt-2 text-sm text-g600">
                  {order.items.map((item) => `${item.qty}x ${item.name}`).join(', ') || 'Itens do pedido'}
                </p>
                <strong className="mt-2 block font-head text-sm text-blue">{formatBRL(Number(order.total))}</strong>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
    </ClientShell>
  );
}

function productStatus(status: string) {
  const labels: Record<string, string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    pago: 'Pago',
    separando: 'Separando',
    pronto: 'Pronto',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };
  return labels[status] ?? status;
}
