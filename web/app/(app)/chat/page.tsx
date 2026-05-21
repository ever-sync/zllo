import { createClient } from '@/lib/supabase/server';
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

  return (
    <div className="mx-auto flex h-screen max-w-5xl flex-col px-6 py-8">
      <header className="mb-4">
        <h1 className="font-head text-2xl font-black text-ink">Chat</h1>
        <p className="font-body text-sm text-g600">Converse com os clientes das suas solicitações.</p>
      </header>
      <ChatClient shopId={shop.id} userId={userId} />
    </div>
  );
}
