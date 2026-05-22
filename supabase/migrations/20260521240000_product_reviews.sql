-- ============================================================================
-- zllo — Avaliação de pedidos de produto (marketplace)
-- Generaliza reviews para aceitar OS de reparo OU pedido de produto. Ambos
-- alimentam a mesma nota/contagem da loja (trigger já existente).
-- ============================================================================

alter table public.reviews alter column order_id drop not null;
alter table public.reviews drop constraint if exists reviews_order_id_key;
alter table public.reviews add column if not exists product_order_id uuid
  references public.product_orders(id) on delete cascade;

-- Exatamente um alvo (reparo OU produto).
alter table public.reviews drop constraint if exists reviews_one_target;
alter table public.reviews add constraint reviews_one_target check (
  (order_id is not null and product_order_id is null) or
  (order_id is null and product_order_id is not null)
);

-- Uma avaliação por OS / por pedido de produto.
create unique index if not exists reviews_order_ux  on public.reviews (order_id)         where order_id is not null;
create unique index if not exists reviews_porder_ux on public.reviews (product_order_id) where product_order_id is not null;

-- O cliente só avalia o próprio pedido de produto, e somente concluído.
create or replace function private.can_review_product_order(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.product_orders o
    where o.id = p_id
      and o.client_id = (select auth.uid())
      and o.status = 'concluido'
  );
$$;

drop policy if exists "reviews_insert_client" on public.reviews;
create policy "reviews_insert_client" on public.reviews for insert to authenticated
  with check (
    client_id = (select auth.uid()) and (
      (order_id is not null and private.can_review_order(order_id)) or
      (product_order_id is not null and private.can_review_product_order(product_order_id))
    )
  );
