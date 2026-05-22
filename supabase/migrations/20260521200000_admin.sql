-- ============================================================================
-- zllo — Painel Admin (3ª plataforma): identidade segura + métricas globais
-- Admin NÃO vem do signup (senão qualquer um se autopromove). É uma tabela
-- `admins` populada só via SQL/service role. Acesso global via RPCs security
-- definer protegidos por is_admin() (que furam o RLS/grants de coluna de forma
-- controlada — devolvem só agregados/listas, nunca PII solta).
-- ============================================================================

create table public.admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- RLS sem policies e sem grant → tabela inacessível via API; só definers (owner).
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
grant execute on function public.is_admin() to authenticated;

-- KPIs globais da plataforma.
create or replace function public.admin_metrics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'shops',               (select count(*) from public.shops),
    'shops_online',        (select count(*) from public.shops where is_online),
    'clients',             (select count(*) from public.profiles where role = 'cliente'),
    'requests_open',       (select count(*) from public.repair_requests where status = 'aberta'),
    'service_orders',      (select count(*) from public.service_orders),
    'product_orders_paid', (select count(*) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'gmv_repair',          (select coalesce(sum(amount),0) from public.payments where status = 'pago'),
    'gmv_products',        (select coalesce(sum(total),0) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'commission_repair',   (select coalesce(sum(commission),0) from public.payments where status = 'pago'),
    'commission_products', (select coalesce(sum(coalesce(commission, total * 0.03)),0) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'reviews',             (select count(*) from public.reviews)
  );
end $$;
grant execute on function public.admin_metrics() to authenticated;

-- Lista de lojas (visão admin) com indicadores.
create or replace function public.admin_shops()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'is_online', s.is_online,
      'rating', s.rating, 'reviews_count', s.reviews_count,
      'has_wallet', s.asaas_wallet_id is not null,
      'products', (select count(*) from public.products p where p.shop_id = s.id),
      'orders',   (select count(*) from public.product_orders o where o.shop_id = s.id
                     and o.status in ('pago','separando','pronto','concluido'))
    ) order by s.name)
    from public.shops s
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_shops() to authenticated;
