-- ============================================================================
-- zllo — create_product_order: erro limpo para carrinho desatualizado (M3)
-- Se a loja/produto do carrinho não existir mais (ex.: após um db reset que
-- regenera UUIDs), retorna mensagem amigável em vez de violar a FK.
-- ============================================================================

create or replace function public.create_product_order(
  p_shop_id       uuid,
  p_items         jsonb,
  p_shipping_type text,
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
  if not exists (select 1 from public.shops where id = p_shop_id) then
    raise exception 'Loja indisponível. Atualize o carrinho.';
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
    if not found then raise exception 'Produto indisponível. Atualize o carrinho.'; end if;

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
