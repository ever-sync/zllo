'use client';

import Link from 'next/link';
import { useState } from 'react';
import { adminResolveDispute } from '../actions';
import type { Database } from '@/lib/database.types';
import { formatPrice } from '@/lib/product-orders';

type DStatus = Database['public']['Enums']['dispute_status'];

export type Dispute = {
  id: string;
  kind: 'reparo' | 'produto';
  status: string;
  reason: string;
  resolution: string | null;
  shop: string | null;
  client: string | null;
  opened_by: 'cliente' | 'loja';
  value: number | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  aberta: { label: 'Aberta', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
  em_analise: { label: 'Em análise', cls: 'bg-[#FEF3C7] text-[#B45309]' },
  resolvida: { label: 'Resolvida', cls: 'bg-[#DCFCE7] text-[#15803D]' },
  recusada: { label: 'Recusada', cls: 'bg-g100 text-g600' },
  cancelada: { label: 'Cancelada', cls: 'bg-g100 text-g600' },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function hoursOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

export function DisputasAdmin({ initial }: { initial: Dispute[] }) {
  const [items, setItems] = useState<Dispute[]>(initial);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const resolve = async (id: string, status: DStatus) => {
    setBusy(id);
    const resolution = notes[id] ?? '';
    const { error } = await adminResolveDispute(id, status, resolution);
    setBusy(null);
    if (error) {
      alert(error);
      return;
    }
    setItems((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status, resolution: resolution || d.resolution } : d,
      ),
    );
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="font-body text-sm text-g600">Nenhuma disputa. 🎉</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-blue">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((d) => {
        const meta = STATUS_META[d.status] ?? { label: d.status, cls: 'bg-g100 text-g600' };
        const open = d.status === 'aberta' || d.status === 'em_analise';
        const ageH = hoursOpen(d.created_at);
        const slaBreached = open && ageH >= 48;
        return (
          <div key={d.id} className={'rounded-2xl border bg-white p-4 ' + (slaBreached ? 'border-[#FECACA]' : 'border-line')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-head text-sm font-bold text-ink">
                  {d.kind === 'produto' ? 'Produto' : 'Reparo'} · {d.shop ?? '—'}
                </p>
                <p className="font-body text-xs text-g600">
                  {d.client?.split(' ')[0] ?? 'Cliente'} · aberta por <b>{d.opened_by}</b> · {fmt(d.created_at)}
                  {open ? ` · ${ageH}h aberta` : ''}
                  {d.value != null ? ` · ${formatPrice(Number(d.value))}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={'rounded-md px-2 py-1 font-head text-xs font-bold ' + meta.cls}>{meta.label}</span>
                {slaBreached ? (
                  <span className="rounded-md bg-[#FEE2E2] px-2 py-0.5 font-head text-[10px] font-bold text-[#B91C1C]">
                    SLA 48h
                  </span>
                ) : null}
              </div>
            </div>

            <p className="mt-3 rounded-lg bg-g100 px-3 py-2 font-body text-sm text-ink">“{d.reason}”</p>
            {d.resolution ? (
              <p className="mt-2 font-body text-sm text-g600">
                <b>Resolução:</b> {d.resolution}
              </p>
            ) : null}

            {open ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                <textarea
                  value={notes[d.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                  rows={2}
                  placeholder="Nota da resolução (opcional)…"
                  className="resize-none rounded-xl border border-line px-3 py-2 font-body text-sm text-ink outline-none focus:border-blue"
                />
                <div className="flex gap-2">
                  {d.status === 'aberta' ? (
                    <button
                      onClick={() => resolve(d.id, 'em_analise')}
                      disabled={busy === d.id}
                      className="rounded-lg border border-line px-3 py-2 font-head text-xs font-bold text-ink hover:bg-g100 disabled:opacity-60"
                    >
                      Em análise
                    </button>
                  ) : null}
                  <button
                    onClick={() => resolve(d.id, 'resolvida')}
                    disabled={busy === d.id}
                    className="rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white transition-opacity disabled:opacity-60"
                  >
                    Resolver
                  </button>
                  <button
                    onClick={() => resolve(d.id, 'recusada')}
                    disabled={busy === d.id}
                    className="rounded-lg border border-line px-3 py-2 font-head text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
