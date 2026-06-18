-- ============================================================================
-- zllo — Cancelamento de pedido pago: estoque + bloqueio cancel via advance RPC
-- ============================================================================

create or replace function private.restore_stock_on_cancel()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelado'
     and old.status is distinct from 'cancelado'
     and old.status in ('pago', 'separando', 'pronto', 'concluido')
  then
    update public.products p
       set stock = p.stock + i.qty
      from public.product_order_items i
     where i.order_id = new.id and i.product_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_porder_restore_stock on public.product_orders;
create trigger trg_porder_restore_stock
  after update on public.product_orders
  for each row execute function private.restore_stock_on_cancel();

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
  if p_status = 'cancelado' then
    raise exception 'Use Cancelar pedido para estorno e entrega Uber';
  end if;
  if p_status not in ('separando', 'pronto', 'concluido') then
    raise exception 'Status inválido para a loja';
  end if;
  update public.product_orders set status = p_status where id = p_order_id;
end;
$$;
