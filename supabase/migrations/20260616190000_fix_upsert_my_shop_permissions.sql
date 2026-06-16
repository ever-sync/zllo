-- ============================================================================
-- FIX: upsert_my_shop precisa ler profiles após o hardening de grants.
--
-- O usuário autenticado não tem mais SELECT direto em public.profiles; a função
-- checa role/cpf/nome antes de gravar a loja, então deve rodar como definer.
-- ============================================================================
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
security definer
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
   where id = (select auth.uid());

  if v_role is distinct from 'assistencia' then
    raise exception 'Somente contas de assistência podem configurar uma loja';
  end if;

  if v_cpf is null or v_name is null then
    raise exception 'Complete CPF e nome no cadastro antes de configurar a loja';
  end if;

  insert into public.shops (owner_id, name, address, brands, service_radius_km, location, is_online)
  values (
    (select auth.uid()), p_name, p_address, coalesce(p_brands, '{}'), coalesce(p_radius, 10),
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
