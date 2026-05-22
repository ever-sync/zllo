-- ============================================================================
-- zllo — Pagamento de TESTE (sem provedor) para validar o fluxo
-- Confirma um pedido como pago via RPC, mas SÓ se app_config.allow_test_payments
-- estiver true. Em produção a tabela nasce sem linha → desabilitado por padrão
-- (o seed liga isso só no ambiente local). Nunca substitui o Pix real.
-- ============================================================================

create table public.app_config (
  id                  int primary key default 1 check (id = 1),
  allow_test_payments boolean not null default false
);
alter table public.app_config enable row level security;
grant select on public.app_config to authenticated;
create policy "app_config_read" on public.app_config for select to authenticated using (true);

-- Confirma o pagamento de um pedido do próprio cliente (modo teste).
create or replace function public.confirm_payment_test(p_kind text, p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_client uuid;
  v_shop   uuid;
  v_value  numeric;
  v_comm   numeric;
begin
  if not coalesce((select allow_test_payments from public.app_config where id = 1), false) then
    raise exception 'Pagamento de teste desabilitado';
  end if;

  if p_kind = 'produto' then
    select client_id into v_client from public.product_orders where id = p_order_id;
    if v_client is null then raise exception 'Pedido não encontrado'; end if;
    if v_client <> v_uid then raise exception 'Sem permissão'; end if;
    update public.product_orders
       set status = 'pago', paid_at = now(),
           provider_payment_id = coalesce(provider_payment_id, 'test_' || p_order_id::text)
     where id = p_order_id and status = 'aguardando_pagamento';

  elsif p_kind = 'reparo' then
    select client_id, shop_id, value into v_client, v_shop, v_value
      from public.service_orders where id = p_order_id;
    if v_client is null then raise exception 'OS não encontrada'; end if;
    if v_client <> v_uid then raise exception 'Sem permissão'; end if;
    v_comm := round(v_value * 0.03, 2);
    insert into public.payments
      (order_id, client_id, shop_id, amount, commission, shop_amount, status, method, provider, provider_payment_id, paid_at)
    values
      (p_order_id, v_client, v_shop, v_value, v_comm, round(v_value - v_comm, 2), 'pago', 'test', 'test', 'test_' || p_order_id::text, now())
    on conflict (order_id) do update set status = 'pago', paid_at = now();

  else
    raise exception 'Tipo inválido';
  end if;
end $$;
grant execute on function public.confirm_payment_test(text, uuid) to authenticated;
