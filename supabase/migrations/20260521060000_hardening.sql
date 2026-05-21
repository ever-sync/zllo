-- ============================================================================
-- zllo — Hardening de segurança / privacidade
-- - Tira dados pessoais sensíveis do alcance das contrapartes (LGPD):
--     profiles.cpf/phone/email, repair_requests.location, shops.location,
--     devices.imei  → não-legíveis por outros usuários (nem pelo dono via
--     PostgREST; o dono lê o próprio perfil via RPC security definer).
-- - Endurece o INSERT de mensagens (só participante da conversa).
-- - search_path explícito em set_updated_at e índices de apoio.
-- Observações que tornam isto seguro:
--   * nenhum `select *` do app nessas tabelas (só lib/auth em profiles, que
--     passa a usar get_my_profile);
--   * nenhuma subscription de realtime em profiles/shops/devices/repair_requests;
--   * accept_quote (única função com `select *` em repair_requests) é
--     refatorada abaixo para colunas específicas.
-- ============================================================================

-- ---------- Perfil do próprio usuário (inclui campos sensíveis) ----------
create or replace function public.get_my_profile()
returns public.profiles
language sql stable security definer set search_path = ''
as $$
  select * from public.profiles where id = (select auth.uid());
$$;

grant execute on function public.get_my_profile() to authenticated;

-- ---------- Privilégios por coluna (escondem dados pessoais) ----------
-- Privilégio de tabela domina o de coluna, então primeiro revoga o SELECT
-- de tabela e regrante apenas as colunas não-sensíveis. INSERT/UPDATE/DELETE
-- continuam (são privilégios separados), então cadastros seguem funcionando.

revoke select on public.profiles from authenticated;
grant select (id, role, full_name, avatar_url, created_at, updated_at)
  on public.profiles to authenticated;

revoke select on public.shops from authenticated;
grant select (id, owner_id, name, cnpj, address, service_radius_km, brands,
              is_online, rating, reviews_count, coins, created_at, updated_at)
  on public.shops to authenticated;

revoke select on public.devices from authenticated;
grant select (id, owner_id, nickname, brand, model, color, storage,
              photo_url, created_at)
  on public.devices to authenticated;

revoke select on public.repair_requests from authenticated;
grant select (id, client_id, device_id, description, photos, shipping_type,
              address, status, chosen_quote_id, expires_at, created_at, updated_at)
  on public.repair_requests to authenticated;

-- ---------- accept_quote sem `select *` em repair_requests ----------
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
    (request_id, quote_id, client_id, shop_id, device_id, value, status)
  values
    (v_req_id, v_quote.id, v_client, v_quote.shop_id, v_device, v_quote.value, 'aguardando_coleta')
  returning id into v_order_id;

  insert into public.service_order_events (order_id, status, note, created_by)
  values (v_order_id, 'aguardando_coleta', 'Orçamento aceito pelo cliente', auth.uid());

  return v_order_id;
end;
$$;

-- ---------- Mensagens: só participante pode inserir na conversa ----------
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_participant" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      -- cliente dono da solicitação
      (request_id is not null and private.is_request_owner(request_id))
      -- loja que foi alvo da solicitação (e a mensagem sai como a própria loja)
      or (request_id is not null and shop_id = private.current_shop_id()
          and private.shop_targeted_on_request(request_id))
      -- qualquer parte de uma OS já existente
      or (order_id is not null and private.is_order_party(order_id))
    )
  );

-- ---------- search_path explícito (advisor) ----------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Índices de apoio ----------
create index if not exists messages_request_shop_idx on public.messages (request_id, shop_id);
create index if not exists listings_seller_idx on public.listings (seller_id);
