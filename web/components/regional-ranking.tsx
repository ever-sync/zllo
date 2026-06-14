import Link from 'next/link';
import { rankBadge, type RegionalRankRow } from '@/lib/ranking';

export function RegionalRanking({ rows }: { rows: RegionalRankRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-head text-lg font-extrabold text-ink">Melhores assistências perto de você</h2>
          <p className="mt-0.5 text-xs text-g600">Ranking regional por nota e avaliações</p>
        </div>
        <Link href="/cliente/solicitar" className="text-sm font-semibold text-blue">
          Pedir assistência
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const badge = rankBadge(row.badge);
          return (
            <div
              key={row.id}
              className={
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 ' +
                (row.rank_position === 1 ? 'border-lime bg-[#F7FEE7]' : 'border-line')
              }
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink font-head text-sm font-black text-white">
                {row.rank_position}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate font-head text-sm text-ink">{row.name}</strong>
                <p className="text-xs text-g600">
                  ★ {Number(row.rating).toFixed(1)} · {row.reviews_count} avaliações · {row.distance_km} km
                </p>
              </div>
              {badge ? (
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + badge.cls}>
                  {badge.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
