import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../../../client-shell';
import { ListingEditForm } from './listing-edit-form';

export default async function EditarAnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id, title, brand, model, price, photos, description, city')
    .eq('id', id)
    .maybeSingle();

  if (!listing || listing.seller_id !== userId) notFound();

  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:px-8">
        <Link href={`/cliente/vitrine/${id}`} className="text-sm font-semibold text-blue">
          ← Voltar ao anúncio
        </Link>
        <h1 className="mt-4 font-head text-2xl font-extrabold text-ink">Editar anúncio</h1>
        <div className="mt-6">
          <ListingEditForm listing={listing} />
        </div>
      </div>
    </ClientShell>
  );
}
