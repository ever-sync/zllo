-- ============================================================================
-- zllo — Push do marketplace + confirmação de pagamento (completa a cobertura)
-- O push do reparo já existia (nova solicitação, orçamento, status da OS,
-- mensagem). Aqui cobrimos os eventos novos:
--   - pedido de produto PAGO  → avisa a loja (separar/entregar)
--   - pedido de produto avança → avisa o cliente
--   - pagamento do reparo PAGO → avisa a loja
-- Reaproveita private.send_push (fail-safe).
-- ============================================================================

-- Pedido de produto: pago → loja; avanço de fulfilment → cliente.
create or replace function private.notify_product_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_label text;
begin
  if new.status is distinct from old.status then
    if new.status = 'pago' then
      select owner_id into v_owner from public.shops where id = new.shop_id;
      if v_owner is not null then
        perform private.send_push(
          v_owner, 'Nova venda paga 🛍️',
          'Você recebeu um pedido pago no marketplace. Separe e entregue!',
          jsonb_build_object('type', 'product_order', 'order_id', new.id));
      end if;
    end if;

    if new.status in ('separando', 'pronto', 'concluido', 'cancelado') then
      v_label := case new.status
        when 'separando' then 'Seu pedido está em separação'
        when 'pronto'    then 'Seu pedido está pronto'
        when 'concluido' then 'Pedido concluído'
        when 'cancelado' then 'Pedido cancelado'
        else new.status::text end;
      perform private.send_push(
        new.client_id, 'Atualização do seu pedido', v_label,
        jsonb_build_object('type', 'product_order', 'order_id', new.id, 'status', new.status));
    end if;
  end if;
  return new;
end $$;

create trigger trg_notify_product_order after update on public.product_orders
  for each row execute function private.notify_product_order();

-- Pagamento do reparo confirmado (webhook) → avisa a loja.
create or replace function private.notify_payment_paid()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    select owner_id into v_owner from public.shops where id = new.shop_id;
    if v_owner is not null then
      perform private.send_push(
        v_owner, 'Pagamento recebido 💸',
        'O cliente pagou o reparo. Pode dar andamento!',
        jsonb_build_object('type', 'payment', 'order_id', new.order_id));
    end if;
  end if;
  return new;
end $$;

create trigger trg_notify_payment_paid after update on public.payments
  for each row execute function private.notify_payment_paid();
