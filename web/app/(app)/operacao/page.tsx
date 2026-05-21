import { createClient } from '@/lib/supabase/server';
import { TARGET_SELECT, type FeedItem } from '@/lib/feed';
import { OperacaoBoard } from './operacao-board';

export default async function OperacaoPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="px-8 py-7">
        <h1 className="font-head text-2xl font-extrabold text-ink">Operação</h1>
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-head text-base font-bold text-ink">Configure sua loja</p>
          <p className="mx-auto mt-1 max-w-md font-body text-sm text-g600">
            Você ainda não tem uma loja cadastrada. O cadastro da loja chega numa
            próxima fase do console.
          </p>
        </div>
      </div>
    );
  }

  const { data } = await supabase
    .from('request_targets')
    .select(TARGET_SELECT)
    .eq('shop_id', shop.id)
    .order('notified_at', { ascending: false });

  const initial = (data as unknown as FeedItem[]) ?? [];

  return (
    <div className="px-8 py-7">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">Operação</h1>
          <p className="font-body text-sm text-g600">
            {shop.name} · pedidos chegando em tempo real
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          <span className="font-body text-xs text-g600">ao vivo</span>
        </span>
      </header>

      <OperacaoBoard shopId={shop.id} initial={initial} />
    </div>
  );
}
