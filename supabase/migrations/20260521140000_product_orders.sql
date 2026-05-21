-- ============================================================================
-- zllo — Marketplace: pedidos de produtos (Fase M3a)
-- Pedido = uma loja (modelo iFood: carrinho de uma loja por vez). Totais são
-- calculados no servidor a partir de products (o cliente nunca dita preço).
-- Pagamento (Pix/Asaas) entra na M3c: as colunas de pagamento já existem aqui
-- e são preenchidas pela Edge Function (service role). Status 'pago' só vem do
-- webhook; a loja avança os demais via RPC; o cliente cancela via RPC.
-- ============================================================================

create type public.product_order_status as enum (
  'aguardando_pagamento', 'pago', 'separando', 'pronto', 'concluido', 'cancelado'
);
create type public.product_shipping as enum ('retirada', 'entrega');

create table public.product_orders (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.profiles(id) on delete cascade,
  shop_id             uuid not null references public.shops(id) on delete cascade,
  total               numeric not null default 0,
  shipping_type       public.product_shipping not null default 'retirada',
  address             text,
  status              public.product_order_status not null default 'aguardando_pagamento',
  -- pagamento (preenchido pela Edge Function / webhook)
  commission          numeric,
  shop_amount         numeric,
  provider_payment_id text,
  pix_payload         text,
  pix_qr              text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.product_order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.product_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,            -- snapshot
  unit_price numeric not null,         -- snapshot
  qty        int not null check (qty > 0),
  subtotal   numeric not null
);

create index product_orders_client_idx on public.product_orders (client_id);
create index product_orders_shop_idx   on public.product_orders (shop_id);
create index product_order_items_order_idx on public.product_order_items (order_id);

grant select, insert, update, delete on public.product_orders      to authenticated;
grant select, insert, update, delete on public.product_order_items to authenticated;

alter table public.product_orders      enable row level security;
alter table public.product_order_items enable row level security;

-- Só há policies de SELECT. Pedidos são criados/alterados exclusivamente pelos
-- RPCs (security definer) ou pelo service role (pagamento) — assim o cliente
-- nunca insere/atualiza direto (preço e status ficam fora do alcance dele).
create policy "porders_select_party" on public.product_orders for select to authenticated
  using (client_id = (select auth.uid()) or shop_id = private.current_shop_id());

create policy "poitems_select_party" on public.product_order_items for select to authenticated
  using (exists (
    select 1 from public.product_orders o
    where o.id = order_id
      and (o.client_id = (select auth.uid()) or o.shop_id = private.current_shop_id())
  ));

create trigger trg_product_orders_updated before update on public.product_orders
  for each row execute function private.set_updated_at();

alter publication supabase_realtime add table public.product_orders;

-- ---------- RPC: cria pedido a partir do carrinho (recalcula tudo) ----------
create or replace function public.create_product_order(
  p_shop_id       uuid,
  p_items         jsonb,          -- [{ "product_id": uuid, "qty": int }, ...]
  p_shipping_type text,           -- 'retirada' | 'entrega'
  p_address       text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_order_id uuid;
  v_total    numeric := 0;
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qty      int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if p_shipping_type = 'entrega' and coalesce(trim(p_address), '') = '' then
    raise exception 'Informe o endereço de entrega';
  end if;

  insert into public.product_orders (client_id, shop_id, total, shipping_type, address, status)
  values ((select auth.uid()), p_shop_id, 0, p_shipping_type::public.product_shipping,
          nullif(trim(p_address), ''), 'aguardando_pagamento')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and shop_id = p_shop_id and is_active = true;
    if not found then raise exception 'Produto indisponível no momento'; end if;

    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    if v_product.stock < v_qty then
      raise exception 'Estoque insuficiente para %', v_product.name;
    end if;

    insert into public.product_order_items (order_id, product_id, name, unit_price, qty, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);

    v_total := v_total + v_product.price * v_qty;
  end loop;

  update public.product_orders set total = v_total where id = v_order_id;
  return v_order_id;
end;
$$;
grant execute on function public.create_product_order(uuid, jsonb, text, text) to authenticated;

-- ---------- RPC: loja avança o status do pedido ----------
create or replace function public.advance_product_order(
  p_order_id uuid,
  p_status   public.product_order_status
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_shop uuid;
  v_cur  public.product_order_status;
begin
  select shop_id, status into v_shop, v_cur from public.product_orders where id = p_order_id;
  if v_shop is null or v_shop <> private.current_shop_id() then
    raise exception 'Sem permissão';
  end if;
  if v_cur in ('aguardando_pagamento', 'concluido', 'cancelado') then
    raise exception 'Pedido não pode ser alterado neste status';
  end if;
  if p_status not in ('separando', 'pronto', 'concluido', 'cancelado') then
    raise exception 'Status inválido para a loja';
  end if;
  update public.product_orders set status = p_status where id = p_order_id;
end;
$$;
grant execute on function public.advance_product_order(uuid, public.product_order_status) to authenticated;

-- ---------- RPC: cliente cancela pedido ainda não pago ----------
create or replace function public.cancel_product_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_cur    public.product_order_status;
begin
  select client_id, status into v_client, v_cur from public.product_orders where id = p_order_id;
  if v_client is null or v_client <> (select auth.uid()) then
    raise exception 'Sem permissão';
  end if;
  if v_cur <> 'aguardando_pagamento' then
    raise exception 'Só dá para cancelar antes do pagamento';
  end if;
  update public.product_orders set status = 'cancelado' where id = p_order_id;
end;
$$;
grant execute on function public.cancel_product_order(uuid) to authenticated;
