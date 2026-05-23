import { createClient } from '@/lib/supabase/server';

type RankRow = { id: string; name: string; rating: number; reviews_count: number };
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client: { full_name: string | null } | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export default async function ReputacaoPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-head text-base font-bold text-ink">Configure sua loja</p>
        </div>
      </div>
    );
  }

  const [{ data: rankData }, { data: revData }, { data: ordersData }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, name, rating, reviews_count')
      .order('rating', { ascending: false })
      .order('reviews_count', { ascending: false })
      .limit(8),
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, client:profiles(full_name)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('service_orders').select('id, status').eq('shop_id', shop.id),
  ]);

  const ranking = (rankData as RankRow[]) ?? [];
  const reviews = (revData as unknown as Review[]) ?? [];
  const orders = (ordersData as { id: string; status: string }[]) ?? [];

  const concluidas = orders.filter((o) => o.status === 'concluida').length;
  const taxa = orders.length ? Math.round((concluidas / orders.length) * 100) : 0;
  const rating = Number(shop.rating ?? 0);
  const reviewsCount = shop.reviews_count ?? 0;
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => r.rating === star).length;
    return { star, n, pct: reviews.length ? Math.round((n / reviews.length) * 100) : 0 };
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* KPIs */}
      <div className="mb-4 grid grid-cols-3 gap-3.5">
        <Kpi label="Nota zllo" value={`★ ${rating.toFixed(1)}`} />
        <Kpi label="Avaliações" value={String(reviewsCount)} />
        <Kpi label="Taxa de conclusão" value={`${taxa}%`} />
      </div>

      {/* Resumo + distribuição */}
      <div className="mb-4 flex flex-col gap-6 rounded-[14px] bg-gradient-to-br from-ink to-[#2a2a2a] p-6 text-white sm:flex-row sm:items-center">
        <div className="shrink-0">
          <div className="font-head text-[52px] font-black leading-none tracking-[-3px] text-lime">
            {rating.toFixed(1)}
          </div>
          <div className="mt-1 text-[11px] text-g400">★★★★★ · {reviewsCount} avaliações</div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-2">
              <span className="w-2.5 text-[11px] text-g400">{d.star}</span>
              <div className="h-[7px] flex-1 overflow-hidden rounded bg-white/10">
                <div className="h-full rounded bg-lime" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="w-7 text-right text-[11px] text-g400">{d.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="mb-4 rounded-[14px] border border-line bg-white p-[18px]">
        <h2 className="mb-3 font-head text-[15px] font-extrabold text-ink">Ranking por nota</h2>
        {ranking.length === 0 ? (
          <p className="font-body text-sm text-g600">Sem dados de ranking.</p>
        ) : (
          ranking.map((r, i) => {
            const you = r.id === shop.id;
            return (
              <div
                key={r.id}
                className={
                  'flex items-center gap-3 py-2.5 ' +
                  (you ? 'rounded-md bg-lime px-2.5' : '')
                }
              >
                <span className="w-6 font-head text-base font-black text-ink">{i + 1}</span>
                <span className="flex-1 truncate font-body text-sm text-ink">
                  {r.name}
                  {you ? <span className="ml-1.5 font-head text-[9px] font-bold text-blue">VOCÊ</span> : null}
                </span>
                <span className="font-head text-sm font-bold text-ink">★ {Number(r.rating).toFixed(1)}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Avaliações */}
      <div className="rounded-[14px] border border-line bg-white p-[18px]">
        <h2 className="mb-3 font-head text-[15px] font-extrabold text-ink">Avaliações recentes</h2>
        {reviews.length === 0 ? (
          <p className="font-body text-sm leading-relaxed text-g600">
            Ainda não há avaliações. Conclua reparos para receber as primeiras.
          </p>
        ) : (
          reviews.slice(0, 12).map((r, i, arr) => (
            <div
              key={r.id}
              className={'py-3 ' + (i < arr.length - 1 ? 'border-b border-g100' : '')}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-body text-sm font-bold text-ink">
                  {r.client?.full_name?.split(' ')[0] ?? 'Cliente'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#F59E0B]">
                    {'★'.repeat(r.rating)}
                    <span className="text-g400">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                  <span className="text-[11px] text-g400">{fmtDate(r.created_at)}</span>
                </div>
              </div>
              {r.comment ? (
                <p className="font-body text-[13px] leading-relaxed text-g600">{r.comment}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-[18px] py-4">
      <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.6px] text-g600">
        {label}
      </div>
      <div className="font-head text-[26px] font-extrabold leading-none tracking-[-1px] text-ink">
        {value}
      </div>
    </div>
  );
}
