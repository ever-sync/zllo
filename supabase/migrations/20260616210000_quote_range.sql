-- ============================================================================
-- zllo — Orçamento como FAIXA (mín–máx) + valor final definido no diagnóstico
--
-- O orçamento passa a ser uma ESTIMATIVA (value_min..value_max) que chega ao
-- cliente. A coluna `value` é mantida (= value_min) para leituras/ordenadores
-- legados. Ao aceitar, a OS nasce SEM valor final (value = 0); a assistência
-- define o valor real depois (no diagnóstico) via set_order_value, e o
-- pagamento fica bloqueado enquanto o valor não for definido.
-- ============================================================================

alter table public.quotes
  add column if not exists value_min numeric,
  add column if not exists value_max numeric;

-- Backfill: orçamentos antigos viram faixa fixa (value..value).
update public.quotes
  set value_min = coalesce(value_min, value),
      value_max = coalesce(value_max, value)
  where value_min is null or value_max is null;

-- ---------- accept_quote: OS nasce sem valor final (a definir) ----------
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

  -- value = 0 → "a definir": a assistência fecha o valor no diagnóstico.
  insert into public.service_orders
    (request_id, quote_id, client_id, shop_id, device_id, value, warranty_days, status)
  values
    (v_req_id, v_quote.id, v_client, v_quote.shop_id, v_device, 0, v_quote.warranty_days, 'aguardando_coleta')
  returning id into v_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (v_order_id, 'aguardando_coleta', 'Orçamento aceito pelo cliente', auth.uid());

  return v_order_id;
end;
$$;

-- ---------- set_order_value: a assistência fecha o valor final da OS ----------
create or replace function public.set_order_value(p_order_id uuid, p_value numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop  uuid;
  v_status public.service_order_status;
begin
  if p_value is null or p_value <= 0 then
    raise exception 'Informe um valor final válido';
  end if;

  select shop_id, status into v_shop, v_status
    from public.service_orders where id = p_order_id;
  if v_shop is null then raise exception 'OS não encontrada'; end if;
  if v_shop is distinct from private.current_shop_id() then
    raise exception 'Sem permissão';
  end if;
  if v_status in ('concluida', 'cancelada') then
    raise exception 'Esta OS já foi encerrada';
  end if;
  if exists (select 1 from public.payments p where p.order_id = p_order_id and p.status = 'pago') then
    raise exception 'O reparo já foi pago — o valor não pode ser alterado';
  end if;

  update public.service_orders set value = p_value where id = p_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (p_order_id, v_status, 'Valor final do reparo definido em R$ ' || to_char(p_value, 'FM999G999D00'), auth.uid());
end;
$$;

grant execute on function public.set_order_value(uuid, numeric) to authenticated;

-- ---------- get_repair_request_detail: expõe a faixa do orçamento ----------
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
          'value_min', q.value_min,
          'value_max', q.value_max,
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
        ) order by q.value_min asc nulls last, q.value asc
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
