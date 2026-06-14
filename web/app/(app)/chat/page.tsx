import { createClient } from '@/lib/supabase/server';
import { buildConversations, CHAT_CONV_SELECT, type RawChatMsg } from '@/lib/chat';
import { ChatClient } from './chat-client';

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? '';

  if (!shop) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Chat</h1>
        <p className="mt-2 font-body text-sm text-g600">Configure sua loja para conversar com clientes.</p>
      </div>
    );
  }

  const { data: messages } = await supabase
    .from('messages')
    .select(CHAT_CONV_SELECT)
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  const initialConvs = buildConversations((messages as unknown as RawChatMsg[]) ?? []);

  return (
    <div className="mx-auto flex h-screen max-w-5xl flex-col px-6 py-8">
      <ChatClient shopId={shop.id} userId={userId} initialConvs={initialConvs} />
    </div>
  );
}
