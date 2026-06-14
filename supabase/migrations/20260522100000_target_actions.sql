-- Marcar solicitação como visualizada / recusada pela loja.

create or replace function public.mark_target_viewed(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := private.current_shop_id();
begin
  if v_shop is null then
    raise exception 'Loja não encontrada';
  end if;

  update public.request_targets
    set status = 'visualizado'
    where request_id = p_request_id
      and shop_id = v_shop
      and status = 'pendente';
end;
$$;

create or replace function public.decline_target(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := private.current_shop_id();
  v_status public.target_status;
begin
  if v_shop is null then
    raise exception 'Loja não encontrada';
  end if;

  select t.status into v_status
    from public.request_targets t
    where t.request_id = p_request_id and t.shop_id = v_shop;

  if v_status is null then
    raise exception 'Solicitação não encontrada';
  end if;

  if v_status in ('orcou', 'recusou', 'expirou') then
    raise exception 'Não é possível recusar esta solicitação';
  end if;

  update public.request_targets
    set status = 'recusou'
    where request_id = p_request_id
      and shop_id = v_shop;
end;
$$;

grant execute on function public.mark_target_viewed(uuid) to authenticated;
grant execute on function public.decline_target(uuid) to authenticated;
