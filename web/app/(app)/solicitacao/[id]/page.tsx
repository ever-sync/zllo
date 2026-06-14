import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDeviceName } from '@/lib/format';
import { distanceLabel } from '@/lib/time';
import { Countdown } from '@/components/countdown';
import { QuoteForm } from './quote-form';
import { SolicitacaoTargetActions } from './solicitacao-target-actions';

type RequestDetail = {
  id: string;
  description: string;
  photos: string[];
  shipping_type: 'levar_local' | 'frete';
  status: string;
  device: {
    brand: string | null;
    model: string | null;
    nickname: string | null;
    color: string | null;
    storage: string | null;
  } | null;
  client: { full_name: string | null } | null;
};

type TargetInfo = { distance_m: number | null; responds_by: string; status: string };

export default async function SolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: shop } = await supabase.rpc('get_my_shop');

  const { data: reqRow } = await supabase
    .from('repair_requests')
    .select(
      'id, description, photos, shipping_type, status, device:devices(brand, model, nickname, color, storage), client:profiles(full_name)',
    )
    .eq('id', id)
    .maybeSingle();
  const request = reqRow as unknown as RequestDetail | null;

  const { data: tgtRow } = shop
    ? await supabase
        .from('request_targets')
        .select('distance_m, responds_by, status')
        .eq('request_id', id)
        .eq('shop_id', shop.id)
        .maybeSingle()
    : { data: null };
  const target = tgtRow as TargetInfo | null;

  if (!request) {
    return (
      <div className="px-8 py-7">
        <BackLink />
        <p className="mt-6 font-body text-sm text-g600">
          Solicitação não encontrada ou indisponível.
        </p>
      </div>
    );
  }

  const dev = request.device;
  const deviceName = getDeviceName(dev);
  const sub = [dev?.storage, dev?.color].filter(Boolean).join(' · ') || '—';
  const alreadyQuoted = target?.status === 'orcou';
  const unavailable = request.status !== 'aberta';

  return (
    <div className="mx-auto max-w-2xl px-8 py-7">
      <BackLink />

      <div className="mt-5 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-g100 text-2xl">
          📱
        </div>
        <div className="flex-1">
          <h1 className="font-head text-xl font-extrabold text-ink">{deviceName}</h1>
          <p className="font-body text-sm text-g600">{sub}</p>
        </div>
        {target && !alreadyQuoted && !unavailable ? (
          <Countdown respondsBy={target.responds_by} />
        ) : null}
      </div>

      <div className="mt-4 flex gap-5 font-body text-sm text-g600">
        <span>📍 {distanceLabel(target?.distance_m)}</span>
        <span>{request.shipping_type === 'frete' ? '🚚 Paga frete' : '🚶 Leva no local'}</span>
        <span>👤 {request.client?.full_name?.split(' ')[0] ?? 'Cliente'}</span>
      </div>

      <h2 className="mt-7 mb-2 font-head text-xs font-bold uppercase tracking-wide text-g600">
        Problema relatado
      </h2>
      <div className="rounded-xl bg-g100 p-4 font-body text-sm leading-relaxed text-ink">
        {request.description}
      </div>

      {request.photos?.length ? (
        <>
          <h2 className="mt-6 mb-2 font-head text-xs font-bold uppercase tracking-wide text-g600">
            Fotos ({request.photos.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {request.photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-28 w-28 rounded-lg object-cover"
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-8">
        {alreadyQuoted ? (
          <div className="rounded-xl bg-[#DCFCE7] px-4 py-3 font-body text-sm font-bold text-[#15803D]">
            ✓ Você já enviou um orçamento.
          </div>
        ) : unavailable ? (
          <div className="rounded-xl bg-g100 px-4 py-3 font-body text-sm text-g600">
            Esta solicitação não está mais disponível.
          </div>
        ) : (
          <>
            <QuoteForm requestId={request.id} deviceName={deviceName} />
            <SolicitacaoTargetActions
              requestId={request.id}
              targetStatus={target?.status ?? null}
              unavailable={unavailable}
            />
          </>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/operacao" className="font-body text-sm text-g600 hover:text-ink">
      ← Voltar para Operação
    </Link>
  );
}
