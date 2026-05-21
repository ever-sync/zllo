-- ============================================================================
-- zllo — Marketplace: baixa de estoque ao confirmar pagamento (Fase M3c)
-- Quando o pedido transita para 'pago' (via webhook/service role), debita o
-- estoque dos produtos. Idempotente: só dispara na transição para 'pago'.
-- ============================================================================

create or replace function private.decrement_stock_on_paid()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    update public.products p
       set stock = greatest(0, p.stock - i.qty)
      from public.product_order_items i
     where i.order_id = new.id and i.product_id = p.id;
  end if;
  return new;
end;
$$;

create trigger trg_porder_decrement_stock
  after update on public.product_orders
  for each row execute function private.decrement_stock_on_paid();
