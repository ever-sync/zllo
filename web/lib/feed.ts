/**
 * Contrato compartilhado do feed de pedidos (request_targets + repair_requests).
 * Usado pelo Server Component (carga inicial) e pelo client (refetch via realtime).
 */
export const TARGET_SELECT =
  'id, status, distance_m, responds_by, request:repair_requests(id, description, photos, shipping_type, status, device:devices(brand, model, nickname), client:profiles(full_name))';

export type TargetStatus = 'pendente' | 'visualizado' | 'orcou' | 'recusou' | 'expirou';
export type RequestStatus = 'aberta' | 'fechada' | 'cancelada' | 'expirada';

export type FeedItem = {
  id: string;
  status: TargetStatus;
  distance_m: number | null;
  responds_by: string;
  request: {
    id: string;
    description: string;
    photos: string[];
    shipping_type: 'levar_local' | 'frete';
    status: RequestStatus;
    device: { brand: string | null; model: string | null; nickname: string | null } | null;
    client: { full_name: string | null } | null;
  } | null;
};
