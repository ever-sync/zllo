-- ============================================================================
-- zllo — Push notifications (Expo Push API via pg_net)
-- O envio é feito por triggers que chamam a Expo Push API direto (sem edge
-- function). É fail-safe: qualquer erro de push NUNCA quebra a operação de
-- negócio (insert/update segue normal mesmo se o pg_net/Expo falhar).
-- ============================================================================

create extension if not exists pg_net;

-- ---------- Tokens de push por usuário ----------
create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

grant select, insert, update, delete on public.push_tokens to authenticated;

alter table public.push_tokens enable row level security;
create policy "push_tokens_manage_own" on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Upsert do token via RPC (security definer) para reatribuir o token ao usuário
-- atual mesmo se o device tiver sido usado por outra conta antes.
create or replace function public.register_push_token(p_token text, p_platform text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, (select auth.uid()), p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

grant execute on function public.register_push_token(text, text) to authenticated;

-- ---------- Envio (fail-safe) ----------
create or replace function private.send_push(p_user uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_body jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', p_title, 'body', p_body, 'sound', 'default', 'data', p_data
         ))
    into v_body
    from public.push_tokens t
    where t.user_id = p_user;

  if v_body is null then return; end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_body
  );
exception when others then
  return; -- push nunca quebra a operação principal
end $$;

-- ---------- Triggers ----------

-- Nova solicitação caiu no raio de uma loja → avisa a loja.
create or replace function private.notify_new_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.shops where id = new.shop_id;
  if v_owner is not null then
    perform private.send_push(
      v_owner, 'Nova solicitação de reparo',
      'Chegou uma solicitação perto de você. Responda rápido!',
      jsonb_build_object('type', 'request', 'request_id', new.request_id));
  end if;
  return new;
end $$;
create trigger trg_notify_new_request after insert on public.request_targets
  for each row execute function private.notify_new_request();

-- Novo orçamento → avisa o cliente dono da solicitação.
create or replace function private.notify_new_quote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_client uuid;
begin
  select client_id into v_client from public.repair_requests where id = new.request_id;
  if v_client is not null then
    perform private.send_push(
      v_client, 'Novo orçamento recebido',
      'Uma assistência enviou um orçamento para o seu reparo.',
      jsonb_build_object('type', 'quote', 'request_id', new.request_id));
  end if;
  return new;
end $$;
create trigger trg_notify_new_quote after insert on public.quotes
  for each row execute function private.notify_new_quote();

-- Mudança de status da OS → avisa o cliente.
create or replace function private.notify_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_label text;
begin
  if new.status is distinct from old.status then
    v_label := case new.status
      when 'aguardando_coleta' then 'Aguardando coleta/entrega'
      when 'coletado'          then 'Aparelho recebido'
      when 'em_analise'        then 'Em análise'
      when 'aprovado'          then 'Aprovado'
      when 'em_manutencao'     then 'Em manutenção'
      when 'pronto'            then 'Reparo concluído'
      when 'em_devolucao'      then 'Em devolução'
      when 'concluida'         then 'Entregue'
      when 'cancelada'         then 'Cancelada'
      else new.status::text end;
    perform private.send_push(
      new.client_id, 'Atualização do seu reparo', v_label,
      jsonb_build_object('type', 'order', 'order_id', new.id, 'status', new.status));
  end if;
  return new;
end $$;
create trigger trg_notify_order_status after update on public.service_orders
  for each row execute function private.notify_order_status();

-- Nova mensagem → avisa a outra parte da conversa.
create or replace function private.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_client uuid; v_owner uuid; v_recipient uuid;
begin
  if new.request_id is not null then
    select client_id into v_client from public.repair_requests where id = new.request_id;
  end if;
  if new.shop_id is not null then
    select owner_id into v_owner from public.shops where id = new.shop_id;
  end if;
  v_recipient := case when new.sender_id = v_client then v_owner else v_client end;
  if v_recipient is not null and v_recipient <> new.sender_id then
    perform private.send_push(
      v_recipient, 'Nova mensagem', left(new.body, 120),
      jsonb_build_object('type', 'message', 'request_id', new.request_id));
  end if;
  return new;
end $$;
create trigger trg_notify_new_message after insert on public.messages
  for each row execute function private.notify_new_message();
