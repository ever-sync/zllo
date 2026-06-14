'use client';

import { useState } from 'react';
import { adminSetProductActive } from '../actions';
import { formatPrice } from '@/lib/product-orders';

export type AdminProduct = {
  id: string;
  name: string;
  shop: string | null;
  category: string | null;
  price: number;
  stock: number;
  is_active: boolean;
};

export function ProdutosAdmin({ initial }: { initial: AdminProduct[] }) {
  const [items, setItems] = useState<AdminProduct[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (p: AdminProduct) => {
    setBusy(p.id);
    const nextActive = !p.is_active;
    const { error } = await adminSetProductActive(p.id, nextActive);
    setBusy(null);
    if (error) {
      alert(error);
      return;
    }
    setItems((prev) => prev.map((row) => (row.id === p.id ? { ...row, is_active: nextActive } : row)));
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="font-body text-sm text-g600">Nenhum produto no marketplace.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 border-b border-line bg-g100 px-4 py-2.5 font-head text-xs font-bold uppercase tracking-wide text-g600">
        <span>Produto</span>
        <span>Loja</span>
        <span className="text-right">Preço</span>
        <span className="text-right">Estoque</span>
        <span className="text-right">Ação</span>
      </div>
      {items.map((p) => (
        <div
          key={p.id}
          className={'grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-0 ' + (p.is_active ? '' : 'opacity-60')}
        >
          <div className="min-w-0">
            <p className="truncate font-body text-sm font-bold text-ink">{p.name}</p>
            <span className={'font-body text-xs ' + (p.is_active ? 'text-[#15803D]' : 'text-[#B91C1C]')}>
              {p.is_active ? 'Publicado' : 'Despublicado'}
            </span>
          </div>
          <span className="truncate font-body text-sm text-g600">{p.shop ?? '—'}</span>
          <span className="text-right font-body text-sm text-ink">{formatPrice(Number(p.price))}</span>
          <span className="text-right font-body text-sm text-g600">{p.stock}</span>
          <span className="text-right">
            <button
              onClick={() => toggle(p)}
              disabled={busy === p.id}
              className={
                'rounded-lg border px-3 py-1.5 font-head text-xs font-bold transition-colors disabled:opacity-60 ' +
                (p.is_active
                  ? 'border-line text-[#B91C1C] hover:bg-[#FEE2E2]'
                  : 'border-line text-[#15803D] hover:bg-[#DCFCE7]')
              }
            >
              {p.is_active ? 'Despublicar' : 'Republicar'}
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
