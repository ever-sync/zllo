-- ============================================================================
-- zllo — Marketplace: navegação de produtos pelo cliente (Fase M2)
-- RPC que lista produtos ATIVOS de todas as lojas com a distância calculada
-- no servidor (shops.location é privada às contrapartes, então o cálculo fica
-- numa função security definer — devolve só a distância, nunca as coordenadas).
-- ============================================================================

create or replace function public.browse_products(
  p_lat      double precision default null,
  p_lng      double precision default null,
  p_search   text default null,
  p_category text default null
) returns table (
  id          uuid,
  shop_id     uuid,
  shop_name   text,
  name        text,
  description text,
  category    text,
  price       numeric,
  stock       int,
  photos      text[],
  distance_m  double precision
)
language sql stable security definer set search_path = ''
as $$
  select
    p.id, p.shop_id, s.name as shop_name, p.name, p.description,
    p.category, p.price, p.stock, p.photos,
    case
      when p_lat is null or p_lng is null or s.location is null then null
      else extensions.st_distance(
        s.location,
        extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      )
    end as distance_m
  from public.products p
  join public.shops s on s.id = p.shop_id
  where p.is_active = true
    and (p_category is null or p_category = '' or p.category = p_category)
    and (
      p_search is null or p_search = ''
      or p.name ilike '%' || p_search || '%'
      or p.description ilike '%' || p_search || '%'
    )
  order by distance_m asc nulls last, p.created_at desc;
$$;

grant execute on function public.browse_products(double precision, double precision, text, text)
  to authenticated;
