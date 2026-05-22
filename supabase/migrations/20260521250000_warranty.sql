-- ============================================================================
-- zllo — Garantia do reparo
-- A loja define a garantia (em dias) no orçamento; ao aceitar, ela acompanha
-- a OS. O cliente vê "garantia de X dias" e, ao concluir, até quando vale.
-- ============================================================================

alter table public.quotes         add column if not exists warranty_days int not null default 0;
alter table public.service_orders add column if not exists warranty_days int not null default 0;

-- accept_quote agora carrega a garantia do orçamento para a OS.
create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote    public.quotes%rowtype;
  v_req_id   uuid;
  v_client   uuid;
  v_status   public.request_status;
  v_device   uuid;
  v_order_id uuid;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then raise exception 'Orçamento não encontrado'; end if;

  select id, client_id, status, device_id
    into v_req_id, v_client, v_status, v_device
    from public.repair_requests where id = v_quote.request_id;
  if v_client <> auth.uid() then raise exception 'Sem permissão'; end if;
  if v_status <> 'aberta' then raise exception 'Esta solicitação já foi fechada'; end if;

  update public.quotes set status = 'aceito' where id = v_quote.id;
  update public.quotes set status = 'recusado'
    where request_id = v_quote.request_id and id <> v_quote.id and status = 'enviado';

  update public.repair_requests
    set status = 'fechada', chosen_quote_id = v_quote.id
    where id = v_req_id;

  insert into public.service_orders
    (request_id, quote_id, client_id, shop_id, device_id, value, warranty_days, status)
  values
    (v_req_id, v_quote.id, v_client, v_quote.shop_id, v_device, v_quote.value, v_quote.warranty_days, 'aguardando_coleta')
  returning id into v_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (v_order_id, 'aguardando_coleta', 'Orçamento aceito pelo cliente', auth.uid());

  return v_order_id;
end;
$$;
