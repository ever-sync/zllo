import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../../../client-shell';
import { ListingChatClient } from './listing-chat-client';

export default async function ListingChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ buyerId?: string }>;
}) {
  const { id } = await params;
  const { buyerId } = await searchParams;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title')
    .eq('id', id)
    .maybeSingle();

  if (!listing) notFound();

  return (
    <ClientShell>
      <ListingChatClient listingId={listing.id} listingTitle={listing.title} buyerId={buyerId} />
    </ClientShell>
  );
}
