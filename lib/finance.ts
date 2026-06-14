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

export function filterByPeriod<T extends { created_at: string }>(rows: T[], period: FinancePeriod): T[] {
  const cutoff = periodCutoff(period);
  if (!cutoff) return rows;
  return rows.filter((t) => new Date(t.created_at) >= cutoff);
}

export function txsToCsv(
  rows: { kind: string; label: string; shop_amount: number; commission: number; status: string; created_at: string }[],
): string {
  const header = 'Tipo,Descricao,Data,Status,Liquido,Bruto,Taxa';
  const lines = rows.map((t) => {
    const gross = t.shop_amount + t.commission;
    const date = new Date(t.created_at).toLocaleString('pt-BR');
    const kind = t.kind === 'produto' ? 'Produto' : 'Reparo';
    return [kind, t.label, date, t.status, t.shop_amount.toFixed(2), gross.toFixed(2), t.commission.toFixed(2)].join(',');
  });
  return [header, ...lines].join('\n');
}
