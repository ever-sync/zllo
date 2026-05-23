'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { OnlineToggle } from './online-toggle';

const ROUTES: Record<string, { title: string; subtitle?: string }> = {
  '/orcamentos': { title: 'Orçamentos', subtitle: 'Histórico dos orçamentos que sua loja enviou.' },
  '/ordens': { title: 'Ordens de serviço', subtitle: 'Reparos aceitos — avance cada etapa até a entrega.' },
  '/pedidos': { title: 'Pedidos', subtitle: 'Vendas do marketplace — separe e entregue.' },
  '/produtos': { title: 'Produtos', subtitle: 'Gerencie o que sua loja vende no marketplace do app.' },
  '/chat': { title: 'Mensagens', subtitle: 'Converse com os clientes das suas solicitações.' },
  '/financeiro': { title: 'Financeiro', subtitle: 'Recebíveis confirmados (reparos + marketplace) — 97% líquido.' },
  '/reputacao': { title: 'Reputação', subtitle: 'Notas, ranking e avaliações.' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Dados da loja, raio de atendimento e recebimento.' },
};

export function TopBar({
  shopName,
  shopId,
  initialOnline,
  pending,
  os,
}: {
  shopName: string;
  shopId?: string;
  initialOnline: boolean;
  pending: number;
  os: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  let title: ReactNode = shopName;
  let subtitle: string | undefined;
  let back = false;

  if (pathname === '/operacao') {
    title = <>Olá, {shopName} 👋</>;
    subtitle = `${pending} orçamentos · ${os} OS em andamento`;
  } else if (pathname.startsWith('/solicitacao')) {
    title = 'Responder orçamento';
    back = true;
  } else {
    const r = ROUTES[pathname];
    if (r) {
      title = r.title;
      subtitle = r.subtitle;
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-8 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <button
            onClick={() => router.back()}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-g100 text-ink"
            aria-label="Voltar"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-head text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-ink">
            {title}
          </h1>
          {subtitle && <p className="font-body text-[12.5px] text-g600">{subtitle}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {shopId && <OnlineToggle shopId={shopId} initialOnline={initialOnline} />}
        <Link
          href="/chat"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-g100 text-ink"
          aria-label="Mensagens"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
