-- ============================================================================
-- zllo — Endereço de coleta da loja (Uber Direct) + push no despacho
-- ============================================================================

drop function if exists public.upsert_my_shop(text, text, text[], numeric, double precision, double precision, boolean);

create or replace function public.upsert_my_shop(
  p_name           text,
  p_address        text,
  p_brands         text[],
  p_radius         numeric,
  p_lat            double precision,
  p_lng            double precision,
  p_is_online      boolean default true,
  p_pickup_phone   text default null,
  p_pickup_street  text default null,
  p_pickup_number  text default null,
  p_pickup_cep     text default null,
  p_pickup_city    text default null,
  p_pickup_uf      text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_role public.user_role;
  v_cpf  text;
  v_name text;
begin
  select role, nullif(trim(cpf), ''), nullif(trim(full_name), '')
    into v_role, v_cpf, v_name
    from public.profiles
   where id = (select auth.uid());

  if v_role is distinct from 'assistencia' then
    raise exception 'Somente contas de assistência podem configurar uma loja';
  end if;

  if v_cpf is null or v_name is null then
    raise exception 'Complete CPF e nome no cadastro antes de configurar a loja';
  end if;

  insert into public.shops (
    owner_id, name, address, brands, service_radius_km, location, is_online,
    pickup_phone, pickup_street, pickup_number, pickup_cep, pickup_city, pickup_uf
  )
  values (
    (select auth.uid()), p_name, p_address, coalesce(p_brands, '{}'), coalesce(p_radius, 10),
    case
      when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end,
    coalesce(p_is_online, true),
    nullif(trim(p_pickup_phone), ''),
    nullif(trim(p_pickup_street), ''),
    nullif(trim(p_pickup_number), ''),
    nullif(trim(p_pickup_cep), ''),
    nullif(trim(p_pickup_city), ''),
    nullif(trim(p_pickup_uf), '')
  )
  on conflict (owner_id) do update set
    name              = excluded.name,
    address           = excluded.address,
    brands            = excluded.brands,
    service_radius_km = excluded.service_radius_km,
    location          = excluded.location,
    is_online         = excluded.is_online,
    pickup_phone      = excluded.pickup_phone,
    pickup_street     = excluded.pickup_street,
    pickup_number     = excluded.pickup_number,
    pickup_cep        = excluded.pickup_cep,
    pickup_city       = excluded.pickup_city,
    pickup_uf         = excluded.pickup_uf
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_my_shop(
  text, text, text[], numeric, double precision, double precision, boolean,
  text, text, text, text, text, text
) to authenticated;

-- Push + in-app (Edge Functions com service role).
create or replace function public.notify_user_push(
  p_user  uuid,
  p_title text,
  p_body  text,
  p_type  text,
  p_data  jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then return; end if;
  perform private.send_push(
    p_user,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb) || jsonb_build_object('type', coalesce(nullif(trim(p_type), ''), 'generic'))
  );
exception when others then
  return;
end;
$$;

grant execute on function public.notify_user_push(uuid, text, text, text, jsonb) to service_role;
