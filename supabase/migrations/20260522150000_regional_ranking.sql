-- ============================================================================
-- zllo — Ranking regional de assistências (gamificado, fail-safe)
-- Retorna lojas online que atenderiam o cliente na localização informada,
-- ordenadas por nota e volume de avaliações. Badges calculados no SQL.
-- ============================================================================

create or replace function public.get_regional_shop_ranking(
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 8
)
returns table (
  id uuid,
  name text,
  rating numeric,
  reviews_count int,
  distance_km numeric,
  rank_position int,
  badge text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_loc extensions.geography;
begin
  if p_lat is not null and p_lng is not null then
    v_loc := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  else
    select p.location into v_loc from public.profiles p where p.id = (select auth.uid());
  end if;

  if v_loc is null then
    v_loc := extensions.st_setsrid(extensions.st_makepoint(-46.6559, -23.5614), 4326)::extensions.geography;
  end if;

  return query
  with nearby as (
    select
      s.id,
      s.name,
      s.rating,
      s.reviews_count,
      round((extensions.st_distance(s.location, v_loc) / 1000.0)::numeric, 1) as distance_km
    from public.shops s
    where s.is_online = true
      and s.location is not null
      and extensions.st_dwithin(s.location, v_loc, s.service_radius_km * 1000)
  ),
  ranked as (
    select
      n.*,
      row_number() over (
        order by n.rating desc, n.reviews_count desc, n.distance_km asc
      )::int as rank_position
    from nearby n
  )
  select
    r.id,
    r.name,
    r.rating,
    r.reviews_count,
    r.distance_km,
    r.rank_position,
    case
      when r.rank_position = 1 then 'top_regiao'
      when r.rating >= 4.8 and r.reviews_count >= 5 then 'elite'
      when r.reviews_count >= 10 then 'experiente'
      else null
    end as badge
  from ranked r
  order by r.rank_position
  limit greatest(1, least(coalesce(p_limit, 8), 20));
end;
$$;

grant execute on function public.get_regional_shop_ranking(double precision, double precision, int) to authenticated;
