-- ============================================================================
-- zllo — Admin: transações globais + moderação de produtos
-- Tudo via RPC security definer com guard is_admin() (oversight sem expor PII
-- sensível; moderação fura o RLS da loja de forma controlada).
-- ============================================================================

-- Transações recentes (reparo + marketplace), mais novas primeiro.
create or replace function public.admin_orders()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return coalesce((
    select jsonb_agg(t.row order by t.at desc)
    from (
      select jsonb_build_object(
               'type', 'Produto', 'id', o.id, 'shop', s.name, 'client', p.full_name,
               'value', o.total, 'status', o.status::text, 'at', o.created_at) as row,
             o.created_at as at
      from public.product_orders o
      join public.shops s on s.id = o.shop_id
      join public.profiles p on p.id = o.client_id
      union all
      select jsonb_build_object(
               'type', 'Reparo', 'id', so.id, 'shop', s.name, 'client', p.full_name,
               'value', so.value, 'status', so.status::text, 'at', so.created_at),
             so.created_at
      from public.service_orders so
      join public.shops s on s.id = so.shop_id
      join public.profiles p on p.id = so.client_id
      order by at desc
      limit 100
    ) t
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_orders() to authenticated;

-- Todos os produtos (com a loja) para moderação.
create or replace function public.admin_products()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'shop', s.name, 'category', p.category,
      'price', p.price, 'stock', p.stock, 'is_active', p.is_active
    ) order by s.name, p.name)
    from public.products p
    join public.shops s on s.id = p.shop_id
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_products() to authenticated;

-- Moderação: admin (des)publica qualquer produto.
create or replace function public.admin_set_product_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update public.products set is_active = p_active where id = p_id;
end $$;
grant execute on function public.admin_set_product_active(uuid, boolean) to authenticated;
