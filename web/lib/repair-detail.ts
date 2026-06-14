/** Tipos retornados por RPC `get_repair_request_detail`. */

export type RepairDetailQuote = {
  id: string;
  value: number;
  description: string | null;
  status: string;
  shop_id: string;
  shop: { name: string; rating: number; reviews_count: number } | null;
};

export type RepairDetailRequest = {
  id: string;
  description: string;
  status: string;
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
};

export type RepairDetailOrder = {
  id: string;
  status: string;
  value: number;
  shop_id: string;
  warranty_days: number;
  shop: { name: string } | null;
};

export type RepairDetailPayment = {
  id: string;
  status: 'pendente' | 'pago' | 'cancelado' | 'estornado';
  amount: number;
};

export type RepairRequestDetail = {
  request: RepairDetailRequest | null;
  quotes: RepairDetailQuote[];
  order: RepairDetailOrder | null;
  events: { status: string; created_at: string }[];
  review: { id: string; rating: number; comment: string | null } | null;
  payment: RepairDetailPayment | null;
  dispute: { id: string; status: string; reason: string; resolution: string | null } | null;
};

export function fmtEvent(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function eventsMap(events: RepairRequestDetail['events']): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of events) map[e.status] = fmtEvent(e.created_at);
  return map;
}
