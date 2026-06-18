-- ============================================================================
-- zllo — Uber Direct (entrega marketplace)
-- ============================================================================

alter table public.shops
  add column if not exists pickup_phone text,
  add column if not exists pickup_street text,
  add column if not exists pickup_number text,
  add column if not exists pickup_cep text,
  add column if not exists pickup_city text,
  add column if not exists pickup_uf text;

alter table public.product_orders
  add column if not exists delivery_fee numeric not null default 0,
  add column if not exists delivery_provider text,
  add column if not exists uber_quote_id text,
  add column if not exists dropoff_json jsonb;

create table public.uber_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  kind                text not null default 'product_order',
  ref_id              uuid not null,
  shop_id             uuid references public.shops(id) on delete set null,
  uber_delivery_id    text,
  uber_quote_id       text,
  status              text not null default 'quoted',
  fee_cents           int,
  tracking_url        text,
  courier_lat         double precision,
  courier_lng         double precision,
  pickup_address_json jsonb not null default '{}'::jsonb,
  dropoff_address_json jsonb not null default '{}'::jsonb,
  raw_last_event      jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index uber_deliveries_ref_kind_idx on public.uber_deliveries (kind, ref_id);
create index uber_deliveries_shop_idx on public.uber_deliveries (shop_id, created_at desc);

grant select on public.uber_deliveries to authenticated;

alter table public.uber_deliveries enable row level security;

create policy "uber_deliveries_select_party" on public.uber_deliveries
  for select to authenticated
  using (
    exists (
      select 1 from public.product_orders o
      where o.id = ref_id and kind = 'product_order'
        and (o.client_id = (select auth.uid()) or o.shop_id = private.current_shop_id())
    )
  );

create trigger trg_uber_deliveries_updated before update on public.uber_deliveries
  for each row execute function private.set_updated_at();

alter publication supabase_realtime add table public.uber_deliveries;

-- ---------- create_product_order com frete Uber ----------
create or replace function public.create_product_order(
  p_shop_id         uuid,
  p_items           jsonb,
  p_shipping_type   text,
  p_address         text default null,
  p_delivery_fee    numeric default 0,
  p_uber_quote_id   text default null,
  p_dropoff_json    jsonb default null,
  p_delivery_provider text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qty      int;
  v_fee      numeric := coalesce(p_delivery_fee, 0);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if not exists (select 1 from public.shops where id = p_shop_id) then
    raise exception 'Loja indisponível. Atualize o carrinho.';
  end if;
  if p_shipping_type = 'entrega' and coalesce(trim(p_address), '') = '' then
    raise exception 'Informe o endereço de entrega';
  end if;
  if p_shipping_type = 'entrega' and p_delivery_provider = 'uber_direct' then
    if v_fee <= 0 or coalesce(trim(p_uber_quote_id), '') = '' then
      raise exception 'Cotação de entrega inválida. Tente novamente.';
    end if;
    if p_dropoff_json is null then
      raise exception 'Endereço de entrega incompleto';
    end if;
  end if;

  insert into public.product_orders (
    client_id, shop_id, total, shipping_type, address, status,
    delivery_fee, delivery_provider, uber_quote_id, dropoff_json
  )
  values (
    (select auth.uid()), p_shop_id, 0, p_shipping_type::public.product_shipping,
    nullif(trim(p_address), ''), 'aguardando_pagamento',
    v_fee, nullif(trim(p_delivery_provider), ''), nullif(trim(p_uber_quote_id), ''), p_dropoff_json
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and shop_id = p_shop_id and is_active = true;
    if not found then raise exception 'Produto indisponível. Atualize o carrinho.'; end if;

    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    if v_product.stock < v_qty then
      raise exception 'Estoque insuficiente para %', v_product.name;
    end if;

    insert into public.product_order_items (order_id, product_id, name, unit_price, qty, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  update public.product_orders set total = v_subtotal + v_fee where id = v_order_id;
  return v_order_id;
end;
$$;

grant execute on function public.create_product_order(uuid, jsonb, text, text, numeric, text, jsonb, text) to authenticated;
