'use client';

import { useMemo, useState } from 'react';
import { formatPrice } from '@/lib/product-orders';
import {
  downloadCsv,
  filterTxs,
  PERIOD_LABELS,
  txsToCsv,
  type FinancePeriod,
  type FinanceTx,
} from '@/lib/finance';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function FinanceiroClient({ txs }: { txs: FinanceTx[] }) {
  const [period, setPeriod] = useState<FinancePeriod>('30d');

  const filtered = useMemo(() => filterTxs(txs, period), [txs, period]);
  const totalShare = filtered.reduce((s, t) => s + t.share, 0);
  const totalGross = filtered.reduce((s, t) => s + t.gross, 0);
  const totalFee = totalGross - totalShare;

  const exportCsv = () => {
    const suffix = period === 'all' ? 'completo' : period;
    downloadCsv(`zllo-financeiro-${suffix}.csv`, txsToCsv(filtered));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as FinancePeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={
                'rounded-full px-3.5 py-1.5 font-head text-xs font-bold transition-colors ' +
                (period === p ? 'bg-blue text-white' : 'border border-line bg-white text-g600')
              }
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-xl border border-line bg-white px-4 py-2 font-head text-xs font-bold text-ink disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
        <p className="font-body text-xs leading-relaxed text-g600">
          Os repasses Pix (97%) caem direto na sua conta Asaas via split. Saques são feitos no painel Asaas — não
          há botão de saque aqui.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-blue p-5">
          <p className="font-body text-xs text-white/70">Você recebeu</p>
          <p className="mt-1 font-head text-2xl font-black text-white">{formatPrice(totalShare)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="font-body text-xs text-g600">Vendas brutas</p>
          <p className="mt-1 font-head text-2xl font-black text-ink">{formatPrice(totalGross)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="font-body text-xs text-g600">Taxa zllo (3%)</p>
          <p className="mt-1 font-head text-2xl font-black text-ink">{formatPrice(totalFee)}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">Nenhum recebível confirmado neste período.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line bg-g100 px-4 py-2.5 font-head text-xs font-bold uppercase tracking-wide text-g600">
            <span>Origem</span>
            <span className="text-right">Bruto</span>
            <span className="text-right">Líquido</span>
          </div>
          {filtered.map((t) => (
            <div
              key={t.kind + t.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line px-4 py-3 last:border-0"
            >
              <div>
                <p className="font-body text-sm font-bold text-ink">{t.kind}</p>
                <p className="font-body text-xs text-g600">{fmtDate(t.at)}</p>
              </div>
              <span className="self-center text-right font-body text-sm text-g600">{formatPrice(t.gross)}</span>
              <span className="self-center text-right font-head text-sm font-bold text-ink">{formatPrice(t.share)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
