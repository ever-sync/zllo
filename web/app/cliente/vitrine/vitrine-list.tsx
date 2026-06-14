'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { formatBRL } from '@/lib/format';

export type ListingRow = {
  id: string;
  seller_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  price: number;
  photos: string[];
  city: string | null;
  created_at: string;
};

export function VitrineList({ listings, userId }: { listings: ListingRow[]; userId: string }) {
  const [tab, setTab] = useState<'todos' | 'meus'>('todos');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let list = listings;
    if (tab === 'meus') list = list.filter((l) => l.seller_id === userId);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((l) => `${l.title} ${l.brand ?? ''} ${l.model ?? ''}`.toLowerCase().includes(term));
    }
    return list;
  }, [listings, tab, q, userId]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">Vitrine</h1>
          <p className="mt-1 text-sm text-g600">Celulares à venda entre usuários da zllo.</p>
        </div>
        <Link
          href="/cliente/vitrine/novo"
          className="rounded-xl bg-lime px-4 py-2.5 font-head text-sm font-extrabold text-ink"
        >
          Anunciar celular
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por modelo, marca…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
        />
        {q ? (
          <button type="button" onClick={() => setQ('')} className="text-xs font-semibold text-g600">
            Limpar
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <Chip active={tab === 'todos'} onClick={() => setTab('todos')}>
          Todos
        </Chip>
        <Chip active={tab === 'meus'} onClick={() => setTab('meus')}>
          Meus anúncios
        </Chip>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center">
          <h2 className="font-head text-lg font-extrabold text-ink">
            {tab === 'meus' ? 'Nenhum anúncio seu' : q ? 'Nenhum resultado' : 'Vitrine vazia'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-g600">
            {tab === 'meus'
              ? 'Anuncie um celular que você quer vender para aparecer aqui.'
              : q
                ? 'Tente outro termo de busca.'
                : 'Seja o primeiro a anunciar um aparelho na sua região.'}
          </p>
          {tab === 'meus' || !q ? (
            <Link href="/cliente/vitrine/novo" className="mt-5 inline-flex rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white">
              Anunciar celular
            </Link>
          ) : (
            <button type="button" onClick={() => setQ('')} className="mt-5 text-sm font-semibold text-blue">
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((listing) => (
            <Link
              key={listing.id}
              href={`/cliente/vitrine/${listing.id}`}
              className="flex gap-3 rounded-[14px] border border-line bg-white p-3 transition-shadow hover:shadow-md"
            >
              {listing.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.photos[0]} alt="" className="h-[84px] w-[84px] shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-xl bg-g100 text-g400">
                  📱
                </div>
              )}
              <div className="min-w-0 flex-1">
                <strong className="block truncate font-head text-[15px] text-ink">{listing.title}</strong>
                <p className="truncate text-xs text-g600">
                  {[listing.brand, listing.model].filter(Boolean).join(' · ') || 'Celular'}
                </p>
                <p className="mt-1 font-head text-lg font-extrabold text-ink">{formatBRL(Number(listing.price))}</p>
                {listing.city ? <p className="mt-0.5 text-xs text-g600">{listing.city}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ' +
        (active ? 'bg-blue text-white' : 'border border-line bg-white text-g600 hover:bg-g100')
      }
    >
      {children}
    </button>
  );
}
