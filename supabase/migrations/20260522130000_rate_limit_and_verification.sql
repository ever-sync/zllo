-- Rate limit em RPCs sensíveis + verificação de cadastro assistência.

create table if not exists private.rate_limit_events (
  id         bigserial primary key,
  user_id    uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on private.rate_limit_events (user_id, action, created_at desc);

create or replace function private.enforce_rate_limit(
  p_action text,
  p_max int,
  p_window_seconds int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    return;
  end if;

  select count(*) into v_count
    from private.rate_limit_events e
   where e.user_id = v_uid
     and e.action = p_action
     and e.created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    raise exception 'Muitas tentativas. Aguarde um momento e tente de novo.';
  end if;

  insert into private.rate_limit_events (user_id, action) values (v_uid, p_action);

  delete from private.rate_limit_events where created_at < now() - interval '2 days';
end;
$$;

-- ---------- create_repair_request + rate limit ----------
create or replace function public.create_repair_request(
  p_device_id     uuid,
  p_description   text,
  p_photos        text[],
  p_shipping_type public.shipping_type,
  p_lat           double precision,
  p_lng           double precision,
  p_address       text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.enforce_rate_limit('create_repair_request', 5, 300);

  insert into public.repair_requests
    (client_id, device_id, description, photos, shipping_type, location, address)
  values (
    auth.uid(),
    p_device_id,
    p_description,
    coalesce(p_photos, '{}'),
    p_shipping_type,
    case
      when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end,
    p_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- accept_quote + rate limit (wallet check já existe) ----------
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
  perform private.enforce_rate_limit('accept_quote', 10, 300);

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

-- ---------- open_dispute + rate limit ----------
create or replace function public.open_dispute(p_kind text, p_order_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_shop   uuid;
  v_uid    uuid := auth.uid();
  v_id     uuid;
begin
  perform private.enforce_rate_limit('open_dispute', 5, 3600);

  if coalesce(trim(p_reason), '') = '' then raise exception 'Descreva o motivo da disputa'; end if;

  if p_kind = 'produto' then
    select client_id, shop_id into v_client, v_shop from public.product_orders where id = p_order_id;
  elsif p_kind = 'reparo' then
    select client_id, shop_id into v_client, v_shop from public.service_orders where id = p_order_id;
  else
    raise exception 'Tipo inválido';
  end if;
  if v_client is null then raise exception 'Pedido não encontrado'; end if;

  if v_uid <> v_client and v_uid <> (select owner_id from public.shops where id = v_shop) then
    raise exception 'Sem permissão';
  end if;

  if exists (
    select 1 from public.disputes d
    where d.status in ('aberta', 'em_analise')
      and ((p_kind = 'produto' and d.product_order_id = p_order_id)
        or (p_kind = 'reparo'  and d.service_order_id = p_order_id))
  ) then
    raise exception 'Já existe uma disputa aberta para este pedido';
  end if;

  insert into public.disputes (kind, service_order_id, product_order_id, client_id, shop_id, opened_by, reason)
  values (
    p_kind,
    case when p_kind = 'reparo'  then p_order_id end,
    case when p_kind = 'produto' then p_order_id end,
    v_client, v_shop, v_uid, trim(p_reason)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- upsert_my_shop: perfil completo para assistência ----------
create or replace function public.upsert_my_shop(
  p_name      text,
  p_address   text,
  p_brands    text[],
  p_radius    numeric,
  p_lat       double precision,
  p_lng       double precision,
  p_is_online boolean default true
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id     uuid;
  v_role   public.user_role;
  v_cpf    text;
  v_name   text;
begin
  select role, nullif(trim(cpf), ''), nullif(trim(full_name), '')
    into v_role, v_cpf, v_name
    from public.profiles
   where id = auth.uid();

  if v_role is distinct from 'assistencia' then
    raise exception 'Somente contas de assistência podem configurar uma loja';
  end if;

  if v_cpf is null or v_name is null then
    raise exception 'Complete CPF e nome no cadastro antes de configurar a loja';
  end if;

  insert into public.shops (owner_id, name, address, brands, service_radius_km, location, is_online)
  values (
    auth.uid(), p_name, p_address, coalesce(p_brands, '{}'), coalesce(p_radius, 10),
    case
      when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end,
    coalesce(p_is_online, true)
  )
  on conflict (owner_id) do update set
    name              = excluded.name,
    address           = excluded.address,
    brands            = excluded.brands,
    service_radius_km = excluded.service_radius_km,
    location          = excluded.location,
    is_online         = excluded.is_online
  returning id into v_id;

  return v_id;
end;
$$;
