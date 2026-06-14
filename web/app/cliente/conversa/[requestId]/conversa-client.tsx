'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClientChatThread } from '@/components/client-chat-thread';
import { createClient } from '@/lib/supabase/client';

export function ConversaClient({
  requestId,
  shopId,
  shopName,
}: {
  requestId: string;
  shopId: string;
  shopName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  if (!shopId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-g600">Loja não informada.</p>
        <Link href={`/cliente/pedido/${requestId}`} className="mt-4 inline-block text-sm font-bold text-blue">
          ← Voltar ao pedido
        </Link>
      </div>
    );
  }

  if (!userId) {
    return <div className="mx-auto max-w-2xl animate-pulse px-4 py-8"><div className="h-64 rounded-2xl bg-g100" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link href={`/cliente/pedido/${requestId}`} className="text-sm font-semibold text-blue">
        ← Pedido
      </Link>
      <h1 className="mt-4 font-head text-xl font-extrabold text-ink">Conversa</h1>
      <div className="mt-4">
        <ClientChatThread requestId={requestId} shopId={shopId} userId={userId} shopName={shopName} />
      </div>
    </div>
  );
}
