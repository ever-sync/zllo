export type NotificationRole = 'cliente' | 'assistencia';

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

function str(d: Record<string, unknown>, key: string): string | null {
  const v = d[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function notificationHref(n: NotificationRow, role: NotificationRole = 'cliente'): string | null {
  const d = n.data ?? {};

  if (role === 'assistencia') {
    switch (n.type) {
      case 'request':
        return str(d, 'request_id') ? `/solicitacao/${d.request_id}` : '/orcamentos';
      case 'message':
        return str(d, 'request_id') ? `/solicitacao/${d.request_id}` : '/chat';
      case 'payment':
        return str(d, 'order_id') ? `/ordens?highlight=${d.order_id}` : '/ordens';
      case 'product_order':
        return str(d, 'order_id') ? `/pedidos?highlight=${d.order_id}` : '/pedidos';
      case 'dispute':
        if (str(d, 'kind') === 'produto') {
          return str(d, 'product_order_id') ? `/pedidos?highlight=${d.product_order_id}` : '/pedidos';
        }
        return str(d, 'service_order_id') ? `/ordens?highlight=${d.service_order_id}` : '/ordens';
      case 'delivery_update':
        return '/pedidos';
      default:
        return null;
    }
  }

  switch (n.type) {
    case 'order': {
      const requestId = str(d, 'request_id');
      return requestId ? `/cliente/pedido/${requestId}` : '/cliente/pedidos';
    }
    case 'message': {
      const requestId = str(d, 'request_id');
      const shopId = str(d, 'shop_id');
      if (requestId && shopId) {
        return `/cliente/conversa/${requestId}?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent('Assistência')}`;
      }
      return '/cliente/pedidos';
    }
    case 'quote':
    case 'request': {
      const requestId = str(d, 'request_id');
      return requestId ? `/cliente/pedido/${requestId}` : '/cliente/pedidos';
    }
    case 'product_order': {
      const orderId = str(d, 'product_order_id') ?? str(d, 'order_id');
      return orderId ? `/cliente/pedido-produto/${orderId}` : '/cliente/pedidos';
    }
    case 'dispute': {
      if (str(d, 'kind') === 'produto' && str(d, 'product_order_id')) {
        return `/cliente/pedido-produto/${d.product_order_id}`;
      }
      const requestId = str(d, 'request_id');
      return requestId ? `/cliente/pedido/${requestId}` : '/cliente/pedidos';
    }
    case 'listing_interest':
      return str(d, 'listing_id')
        ? str(d, 'buyer_id')
          ? `/cliente/vitrine/${d.listing_id}/chat?buyerId=${encodeURIComponent(d.buyer_id as string)}`
          : `/cliente/vitrine/${d.listing_id}`
        : '/cliente/vitrine';
    case 'listing_message': {
      const listingId = str(d, 'listing_id');
      const buyerId = str(d, 'buyer_id');
      if (listingId && buyerId) {
        return `/cliente/vitrine/${listingId}/chat?buyerId=${encodeURIComponent(buyerId)}`;
      }
      return listingId ? `/cliente/vitrine/${listingId}/chat` : '/cliente/vitrine';
    }
    case 'delivery_update': {
      const orderId = str(d, 'product_order_id');
      return orderId ? `/cliente/pedido-produto/${orderId}` : '/cliente/pedidos';
    }
    default:
      return null;
  }
}

export function fmtNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
