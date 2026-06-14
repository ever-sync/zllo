-- ============================================================================
-- zllo — Hardening de funções (RPC)
-- - OS e eventos só mutáveis via accept_quote / advance_service_order (definer)
-- - profiles.role imutável pelo usuário (signup continua via trigger definer)
-- - upsert_my_shop exige role assistencia
-- - get_repair_request_detail: uma round-trip para a tela de pedido
-- ============================================================================

-- ---------- Impede escalada de privilégio via UPDATE de role ----------
revoke update (role) on public.profiles from authenticated;

-- ---------- service_orders: leitura via RLS; escrita só via RPC definer ----------
drop policy if exists "orders_client_insert" on public.service_orders;
drop policy if exists "orders_party_update" on public.service_orders;
revoke insert, update on public.service_orders from authenticated;

-- ---------- service_order_events: leitura via RLS; insert só via RPC definer ----------
drop policy if exists "events_party_insert" on public.service_order_events;
revoke insert on public.service_order_events from authenticated;

-- ---------- accept_quote (security definer — contorna revoke acima) ----------
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
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then raise exception 'Orçamento não encontrado'; end if;

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

-- ---------- advance_service_order (security definer) ----------
create or replace function public.advance_service_order(
  p_order_id uuid,
  p_status   public.service_order_status,
  p_note     text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid;
begin
  select shop_id into v_shop from public.service_orders where id = p_order_id;
  if v_shop is null or v_shop <> private.current_shop_id() then
    raise exception 'Sem permissão';
  end if;

  update public.service_orders set status = p_status where id = p_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (p_order_id, p_status, p_note, auth.uid());
end;
$$;

-- ---------- upsert_my_shop: só contas de assistência ----------
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
  v_id   uuid;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'assistencia' then
    raise exception 'Somente contas de assistência podem configurar uma loja';
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

-- ---------- Detalhe da solicitação (cliente / loja alvo / parte da OS) ----------
create or replace function public.get_repair_request_detail(p_request_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_client   uuid;
  v_shop     uuid := private.current_shop_id();
  v_order_id uuid;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;

  select r.client_id into v_client
    from public.repair_requests r where r.id = p_request_id;
  if v_client is null then return null; end if;

  if v_client <> v_uid then
    if v_shop is null
       or (
         not private.shop_targeted_on_request(p_request_id)
         and not exists (
           select 1 from public.service_orders o
           where o.request_id = p_request_id and o.shop_id = v_shop
         )
       ) then
      raise exception 'Sem permissão';
    end if;
  end if;

  select o.id into v_order_id
    from public.service_orders o where o.request_id = p_request_id limit 1;

  return json_build_object(
    'request', (
      select json_build_object(
        'id', r.id,
        'description', r.description,
        'status', r.status,
        'device', (
          select json_build_object(
            'brand', d.brand,
            'model', d.model,
            'nickname', d.nickname
          )
          from public.devices d where d.id = r.device_id
        )
      )
      from public.repair_requests r where r.id = p_request_id
    ),
    'quotes', coalesce((
      select json_agg(
        json_build_object(
          'id', q.id,
          'value', q.value,
          'description', q.description,
          'status', q.status,
          'shop_id', q.shop_id,
          'shop', (
            select json_build_object(
              'name', s.name,
              'rating', s.rating,
              'reviews_count', s.reviews_count
            )
            from public.shops s where s.id = q.shop_id
          )
        ) order by q.value asc
      )
      from public.quotes q where q.request_id = p_request_id
    ), '[]'::json),
    'order', (
      select json_build_object(
        'id', o.id,
        'status', o.status,
        'value', o.value,
        'shop_id', o.shop_id,
        'warranty_days', o.warranty_days,
        'shop', (
          select json_build_object('name', s.name)
          from public.shops s where s.id = o.shop_id
        )
      )
      from public.service_orders o where o.request_id = p_request_id
    ),
    'events', coalesce((
      select json_agg(
        json_build_object('status', e.status, 'created_at', e.created_at)
        order by e.created_at asc
      )
      from public.service_order_events e where e.order_id = v_order_id
    ), '[]'::json),
    'review', (
      select json_build_object('id', rev.id, 'rating', rev.rating, 'comment', rev.comment)
      from public.reviews rev where rev.order_id = v_order_id
    ),
    'payment', (
      select json_build_object('id', p.id, 'status', p.status, 'amount', p.amount)
      from public.payments p where p.order_id = v_order_id
    ),
    'dispute', (
      select json_build_object(
        'id', d.id,
        'status', d.status,
        'reason', d.reason,
        'resolution', d.resolution
      )
      from public.disputes d
      where d.service_order_id = v_order_id
      order by d.created_at desc
      limit 1
    )
  );
end;
$$;

grant execute on function public.get_repair_request_detail(uuid) to authenticated;
