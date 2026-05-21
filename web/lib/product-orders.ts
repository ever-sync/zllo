/** Contrato compartilhado de pedidos de produto (lado da loja). */

export type ShopOrderItem = { id: string; name: string; qty: number; subtotal: number };

export type ShopOrder = {
  id: string;
  total: number;
  status: string;
  shipping_type: 'retirada' | 'entrega';
  address: string | null;
  created_at: string;
  paid_at: string | null;
  client: { full_name: string | null } | null;
  items: ShopOrderItem[];
};

export const SHOP_ORDER_SELECT =
  'id, total, status, shipping_type, address, created_at, paid_at, client:profiles(full_name), items:product_order_items(id, name, qty, subtotal)';

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-[#FEF3C7] text-[#B45309]' },
  pago: { label: 'Pago · a separar', cls: 'bg-[#DCFCE7] text-[#15803D]' },
  separando: { label: 'Separando', cls: 'bg-[#EEEEFF] text-blue' },
  pronto: { label: 'Pronto', cls: 'bg-[#DCFCE7] text-[#15803D]' },
  concluido: { label: 'Concluído', cls: 'bg-g100 text-g600' },
  cancelado: { label: 'Cancelado', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
};

/** Próxima ação da loja para cada status (avanço do fluxo). */
export const NEXT_ACTION: Record<string, { label: string; status: string }> = {
  pago: { label: 'Iniciar separação', status: 'separando' },
  separando: { label: 'Marcar como pronto', status: 'pronto' },
  pronto: { label: 'Concluir pedido', status: 'concluido' },
};

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
