-- ============================================================================
-- zllo — Marketplace: loja enxerga o cliente dos seus pedidos (Fase M3d)
-- Espelha private.shop_sees_client (reparo): a loja passa a ler o profile do
-- cliente (apenas as colunas já liberadas: id, role, full_name, avatar_url)
-- quando existe um pedido de produto entre eles. CPF/telefone seguem privados.
-- ============================================================================

create or replace function private.shop_sees_porder_client(p_client_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.product_orders o
    where o.client_id = p_client_id and o.shop_id = private.current_shop_id()
  );
$$;

create policy "profiles_select_porder_client" on public.profiles for select to authenticated
  using (private.shop_sees_porder_client(id));
