import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDeviceName } from '@/lib/format';
import { formatPrice } from '@/lib/product-orders';
import { quoteStatusMeta } from '@/lib/order-status';

type Quote = {
  id: string;
  value: number;
  description: string | null;
  status: string;
  created_at: string;
  request: { description: string | null; device: { brand: string | null; model: string | null; nickname: string | null } | null } | null;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function OrcamentosPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Orçamentos</h1>
        <p className="mt-2 font-body text-sm text-g600">Configure sua loja para enviar orçamentos.</p>
      </div>
    );
  }

  const { data } = await supabase
    .from('quotes')
    .select('id, value, description, status, created_at, request:repair_requests!quotes_request_id_fkey(description, device:devices(brand, model, nickname))')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });
  const quotes = (data as unknown as Quote[]) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">

      {quotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">
            Nenhum orçamento ainda. Eles aparecem aqui quando você responde uma solicitação na Operação.
          </p>
          <Link href="/operacao" className="mt-4 inline-block font-head text-sm font-bold text-blue">
            Ir para Operação →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {quotes.map((q) => {
            const meta = quoteStatusMeta(q.status);
            return (
              <div key={q.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-head text-sm font-bold text-ink">{getDeviceName(q.request?.device)}</p>
                    <p className="line-clamp-1 font-body text-xs text-g600">{q.request?.description ?? '—'}</p>
                  </div>
                  <span className={'shrink-0 rounded-md px-2 py-1 font-head text-xs font-bold ' + meta.cls}>{meta.label}</span>
                </div>
                {q.description ? <p className="mt-2 font-body text-sm text-g600">{q.description}</p> : null}
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-body text-xs text-g600">{fmtDate(q.created_at)}</span>
                  <span className="font-head text-base font-black text-ink">{formatPrice(q.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
