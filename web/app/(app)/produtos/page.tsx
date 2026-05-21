import { createClient } from '@/lib/supabase/server';
import { PRODUCT_SELECT, type Product } from '@/lib/products';
import { ProdutosManager } from './produtos-manager';

export default async function ProdutosPage() {
  const supabase = await createClient();

  const { data: shop } = await supabase.rpc('get_my_shop');
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? '';

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Produtos</h1>
        <p className="mt-2 font-body text-sm text-g600">
          Configure os dados da sua loja antes de cadastrar produtos.
        </p>
      </div>
    );
  }

  const { data: products } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Produtos</h1>
        <p className="font-body text-sm text-g600">
          Gerencie o que sua loja vende no marketplace do app.
        </p>
      </header>
      <ProdutosManager shopId={shop.id} userId={userId} initial={(products as Product[]) ?? []} />
    </div>
  );
}
