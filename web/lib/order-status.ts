/** Etapas (ordenadas) da Ordem de Serviço — espelha lib/order-status.ts do app. */
export const ORDER_STEPS: { key: string; label: string }[] = [
  { key: 'aguardando_coleta', label: 'Aguardando coleta/entrega' },
  { key: 'coletado', label: 'Aparelho recebido' },
  { key: 'em_analise', label: 'Em análise' },
  { key: 'em_manutencao', label: 'Em manutenção' },
  { key: 'pronto', label: 'Reparo concluído' },
  { key: 'em_devolucao', label: 'Em devolução' },
  { key: 'concluida', label: 'Entregue' },
];

export function stepIndex(status: string): number {
  return ORDER_STEPS.findIndex((s) => s.key === status);
}

export function statusLabel(status: string): string {
  if (status === 'cancelada') return 'Cancelada';
  if (status === 'aprovado') return 'Aprovado';
  return ORDER_STEPS.find((s) => s.key === status)?.label ?? status;
}

/** Próxima etapa após o status atual, ou null se já é a última/terminal. */
export function nextStep(status: string): { key: string; label: string } | null {
  const i = stepIndex(status);
  if (i < 0 || i >= ORDER_STEPS.length - 1) return null;
  return ORDER_STEPS[i + 1];
}

export function quoteStatusMeta(status: string): { label: string; cls: string } {
  switch (status) {
    case 'aceito':
      return { label: 'Aceito', cls: 'bg-[#DCFCE7] text-[#15803D]' };
    case 'recusado':
      return { label: 'Recusado', cls: 'bg-[#FEE2E2] text-[#B91C1C]' };
    case 'expirado':
      return { label: 'Expirado', cls: 'bg-g100 text-g600' };
    default:
      return { label: 'Enviado · aguardando', cls: 'bg-[#FEF3C7] text-[#B45309]' };
  }
}
