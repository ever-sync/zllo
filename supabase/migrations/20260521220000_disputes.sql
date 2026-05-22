-- ============================================================================
-- zllo — Disputas / mediação (admin)
-- Cliente ou loja abre uma disputa sobre um pedido (reparo ou produto); o admin
-- media e resolve. Abertura/resolução só via RPC (validações + guard is_admin);
-- as partes leem as próprias via RLS.
-- ============================================================================

create type public.dispute_status as enum ('aberta', 'em_analise', 'resolvida', 'recusada', 'cancelada');

create table public.disputes (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('reparo', 'produto')),
  service_order_id uuid references public.service_orders(id) on delete cascade,
  product_order_id uuid references public.product_orders(id) on delete cascade,
  client_id        uuid not null references public.profiles(id) on delete cascade,
  shop_id          uuid not null references public.shops(id) on delete cascade,
  opened_by        uuid not null references public.profiles(id) on delete cascade,
  reason           text not null,
  status           public.dispute_status not null default 'aberta',
  resolution       text,
  resolved_by      uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (
    (kind = 'reparo'  and service_order_id is not null) or
    (kind = 'produto' and product_order_id is not null)
  )
);
create index disputes_client_idx  on public.disputes (client_id);
create index disputes_shop_idx    on public.disputes (shop_id);
create index disputes_product_idx on public.disputes (product_order_id);
create index disputes_service_idx on public.disputes (service_order_id);

grant select on public.disputes to authenticated; -- escrita só via RPC
alter table public.disputes enable row level security;

-- As partes (cliente / loja) leem as próprias disputas. Admin usa RPC.
create policy "disputes_select_party" on public.disputes for select to authenticated
  using (client_id = (select auth.uid()) or shop_id = private.current_shop_id());

create trigger trg_disputes_updated before update on public.disputes
  for each row execute function private.set_updated_at();

alter publication supabase_realtime add table public.disputes;

-- ---------- Abrir disputa (cliente ou loja, parte do pedido) ----------
create or replace function public.open_dispute(p_kind text, p_order_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid;
  v_shop   uuid;
  v_uid    uuid := (select auth.uid());
  v_id     uuid;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'Descreva o motivo da disputa'; end if;

  if p_kind = 'produto' then
    select client_id, shop_id into v_client, v_shop from public.product_orders where id = p_order_id;
  elsif p_kind = 'reparo' then
    select client_id, shop_id into v_client, v_shop from public.service_orders where id = p_order_id;
  else
    raise exception 'Tipo inválido';
  end if;
  if v_client is null then raise exception 'Pedido não encontrado'; end if;

  if v_uid <> v_client and v_uid <> (select owner_id from public.shops where id = v_shop) then
    raise exception 'Sem permissão';
  end if;

  if exists (
    select 1 from public.disputes d
    where d.status in ('aberta', 'em_analise')
      and ((p_kind = 'produto' and d.product_order_id = p_order_id)
        or (p_kind = 'reparo'  and d.service_order_id = p_order_id))
  ) then
    raise exception 'Já existe uma disputa aberta para este pedido';
  end if;

  insert into public.disputes (kind, service_order_id, product_order_id, client_id, shop_id, opened_by, reason)
  values (
    p_kind,
    case when p_kind = 'reparo'  then p_order_id end,
    case when p_kind = 'produto' then p_order_id end,
    v_client, v_shop, v_uid, trim(p_reason)
  )
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.open_dispute(text, uuid, text) to authenticated;

-- ---------- Admin: listar disputas ----------
create or replace function public.admin_disputes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'status', d.status::text, 'reason', d.reason,
      'resolution', d.resolution, 'shop', s.name, 'client', p.full_name,
      'opened_by', case when d.opened_by = d.client_id then 'cliente' else 'loja' end,
      'value', coalesce(po.total, so.value), 'created_at', d.created_at
    ) order by
      case d.status when 'aberta' then 0 when 'em_analise' then 1 else 2 end,
      d.created_at desc)
    from public.disputes d
    join public.shops s on s.id = d.shop_id
    join public.profiles p on p.id = d.client_id
    left join public.product_orders po on po.id = d.product_order_id
    left join public.service_orders so on so.id = d.service_order_id
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_disputes() to authenticated;

-- ---------- Admin: resolver disputa ----------
create or replace function public.admin_resolve_dispute(p_id uuid, p_status public.dispute_status, p_resolution text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if p_status not in ('em_analise', 'resolvida', 'recusada') then
    raise exception 'Status inválido';
  end if;
  update public.disputes
     set status = p_status,
         resolution = nullif(trim(p_resolution), ''),
         resolved_by = (select auth.uid())
   where id = p_id;
end $$;
grant execute on function public.admin_resolve_dispute(uuid, public.dispute_status, text) to authenticated;
