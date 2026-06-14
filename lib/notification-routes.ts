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
          ? `/(shop)/solicitacao/${d.request_id}`
          : '/(shop)/(tabs)/orcamentos';
      case 'message':
        return str(d, 'request_id')
          ? `/(shop)/conversa/${d.request_id}`
          : '/(shop)/(tabs)/mensagens';
      case 'payment':
        return str(d, 'order_id') ? `/(shop)/os/${d.order_id}` : '/(shop)/(tabs)/ordens';
      case 'product_order':
        return '/(shop)/vendas';
      case 'dispute':
        if (str(d, 'kind') === 'produto') return '/(shop)/vendas';
        if (str(d, 'service_order_id')) return `/(shop)/os/${d.service_order_id}`;
        if (str(d, 'order_id')) return `/(shop)/os/${d.order_id}`;
        return '/(shop)/(tabs)/ordens';
      case 'listing_interest':
        return str(d, 'listing_id') ? `/(client)/anuncio/${d.listing_id}` : '/(client)/vitrine';
      default:
        return null;
    }
  }

  switch (n.type) {
    case 'order': {
      const requestId = str(d, 'request_id');
      return requestId ? `/(client)/pedido/${requestId}` : '/(client)/(tabs)/pedidos';
    }
    case 'message': {
      const requestId = str(d, 'request_id');
      const shopId = str(d, 'shop_id');
      if (requestId && shopId) {
        return `/(client)/chat/${requestId}?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent('Assistência')}`;
      }
      return '/(client)/(tabs)/pedidos';
    }
    case 'quote':
    case 'request': {
      const requestId = str(d, 'request_id');
      return requestId ? `/(client)/pedido/${requestId}` : '/(client)/(tabs)/pedidos';
    }
    case 'product_order': {
      const orderId = str(d, 'product_order_id') ?? str(d, 'order_id');
      return orderId ? `/(client)/pedido-produto/${orderId}` : '/(client)/(tabs)/pedidos';
    }
    case 'dispute': {
      if (str(d, 'kind') === 'produto' && str(d, 'product_order_id')) {
        return `/(client)/pedido-produto/${d.product_order_id}`;
      }
      const requestId = str(d, 'request_id');
      return requestId ? `/(client)/pedido/${requestId}` : '/(client)/(tabs)/pedidos';
    }
    case 'listing_interest':
      return str(d, 'listing_id') ? `/(client)/anuncio/${d.listing_id}` : '/(client)/vitrine';
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
