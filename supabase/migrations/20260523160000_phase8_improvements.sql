-- ============================================================================
-- zllo — Fase 8: payloads de notificação corrigidos + interesse vitrine P2P
-- ============================================================================

-- OS: inclui request_id para deep link correto (pedido/[request_id]).
create or replace function private.notify_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_label text;
begin
  if new.status is distinct from old.status then
    v_label := case new.status
      when 'aguardando_coleta' then 'Aguardando coleta/entrega'
      when 'coletado'          then 'Aparelho recebido'
      when 'em_analise'        then 'Em análise'
      when 'aprovado'          then 'Aprovado'
      when 'em_manutencao'     then 'Em manutenção'
      when 'pronto'            then 'Reparo concluído'
      when 'em_devolucao'      then 'Em devolução'
      when 'concluida'         then 'Entregue'
      when 'cancelada'         then 'Cancelada'
      else new.status::text end;
    perform private.send_push(
      new.client_id, 'Atualização do seu reparo', v_label,
      jsonb_build_object(
        'type', 'order',
        'order_id', new.id,
        'request_id', new.request_id,
        'status', new.status
      ));
  end if;
  return new;
end $$;

-- Mensagem: inclui shop_id para abrir chat no cliente.
create or replace function private.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_client uuid; v_owner uuid; v_recipient uuid;
begin
  if new.request_id is not null then
    select client_id into v_client from public.repair_requests where id = new.request_id;
  end if;
  if new.shop_id is not null then
    select owner_id into v_owner from public.shops where id = new.shop_id;
  end if;
  v_recipient := case when new.sender_id = v_client then v_owner else v_client end;
  if v_recipient is not null and v_recipient <> new.sender_id then
    perform private.send_push(
      v_recipient, 'Nova mensagem', left(new.body, 120),
      jsonb_build_object(
        'type', 'message',
        'request_id', new.request_id,
        'shop_id', new.shop_id
      ));
  end if;
  return new;
end $$;

-- Pagamento reparo: inclui request_id para a loja abrir a OS.
create or replace function private.notify_payment_paid()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_request_id uuid;
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    select owner_id into v_owner from public.shops where id = new.shop_id;
    select request_id into v_request_id from public.service_orders where id = new.order_id;
    if v_owner is not null then
      perform private.send_push(
        v_owner, 'Pagamento recebido 💸',
        'O cliente pagou o reparo. Pode dar andamento!',
        jsonb_build_object(
          'type', 'payment',
          'order_id', new.order_id,
          'request_id', v_request_id
        ));
    end if;
  end if;
  return new;
end $$;

-- Pedido produto: order_id já é product_orders.id (correto para pedido-produto).
create or replace function private.notify_product_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_label text;
begin
  if new.status is distinct from old.status then
    if new.status = 'pago' then
      select owner_id into v_owner from public.shops where id = new.shop_id;
      if v_owner is not null then
        perform private.send_push(
          v_owner, 'Nova venda paga 🛍️',
          'Você recebeu um pedido pago no marketplace. Separe e entregue!',
          jsonb_build_object('type', 'product_order', 'order_id', new.id, 'product_order_id', new.id));
      end if;
    end if;

    if new.status in ('separando', 'pronto', 'concluido', 'cancelado') then
      v_label := case new.status
        when 'separando' then 'Seu pedido está em separação'
        when 'pronto'    then 'Seu pedido está pronto'
        when 'concluido' then 'Pedido concluído'
        when 'cancelado' then 'Pedido cancelado'
        else new.status::text end;
      perform private.send_push(
        new.client_id, 'Atualização do seu pedido', v_label,
        jsonb_build_object(
          'type', 'product_order',
          'order_id', new.id,
          'product_order_id', new.id,
          'status', new.status
        ));
    end if;
  end if;
  return new;
end $$;

-- Disputas: inclui kind e IDs navegáveis.
create or replace function private.notify_dispute_opened()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner     uuid;
  v_recipient uuid;
  v_admin     uuid;
  v_request   uuid;
  v_payload   jsonb;
begin
  select owner_id into v_owner from public.shops where id = new.shop_id;
  if new.service_order_id is not null then
    select request_id into v_request from public.service_orders where id = new.service_order_id;
  end if;

  v_payload := jsonb_build_object(
    'type', 'dispute',
    'dispute_id', new.id,
    'kind', new.kind,
    'service_order_id', new.service_order_id,
    'product_order_id', new.product_order_id,
    'request_id', v_request
  );

  v_recipient := case when new.opened_by = new.client_id then v_owner else new.client_id end;
  if v_recipient is not null and v_recipient <> new.opened_by then
    perform private.send_push(v_recipient, 'Disputa aberta', 'Há uma disputa sobre um pedido. Acompanhe pelo app.', v_payload);
  end if;

  for v_admin in select user_id from public.admins loop
    perform private.send_push(
      v_admin, 'Nova disputa 🛡️',
      'Uma disputa foi aberta e precisa de mediação.',
      v_payload);
  end loop;

  return new;
end $$;

create or replace function private.notify_dispute_resolved()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_label text;
  v_request uuid;
  v_payload jsonb;
begin
  if new.status is distinct from old.status and new.status in ('resolvida', 'recusada') then
    v_label := case new.status
      when 'resolvida' then 'Sua disputa foi resolvida'
      else 'Sua disputa foi recusada' end;
    select owner_id into v_owner from public.shops where id = new.shop_id;
    if new.service_order_id is not null then
      select request_id into v_request from public.service_orders where id = new.service_order_id;
    end if;

    v_payload := jsonb_build_object(
      'type', 'dispute',
      'dispute_id', new.id,
      'kind', new.kind,
      'service_order_id', new.service_order_id,
      'product_order_id', new.product_order_id,
      'request_id', v_request
    );

    perform private.send_push(
      new.client_id, v_label,
      coalesce(new.resolution, 'Veja os detalhes no app.'),
      v_payload);

    if v_owner is not null then
      perform private.send_push(v_owner, 'Disputa atualizada', v_label, v_payload);
    end if;
  end if;
  return new;
end $$;

-- ---------- Vitrine P2P: interesse + contato ----------

create table public.listing_interests (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id   uuid not null references public.profiles(id) on delete cascade,
  message    text,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create index listing_interests_listing_idx on public.listing_interests (listing_id);
create index listing_interests_buyer_idx on public.listing_interests (buyer_id);

grant select on public.listing_interests to authenticated;

alter table public.listing_interests enable row level security;

create policy "listing_interests_buyer_select" on public.listing_interests
  for select to authenticated
  using (buyer_id = (select auth.uid()));

create policy "listing_interests_seller_select" on public.listing_interests
  for select to authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.seller_id = (select auth.uid())
  ));

create or replace function public.express_listing_interest(p_listing_id uuid, p_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
  v_title text;
  v_buyer_name text;
begin
  select seller_id, title into v_seller, v_title
    from public.listings where id = p_listing_id;
  if v_seller is null then raise exception 'Anúncio não encontrado'; end if;
  if v_seller = (select auth.uid()) then raise exception 'Você não pode demonstrar interesse no próprio anúncio'; end if;

  insert into public.listing_interests (listing_id, buyer_id, message)
  values (p_listing_id, (select auth.uid()), nullif(trim(p_message), ''))
  on conflict (listing_id, buyer_id) do update
    set message = excluded.message, created_at = now();

  select full_name into v_buyer_name from public.profiles where id = (select auth.uid());

  perform private.send_push(
    v_seller, 'Interesse no seu anúncio',
    coalesce(v_buyer_name, 'Alguém') || ' quer saber mais sobre "' || left(v_title, 40) || '".',
    jsonb_build_object('type', 'listing_interest', 'listing_id', p_listing_id)
  );
end $$;

grant execute on function public.express_listing_interest(uuid, text) to authenticated;

create or replace function public.get_listing_seller_contact(p_listing_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_seller uuid;
  v_name text;
  v_phone text;
begin
  if not exists (
    select 1 from public.listing_interests
    where listing_id = p_listing_id and buyer_id = (select auth.uid())
  ) then
    raise exception 'Registre interesse antes de ver o contato';
  end if;

  select seller_id into v_seller from public.listings where id = p_listing_id;
  select full_name, phone into v_name, v_phone from public.profiles where id = v_seller;

  return jsonb_build_object('full_name', v_name, 'phone', v_phone);
end $$;

grant execute on function public.get_listing_seller_contact(uuid) to authenticated;
