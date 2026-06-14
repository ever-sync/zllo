'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminReconcilePayment } from '../actions';
import { formatPrice } from '@/lib/product-orders';

export type OrphanPayment = {
  kind: 'reparo' | 'produto';
  id: string;
  shop: string | null;
  amount: number;
  status: string;
  provider_payment_id: string | null;
  reason: 'pix_gerado_sem_confirmacao' | 'pendente_expirado';
  at: string;
};

const REASON_LABEL: Record<OrphanPayment['reason'], string> = {
  pix_gerado_sem_confirmacao: 'Pix gerado, webhook não confirmou',
  pendente_expirado: 'Pendente há mais de 48h',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function OrphansPanel({ orphans }: { orphans: OrphanPayment[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (orphans.length === 0) return null;

  const reconcile = async (kind: OrphanPayment['kind'], id: string) => {
    if (!window.confirm('Confirmar pagamento manualmente? Use só se o Pix foi recebido no Asaas.')) return;
    setBusy(id);
    setError(null);
    const { error: err } = await adminReconcilePayment(kind, id);
    setBusy(null);
    if (err) {
      setError(err);
      return;
    }
    router.refresh();
  };

  return (
    <section className="mb-8 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5">
      <h2 className="font-head text-base font-extrabold text-[#B91C1C]">
        Conciliação pendente ({orphans.length})
      </h2>
      <p className="mt-1 font-body text-xs text-[#991B1B]">
        Pagamentos que não foram confirmados automaticamente. Confirme manualmente após verificar no Asaas.
      </p>
      {error ? <p className="mt-2 text-sm text-[#B91C1C]">{error}</p> : null}
      <div className="mt-4 overflow-hidden rounded-xl border border-[#FECACA] bg-white">
        {orphans.map((o) => (
          <div
            key={o.kind + o.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
          >
            <div className="min-w-0">
              <p className="font-body text-sm font-bold text-ink">
                {o.kind === 'reparo' ? 'Reparo' : 'Produto'} · {o.shop ?? '—'}
              </p>
              <p className="font-body text-xs text-g600">
                {REASON_LABEL[o.reason]} · {fmt(o.at)}
                {o.provider_payment_id ? ` · ${o.provider_payment_id.slice(0, 12)}…` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-head text-sm font-bold text-ink">{formatPrice(Number(o.amount))}</span>
              <button
                type="button"
                onClick={() => void reconcile(o.kind, o.id)}
                disabled={busy === o.id}
                className="rounded-lg bg-blue px-3 py-1.5 font-head text-xs font-bold text-white disabled:opacity-60"
              >
                {busy === o.id ? '…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
