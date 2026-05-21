-- ============================================================================
-- zllo — Pagamentos (Pix com split via Asaas) + comissão 3%
-- O cliente paga a OS por Pix; o provedor faz o split (97% loja, 3% zllo fica
-- com a conta marketplace automaticamente). As escritas em `payments` são
-- feitas pelas Edge Functions com service role (que ignora RLS); o app só LÊ.
-- ============================================================================

create type public.payment_status as enum ('pendente', 'pago', 'cancelado', 'estornado');

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null unique references public.service_orders(id) on delete cascade,
  client_id           uuid not null references public.profiles(id) on delete cascade,
  shop_id             uuid not null references public.shops(id) on delete cascade,
  amount              numeric not null,            -- total pago pelo cliente
  commission          numeric not null,            -- 3% zllo
  shop_amount         numeric not null,            -- 97% loja
  status              public.payment_status not null default 'pendente',
  method              text not null default 'pix',
  provider            text not null default 'asaas',
  provider_payment_id text,
  pix_payload         text,                        -- copia e cola
  pix_qr              text,                        -- imagem base64 (data URL sem prefixo)
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  updated_at          timestamptz not null default now()
);
create index payments_shop_idx   on public.payments (shop_id);
create index payments_client_idx on public.payments (client_id);

grant select on public.payments to authenticated; -- escrita só via service role (edge function)

alter table public.payments enable row level security;
create policy "payments_party_select" on public.payments for select to authenticated
  using (client_id = (select auth.uid()) or shop_id = private.current_shop_id());

create trigger trg_payments_updated before update on public.payments
  for each row execute function private.set_updated_at();

alter publication supabase_realtime add table public.payments;

-- ---------- Identificadores do provedor ----------
alter table public.shops    add column if not exists asaas_wallet_id   text; -- recebedor do split (97%)
alter table public.profiles add column if not exists asaas_customer_id text; -- cliente no provedor (cache)

-- ---------- A loja lê/define a própria walletId (privada às contrapartes) ----------
create or replace function public.get_my_shop()
returns public.shops language sql stable security definer set search_path = '' as $$
  select * from public.shops where owner_id = (select auth.uid());
$$;
grant execute on function public.get_my_shop() to authenticated;

create or replace function public.set_my_wallet(p_wallet_id text)
returns void language sql security invoker set search_path = '' as $$
  update public.shops
     set asaas_wallet_id = nullif(trim(p_wallet_id), '')
   where owner_id = (select auth.uid());
$$;
grant execute on function public.set_my_wallet(text) to authenticated;
