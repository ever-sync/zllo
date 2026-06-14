import { ClientShell } from '../../client-shell';
import { ConversaClient } from './conversa-client';

export default async function ConversaPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ shopId?: string; shopName?: string }>;
}) {
  const { requestId } = await params;
  const { shopId, shopName } = await searchParams;

  return (
    <ClientShell>
      <ConversaClient requestId={requestId} shopId={shopId ?? ''} shopName={shopName ?? 'Assistência'} />
    </ClientShell>
  );
}
