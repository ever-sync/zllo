-- Webhook monitoring, idempotência de pagamentos e validação de wallet.

create table public.webhook_events (
  id                    uuid primary key default gen_random_uuid(),
  source                text not null default 'asaas',
  event                 text not null,
  provider_payment_id   text,
  outcome               text not null,
  details               jsonb,
  created_at            timestamptz not null default now()
);

create index webhook_events_created_at_idx on public.webhook_events (created_at desc);
create index webhook_events_outcome_idx on public.webhook_events (outcome, created_at desc);

alter table public.webhook_events enable row level security;

-- ---------- Bloqueia orçamento sem wallet Asaas ----------
create or replace function private.enforce_shop_wallet_on_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.shops s
     where s.id = new.shop_id
       and nullif(trim(s.asaas_wallet_id), '') is not null
  ) then
    raise exception 'Configure a conta Asaas em Configurações antes de enviar orçamentos';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quote_requires_wallet on public.quotes;
create trigger trg_quote_requires_wallet
  before insert on public.quotes
  for each row execute function private.enforce_shop_wallet_on_quote();

-- ---------- accept_quote: cliente não aceita loja sem wallet ----------
create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote    public.quotes%rowtype;
  v_req_id   uuid;
  v_client   uuid;
  v_status   public.request_status;
  v_device   uuid;
  v_order_id uuid;
  v_wallet   text;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then raise exception 'Orçamento não encontrado'; end if;

  select nullif(trim(s.asaas_wallet_id), '')
    into v_wallet
    from public.shops s
   where s.id = v_quote.shop_id;
  if v_wallet is null then
    raise exception 'Esta assistência ainda não configurou o recebimento. Escolha outro orçamento.';
  end if;

  select id, client_id, status, device_id
    into v_req_id, v_client, v_status, v_device
    from public.repair_requests where id = v_quote.request_id;
  if v_client <> auth.uid() then raise exception 'Sem permissão'; end if;
  if v_status <> 'aberta' then raise exception 'Esta solicitação já foi fechada'; end if;

  update public.quotes set status = 'aceito' where id = v_quote.id;
  update public.quotes set status = 'recusado'
    where request_id = v_quote.request_id and id <> v_quote.id and status = 'enviado';

  update public.repair_requests
    set status = 'fechada', chosen_quote_id = v_quote.id
    where id = v_req_id;

  insert into public.service_orders
    (request_id, quote_id, client_id, shop_id, device_id, value, warranty_days, status)
  values
    (v_req_id, v_quote.id, v_client, v_quote.shop_id, v_device, v_quote.value, v_quote.warranty_days, 'aguardando_coleta')
  returning id into v_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (v_order_id, 'aguardando_coleta', 'Orçamento aceito pelo cliente', auth.uid());

  return v_order_id;
end;
$$;

-- ---------- Admin: eventos recentes de webhook ----------
create or replace function public.admin_webhook_events(p_problems_only boolean default true)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;

  return coalesce((
    select jsonb_agg(x.obj order by x.created_at desc)
    from (
      select
        jsonb_build_object(
          'id', e.id,
          'source', e.source,
          'event', e.event,
          'provider_payment_id', e.provider_payment_id,
          'outcome', e.outcome,
          'details', e.details,
          'created_at', e.created_at
        ) as obj,
        e.created_at
      from public.webhook_events e
      where (not p_problems_only or e.outcome in ('no_match', 'error', 'revalidate_failed'))
      order by e.created_at desc
      limit 50
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_webhook_events(boolean) to authenticated;

-- ---------- KPI de alertas webhook (24h) ----------
create or replace function public.admin_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'shops',               (select count(*) from public.shops),
    'shops_online',        (select count(*) from public.shops where is_online),
    'clients',             (select count(*) from public.profiles where role = 'cliente'),
    'requests_open',       (select count(*) from public.repair_requests where status = 'aberta'),
    'service_orders',      (select count(*) from public.service_orders),
    'product_orders_paid', (select count(*) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'gmv_repair',          (select coalesce(sum(amount),0) from public.payments where status = 'pago'),
    'gmv_products',        (select coalesce(sum(total),0) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'commission_repair',   (select coalesce(sum(commission),0) from public.payments where status = 'pago'),
    'commission_products', (select coalesce(sum(coalesce(commission, total * 0.03)),0) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'reviews',             (select count(*) from public.reviews),
    'webhook_issues_24h',  (select count(*) from public.webhook_events
                              where outcome in ('no_match', 'error', 'revalidate_failed')
                                and created_at > now() - interval '24 hours'),
    'disputes_open',       (select count(*) from public.disputes where status in ('aberta', 'em_analise'))
  );
end;
$$;
