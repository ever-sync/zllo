import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../../client-shell';
import { ProdutoClient } from './produto-client';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  shop_id: string;
  photos: string[];
  shop: { name: string } | null;
};

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id, name, description, category, price, stock, shop_id, photos, shop:shops(name)')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  const p = data as unknown as ProductRow | null;
  if (!p) notFound();

  const product = {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: Number(p.price),
    stock: p.stock,
    shop_id: p.shop_id,
    shop_name: p.shop?.name ?? 'Loja',
    photo: p.photos?.[0] ?? null,
    photos: p.photos ?? [],
  };

  return (
    <ClientShell>
      <ProdutoClient product={product} />
    </ClientShell>
  );
}
