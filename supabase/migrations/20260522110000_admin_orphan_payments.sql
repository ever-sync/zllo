-- Pagamentos pendentes que precisam de conciliação manual (webhook falhou ou expirados).

create or replace function public.admin_orphan_payments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  return coalesce((
    select jsonb_agg(t.row order by t.at asc)
    from (
      select
        jsonb_build_object(
          'kind', 'reparo',
          'id', pay.id,
          'shop', s.name,
          'amount', pay.amount,
          'status', pay.status::text,
          'provider_payment_id', pay.provider_payment_id,
          'reason', case
            when pay.provider_payment_id is not null then 'pix_gerado_sem_confirmacao'
            else 'pendente_expirado'
          end,
          'at', pay.created_at
        ) as row,
        pay.created_at as at
      from public.payments pay
      join public.shops s on s.id = pay.shop_id
      where pay.status = 'pendente'
        and (
          pay.provider_payment_id is not null
          or pay.created_at < now() - interval '48 hours'
        )

      union all

      select
        jsonb_build_object(
          'kind', 'produto',
          'id', o.id,
          'shop', s.name,
          'amount', o.total,
          'status', o.status::text,
          'provider_payment_id', o.provider_payment_id,
          'reason', case
            when o.provider_payment_id is not null then 'pix_gerado_sem_confirmacao'
            else 'pendente_expirado'
          end,
          'at', o.created_at
        ),
        o.created_at
      from public.product_orders o
      join public.shops s on s.id = o.shop_id
      where o.status = 'aguardando_pagamento'
        and (
          o.provider_payment_id is not null
          or o.created_at < now() - interval '48 hours'
        )
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_orphan_payments() to authenticated;

-- Confirma manualmente um pagamento pendente (admin).
create or replace function public.admin_reconcile_payment(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  if p_kind = 'reparo' then
    update public.payments
      set status = 'pago', paid_at = coalesce(paid_at, now())
      where id = p_id and status = 'pendente';
    if not found then
      raise exception 'Pagamento não encontrado ou já confirmado';
    end if;

  elsif p_kind = 'produto' then
    update public.product_orders
      set status = 'pago', paid_at = coalesce(paid_at, now())
      where id = p_id and status = 'aguardando_pagamento';
    if not found then
      raise exception 'Pedido não encontrado ou já confirmado';
    end if;

  else
    raise exception 'Tipo inválido';
  end if;
end;
$$;

grant execute on function public.admin_reconcile_payment(text, uuid) to authenticated;
