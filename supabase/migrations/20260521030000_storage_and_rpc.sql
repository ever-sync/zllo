-- ============================================================================
-- zllo — Storage (fotos) + RPC para criar solicitação
-- ============================================================================

-- ---------- Bucket público de fotos ----------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Leitura pública; escrita só na pasta do próprio usuário ({uid}/...)
-- (drop antes de create para a migration ser re-executável)
drop policy if exists "photos_public_read" on storage.objects;
drop policy if exists "photos_owner_insert" on storage.objects;
drop policy if exists "photos_owner_update" on storage.objects;
drop policy if exists "photos_owner_delete" on storage.objects;

create policy "photos_public_read" on storage.objects for select
  using (bucket_id = 'photos');

create policy "photos_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- RPC: cria solicitação (monta a geography e dispara o matching) ----------
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

grant execute on function public.create_repair_request(
  uuid, text, text[], public.shipping_type, double precision, double precision, text
) to authenticated;

-- ---------- RPC: cria/atualiza a loja do usuário (assistência) ----------
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
  v_id uuid;
begin
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

grant execute on function public.upsert_my_shop(
  text, text, text[], numeric, double precision, double precision, boolean
) to authenticated;

-- ---------- RPC: cliente aceita um orçamento → cria a Ordem de Serviço ----------
create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote   public.quotes%rowtype;
  v_req     public.repair_requests%rowtype;
  v_order_id uuid;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then raise exception 'Orçamento não encontrado'; end if;

  select * into v_req from public.repair_requests where id = v_quote.request_id;
  if v_req.client_id <> auth.uid() then raise exception 'Sem permissão'; end if;
  if v_req.status <> 'aberta' then raise exception 'Esta solicitação já foi fechada'; end if;

  update public.quotes set status = 'aceito' where id = v_quote.id;
  update public.quotes set status = 'recusado'
    where request_id = v_quote.request_id and id <> v_quote.id and status = 'enviado';

  update public.repair_requests
    set status = 'fechada', chosen_quote_id = v_quote.id
    where id = v_req.id;

  insert into public.service_orders
    (request_id, quote_id, client_id, shop_id, device_id, value, status)
  values
    (v_req.id, v_quote.id, v_req.client_id, v_quote.shop_id, v_req.device_id, v_quote.value, 'aguardando_coleta')
  returning id into v_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (v_order_id, 'aguardando_coleta', 'Orçamento aceito pelo cliente', auth.uid());

  return v_order_id;
end;
$$;

grant execute on function public.accept_quote(uuid) to authenticated;

-- ---------- RPC: assistência avança o status da OS (com evento na timeline) ----------
create or replace function public.advance_service_order(
  p_order_id uuid,
  p_status   public.service_order_status,
  p_note     text default null
) returns void
language plpgsql
security invoker
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

grant execute on function public.advance_service_order(
  uuid, public.service_order_status, text
) to authenticated;
