-- ============================================================================
-- FIX: broadcast respeita o raio configurado por cada loja
-- Antes, o matching usava 10 km fixos e ignorava shops.service_radius_km,
-- de modo que o raio definido no setup da assistência não tinha efeito.
-- ============================================================================
create or replace function private.broadcast_repair_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.location is null then
    return new;
  end if;
  insert into public.request_targets (request_id, shop_id, distance_m, responds_by)
  select new.id,
         s.id,
         extensions.st_distance(s.location, new.location),
         new.expires_at
  from public.shops s
  where s.is_online = true
    and s.location is not null
    and extensions.st_dwithin(s.location, new.location, s.service_radius_km * 1000); -- raio da loja (km -> metros)
  return new;
end;
$$;
