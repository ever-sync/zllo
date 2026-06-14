import { fetchAdminProducts } from '@/lib/cached-data';
import { ProdutosAdmin, type AdminProduct } from './produtos-admin';

export default async function AdminProdutos() {
  const data = await fetchAdminProducts();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Produtos</h1>
        <p className="font-body text-sm text-g600">Moderação do catálogo do marketplace.</p>
      </header>
      <ProdutosAdmin initial={(data as unknown as AdminProduct[]) ?? []} />
    </div>
  );
}
