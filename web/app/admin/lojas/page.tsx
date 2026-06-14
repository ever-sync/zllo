import Link from 'next/link';
import { fetchAdminShops } from '@/lib/cached-data';

type AdminShop = {
  id: string;
  name: string;
  is_online: boolean;
  rating: number;
  reviews_count: number;
  has_wallet: boolean;
  products: number;
  orders: number;
};

export default async function AdminLojas() {
  const data = await fetchAdminShops();
  const shops = (data as unknown as AdminShop[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Lojas</h1>
        <p className="font-body text-sm text-g600">{shops.length} assistências cadastradas.</p>
      </header>

      {shops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">Nenhuma loja ainda.</p>
          <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-blue">
            Voltar ao painel
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-line bg-g100 px-4 py-2.5 font-head text-xs font-bold uppercase tracking-wide text-g600">
            <span>Loja</span>
            <span className="text-right">Nota</span>
            <span className="text-right">Produtos</span>
            <span className="text-right">Vendas</span>
            <span className="text-right">Recebimento</span>
          </div>
          {shops.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-0">
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-bold text-ink">{s.name}</p>
                <span className={'font-body text-xs ' + (s.is_online ? 'text-[#15803D]' : 'text-g400')}>
                  {s.is_online ? '● online' : '○ offline'}
                </span>
              </div>
              <span className="text-right font-body text-sm text-ink">★ {Number(s.rating).toFixed(1)}</span>
              <span className="text-right font-body text-sm text-g600">{s.products}</span>
              <span className="text-right font-body text-sm text-g600">{s.orders}</span>
              <span className="text-right">
                {s.has_wallet ? (
                  <span className="rounded-md bg-[#DCFCE7] px-2 py-1 font-head text-xs font-bold text-[#15803D]">Pix ✓</span>
                ) : (
                  <span className="rounded-md bg-[#FEF3C7] px-2 py-1 font-head text-xs font-bold text-[#B45309]">sem wallet</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
