export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export function notificationHref(n: NotificationRow): string | null {
  const d = n.data ?? {};
  switch (n.type) {
    case 'order':
      return typeof d.order_id === 'string' ? `/(client)/pedido/${d.order_id}` : '/(client)/(tabs)/pedidos';
    case 'message':
      return typeof d.request_id === 'string' ? `/(client)/chat/${d.request_id}` : '/(client)/(tabs)/pedidos';
    case 'quote':
    case 'request':
      return '/(client)/(tabs)/pedidos';
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
