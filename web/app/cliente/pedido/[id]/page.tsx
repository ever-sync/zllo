import { createClient } from '@/lib/supabase/server';
import type { RepairRequestDetail } from '@/lib/repair-detail';
import { ClientShell } from '../../client-shell';
import { PedidoClient } from './pedido-client';

export default async function ClientePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_repair_request_detail', { p_request_id: id });
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string) ?? '';

  return (
    <ClientShell>
      <PedidoClient
        requestId={id}
        userId={userId}
        initial={(data as RepairRequestDetail | null) ?? null}
        initialError={!!error}
      />
    </ClientShell>
  );
}
