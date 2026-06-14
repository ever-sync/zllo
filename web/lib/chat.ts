import { getDeviceName } from '@/lib/format';

export type ChatConversation = {
  requestId: string;
  title: string;
  client: string;
  last: string;
  at: string;
};

export type RawChatMsg = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  request_id: string | null;
  request: {
    client: { full_name: string | null } | null;
    device: { brand: string | null; model: string | null; nickname: string | null } | null;
  } | null;
};

export const CHAT_CONV_SELECT =
  'id, body, created_at, sender_id, request_id, request:repair_requests(client:profiles(full_name), device:devices(brand, model, nickname))';

export function buildConversations(rows: RawChatMsg[]): ChatConversation[] {
  const seen = new Set<string>();
  const list: ChatConversation[] = [];
  for (const m of rows) {
    if (!m.request_id || seen.has(m.request_id)) continue;
    seen.add(m.request_id);
    list.push({
      requestId: m.request_id,
      title: getDeviceName(m.request?.device),
      client: m.request?.client?.full_name?.split(' ')[0] ?? 'Cliente',
      last: m.body,
      at: m.created_at,
    });
  }
  return list;
}
