import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TARGET_SELECT, type FeedItem } from '@/lib/feed';
import { OperacaoBoard } from './operacao-board';

type OrderRow = { id: string; status: string; value: number };
const brl = (n: number) => `R$ ${Math.round(n).toLocaleString('pt-BR')}`;

export default async function PainelPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="px-8 py-7">
        <h1 className="font-head text-2xl font-extrabold text-ink">Painel</h1>
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-head text-base font-bold text-ink">Configure sua loja</p>
          <p className="mx-auto mt-1 max-w-md font-body text-sm text-g600">
            Você ainda não tem uma loja cadastrada.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: targetsData }, { data: ordersData }] = await Promise.all([
    supabase
      .from('request_targets')
      .select(TARGET_SELECT)
      .eq('shop_id', shop.id)
      .order('notified_at', { ascending: false }),
    supabase.from('service_orders').select('id, status, value').eq('shop_id', shop.id),
  ]);

  const targets = (targetsData as unknown as FeedItem[]) ?? [];
  const orders = (ordersData as unknown as OrderRow[]) ?? [];

  const chegando = targets.filter((t) => t.request?.status === 'aberta' && t.status !== 'orcou');
  const orcou = targets.filter((t) => t.status === 'orcou').length;
  const andamento = orders.filter((o) => o.status !== 'concluida' && o.status !== 'cancelada');
  const concluidas = orders.filter((o) => o.status === 'concluida').length;
  const faturamento = orders.reduce((s, o) => s + Number(o.value), 0);
  const conv = orcou > 0 ? Math.round((orders.length / orcou) * 100) : 0;
  const taxa = orders.length > 0 ? Math.round((concluidas / orders.length) * 100) : 0;
  const rating = Number(shop.rating ?? 5).toFixed(1);
  const ini = shop.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <div className="px-8 py-6">
        {/* HERO */}
        <div className="relative mb-[18px] flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-blue px-6 py-5 text-white">
          <div className="relative z-10 max-w-[480px]">
            <h2 className="font-head text-xl font-extrabold tracking-[-0.3px]">
              Sua nota está em {rating} ⭐
            </h2>
            <p className="mt-1 font-body text-[13.5px] opacity-85">
              Responda rápido aos orçamentos para subir no ranking da sua região e fechar mais reparos.
            </p>
          </div>
          <Link
            href="/ordens"
            className="relative z-10 shrink-0 whitespace-nowrap rounded-full bg-lime px-5 py-3 font-head text-xs font-extrabold uppercase tracking-[0.5px] text-ink"
          >
            Ver ordens →
          </Link>
          <div className="pointer-events-none absolute -bottom-16 -right-5 select-none font-head text-[220px] font-black leading-none tracking-[-10px] text-lime/10">
            Z
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-[18px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Kpi label="Orçamentos" value={String(chegando.length)} delta="aguardando resposta" />
          <Kpi label="OS Andamento" value={String(andamento.length)} delta="em serviço" dark />
          <Kpi label="Conversão" value={`${conv}%`} delta="orçados → fechados" />
          <Kpi label="Faturamento" value={brl(faturamento)} delta="total acumulado" lime />
        </div>

        {/* 2 colunas */}
        <div className="grid gap-[18px] lg:grid-cols-[2fr_1fr]">
          <OperacaoBoard shopId={shop.id} initial={chegando} />

          <div className="flex flex-col gap-3.5">
            {/* Reputação */}
            <div className="rounded-[14px] bg-gradient-to-br from-ink to-[#2a2a2a] p-[18px] text-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime font-head text-xl font-black text-ink">
                  {ini}
                </div>
                <div>
                  <div className="font-head text-[15px] font-extrabold">{shop.name}</div>
                  <div className="text-[11px] font-semibold text-lime">✓ Verificada pela zllo</div>
                </div>
              </div>

              <div className="mb-3.5 grid grid-cols-2 gap-2.5 rounded-[10px] bg-white/5 p-3.5">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.6px] text-g400">Nota zllo</div>
                  <div className="flex items-baseline gap-1 font-head text-[22px] font-extrabold">
                    <span className="text-base text-lime">★</span>
                    {rating}
                    <small className="text-[11px] font-medium text-g400">/ 5</small>
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.6px] text-g400">Concluídas</div>
                  <div className="font-head text-[22px] font-extrabold">{concluidas}</div>
                </div>
              </div>

              {[
                { label: 'OS em andamento', value: String(andamento.length) },
                { label: 'Total de OS', value: String(orders.length) },
                { label: 'Taxa de conclusão', value: `${taxa}%` },
                { label: 'Faturamento', value: brl(faturamento), highlight: true },
              ].map((m, i) => (
                <div
                  key={m.label}
                  className={
                    'flex items-center justify-between py-2 text-[12.5px] ' +
                    (i < 3 ? 'border-b border-white/[0.06]' : '')
                  }
                >
                  <span className="text-[#A1A1A1]">{m.label}</span>
                  <strong className={'font-head font-bold ' + (m.highlight ? 'text-lime' : 'text-white')}>
                    {m.value}
                  </strong>
                </div>
              ))}
            </div>

            {/* Atalho marketplace (substitui o card de moedas) */}
            <Link
              href="/pedidos"
              className="flex items-center gap-3.5 rounded-[14px] border-2 border-dashed border-blue bg-white p-[18px]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue text-xl">
                🛍️
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-head text-[16px] font-extrabold leading-none tracking-[-0.5px] text-ink">
                  Vendas do marketplace
                </div>
                <span className="mt-1 block text-[11.5px] text-g600">
                  Pedidos de produtos · separar e entregar
                </span>
              </div>
              <span className="shrink-0 font-head text-lg text-blue">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  dark,
  lime,
}: {
  label: string;
  value: string;
  delta: string;
  dark?: boolean;
  lime?: boolean;
}) {
  const bg = dark ? 'bg-ink text-white' : lime ? 'bg-lime text-ink' : 'bg-white text-ink';
  const border = dark ? 'border-ink' : lime ? 'border-lime' : 'border-line';
  const labelColor = dark ? 'text-[#A1A1A1]' : lime ? 'text-ink/70' : 'text-g600';
  const deltaColor = dark ? 'text-lime' : 'text-[#16A34A]';
  return (
    <div className={`rounded-xl border ${border} ${bg} px-[18px] py-4`}>
      <div className={`mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.6px] ${labelColor}`}>
        {label}
      </div>
      <div className="mb-1.5 font-head text-[30px] font-extrabold leading-none tracking-[-1px]">
        {value}
      </div>
      <span className={`text-[11.5px] font-semibold ${deltaColor}`}>{delta}</span>
    </div>
  );
}
