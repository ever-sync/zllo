import type { UserRole } from './auth';

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

/** Deep link in-app / push tap (Expo Router). */
export function notificationHref(n: NotificationRow, role: UserRole = 'cliente'): string | null {
  const d = n.data ?? {};

  if (role === 'assistencia') {
    switch (n.type) {
      case 'request':
        return str(d, 'request_id')
          ? `/solicitacao/${d.request_id}`
          : '/orcamentos';
      case 'message':
        return str(d, 'request_id')
          ? `/conversa/${d.request_id}`
          : '/mensagens';
      case 'payment':
        return str(d, 'order_id') ? `/os/${d.order_id}` : '/ordens';
      case 'product_order':
        return '/vendas';
      case 'dispute':
        if (str(d, 'kind') === 'produto') return '/vendas';
        if (str(d, 'service_order_id')) return `/os/${d.service_order_id}`;
        if (str(d, 'order_id')) return `/os/${d.order_id}`;
        return '/ordens';
      case 'listing_interest':
        return str(d, 'listing_id')
          ? str(d, 'buyer_id')
            ? `/anuncio-chat/${d.listing_id}?buyerId=${encodeURIComponent(d.buyer_id as string)}`
            : `/anuncio/${d.listing_id}`
          : '/vitrine';
      case 'listing_message': {
        const listingId = str(d, 'listing_id');
        const buyerId = str(d, 'buyer_id');
        if (listingId && buyerId) {
          return `/anuncio-chat/${listingId}?buyerId=${encodeURIComponent(buyerId)}`;
        }
        return listingId ? `/anuncio-chat/${listingId}` : '/vitrine';
      }
      default:
        return null;
    }
  }

  switch (n.type) {
    case 'order': {
      const requestId = str(d, 'request_id');
      return requestId ? `/pedido/${requestId}` : '/pedidos';
    }
    case 'message': {
      const requestId = str(d, 'request_id');
      const shopId = str(d, 'shop_id');
      if (requestId && shopId) {
        return `/chat/${requestId}?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent('Assistência')}`;
      }
      return '/pedidos';
    }
    case 'quote':
    case 'request': {
      const requestId = str(d, 'request_id');
      return requestId ? `/pedido/${requestId}` : '/pedidos';
    }
    case 'product_order': {
      const orderId = str(d, 'product_order_id') ?? str(d, 'order_id');
      return orderId ? `/pedido-produto/${orderId}` : '/pedidos';
    }
    case 'dispute': {
      if (str(d, 'kind') === 'produto' && str(d, 'product_order_id')) {
        return `/pedido-produto/${d.product_order_id}`;
      }
      const requestId = str(d, 'request_id');
      return requestId ? `/pedido/${requestId}` : '/pedidos';
    }
    case 'listing_interest':
      return str(d, 'listing_id') ? `/anuncio/${d.listing_id}` : '/vitrine';
    default:
      return null;
  }
}

/** Payload vindo do push (campo `data` da notificação Expo). */
export function notificationHrefFromPushData(
  data: Record<string, unknown>,
  role: UserRole = 'cliente',
): string | null {
  const type = typeof data.type === 'string' ? data.type : 'generic';
  return notificationHref(
    { id: '', title: '', body: '', type, data, read_at: null, created_at: '' },
    role,
  );
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
