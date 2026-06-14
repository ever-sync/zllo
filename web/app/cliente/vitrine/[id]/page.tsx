import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/format';
import { ClientShell } from '../../client-shell';
import { deleteListing } from './actions';

export default async function ClienteVitrineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id, title, brand, model, price, photos, description, city, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!listing) notFound();

  const isOwner = listing.seller_id === userId;
  const specs = [listing.brand, listing.model].filter(Boolean).join(' · ');

  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        <Link href="/cliente/vitrine" className="text-sm font-semibold text-blue">
          ← Vitrine
        </Link>

        {listing.photos?.length ? (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {listing.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-56 w-full min-w-[280px] rounded-2xl object-cover" />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex h-56 items-center justify-center rounded-2xl bg-g100 text-4xl text-g400">📱</div>
        )}

        <h1 className="mt-5 font-head text-2xl font-extrabold text-ink">{listing.title}</h1>
        <p className="mt-1 font-head text-3xl font-extrabold text-blue">{formatBRL(Number(listing.price))}</p>

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-g600">
          {specs ? <span>{specs}</span> : null}
          {listing.city ? <span>{listing.city}</span> : null}
        </div>

        {listing.description ? (
          <section className="mt-6 rounded-xl bg-g100 p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-g600">Descrição</h2>
            <p className="whitespace-pre-wrap text-sm text-ink">{listing.description}</p>
          </section>
        ) : null}

        {isOwner ? (
          <form action={deleteListing} className="mt-8">
            <input type="hidden" name="id" value={listing.id} />
            <button
              type="submit"
              className="rounded-xl border border-line bg-white px-4 py-3 font-head text-sm font-bold text-[#B91C1C]"
            >
              Excluir anúncio
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-xl border border-line bg-white p-4 text-sm text-g600">
            Anúncio publicado por outro usuário da zllo.
          </p>
        )}
      </div>
    </ClientShell>
  );
}
