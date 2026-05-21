-- ============================================================================
-- zllo — Geolocalização do endereço do cliente
-- Reintroduz profiles.location (geography) + RPC para o app gravar as
-- coordenadas obtidas do geocoding do endereço cadastrado. Usada como origem
-- de localização na solicitação ("usar meu endereço" vs "localização atual").
-- location é PII: NÃO entra no grant de SELECT por coluna → só o dono lê
-- (via get_my_profile, security definer).
-- ============================================================================

alter table public.profiles
  add column if not exists location extensions.geography(Point, 4326);

create index if not exists profiles_location_gix on public.profiles using gist (location);

-- O app geocodifica o endereço (ex.: por CEP) e grava as coordenadas aqui.
create or replace function public.set_my_location(
  p_lat double precision,
  p_lng double precision
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.profiles
    set location = case
      when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end
  where id = (select auth.uid());
end;
$$;

grant execute on function public.set_my_location(double precision, double precision) to authenticated;
