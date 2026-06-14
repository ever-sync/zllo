export type FinanceTx = {
  id: string;
  kind: 'Reparo' | 'Produto';
  gross: number;
  share: number;
  at: string;
};

export type FinancePeriod = '7d' | '30d' | '90d' | 'all';

export const PERIOD_LABELS: Record<FinancePeriod, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  all: 'Tudo',
};

export function periodCutoff(period: FinancePeriod): Date | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function filterTxs(txs: FinanceTx[], period: FinancePeriod): FinanceTx[] {
  const cutoff = periodCutoff(period);
  if (!cutoff) return txs;
  return txs.filter((t) => new Date(t.at) >= cutoff);
}

export function txsToCsv(txs: FinanceTx[]): string {
  const header = 'Origem,Data,Bruto,Liquido,Taxa';
  const rows = txs.map((t) => {
    const fee = t.gross - t.share;
    const date = new Date(t.at).toLocaleString('pt-BR');
    return [t.kind, date, t.gross.toFixed(2), t.share.toFixed(2), fee.toFixed(2)].join(',');
  });
  return [header, ...rows].join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
