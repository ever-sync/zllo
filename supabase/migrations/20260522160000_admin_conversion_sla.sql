-- Métricas operacionais admin: conversão orçamento→OS e SLA de 1ª resposta.

create or replace function public.admin_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_requests_with_quotes int;
  v_service_orders int;
  v_conversion numeric;
  v_avg_first_quote_min numeric;
  v_sla_met_pct numeric;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;

  select count(distinct request_id) into v_requests_with_quotes from public.quotes;
  select count(*) into v_service_orders from public.service_orders;

  v_conversion := round(
    100.0 * v_service_orders::numeric / nullif(v_requests_with_quotes, 0),
    1
  );

  select round(avg(extract(epoch from (fq.first_at - r.created_at)) / 60.0)::numeric, 0)
    into v_avg_first_quote_min
  from public.repair_requests r
  join lateral (
    select min(q.created_at) as first_at from public.quotes q where q.request_id = r.id
  ) fq on true
  where r.created_at > now() - interval '90 days';

  select round(
    100.0 * count(*) filter (where q.first_at <= t.responds_by) / nullif(count(*), 0),
    1
  )
    into v_sla_met_pct
  from public.request_targets t
  join lateral (
    select min(q.created_at) as first_at
    from public.quotes q
    where q.request_id = t.request_id and q.shop_id = t.shop_id
  ) q on t.status = 'orcou';

  return jsonb_build_object(
    'shops',               (select count(*) from public.shops),
    'shops_online',        (select count(*) from public.shops where is_online),
    'clients',             (select count(*) from public.profiles where role = 'cliente'),
    'requests_open',       (select count(*) from public.repair_requests where status = 'aberta'),
    'service_orders',      v_service_orders,
    'requests_with_quotes', v_requests_with_quotes,
    'conversion_quote_to_os_pct', coalesce(v_conversion, 0),
    'avg_first_quote_minutes', coalesce(v_avg_first_quote_min, 0),
    'sla_first_quote_on_time_pct', coalesce(v_sla_met_pct, 0),
    'product_orders_paid', (select count(*) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'gmv_repair',          (select coalesce(sum(amount),0) from public.payments where status = 'pago'),
    'gmv_products',        (select coalesce(sum(total),0) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'commission_repair',   (select coalesce(sum(commission),0) from public.payments where status = 'pago'),
    'commission_products', (select coalesce(sum(coalesce(commission, total * 0.03)),0) from public.product_orders where status in ('pago','separando','pronto','concluido')),
    'reviews',             (select count(*) from public.reviews),
    'webhook_issues_24h',  (select count(*) from public.webhook_events
                              where outcome in ('no_match', 'error', 'revalidate_failed')
                                and created_at > now() - interval '24 hours'),
    'disputes_open',       (select count(*) from public.disputes where status in ('aberta', 'em_analise'))
  );
end;
$$;
