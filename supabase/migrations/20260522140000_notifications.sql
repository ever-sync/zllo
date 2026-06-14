-- ============================================================================
-- zllo — Centro de notificações in-app (+ histórico das mesmas push events)
-- ============================================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null,
  type       text not null default 'generic',
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

grant select, update on public.notifications to authenticated;

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Registra notificação in-app (fail-safe, nunca quebra o fluxo principal).
create or replace function private.create_in_app_notification(
  p_user uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, title, body, type, data)
  values (p_user, p_title, p_body, coalesce(p_data->>'type', 'generic'), p_data);
exception when others then
  return;
end $$;

-- Envia push Expo e grava histórico in-app.
create or replace function private.send_push(p_user uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_body jsonb;
begin
  perform private.create_in_app_notification(p_user, p_title, p_body, p_data);

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
  return;
end $$;

create or replace function public.get_my_unread_notification_count()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*)::bigint
  from public.notifications n
  where n.user_id = (select auth.uid()) and n.read_at is null;
$$;

grant execute on function public.get_my_unread_notification_count() to authenticated;

create or replace function public.mark_all_notifications_read()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
end $$;

grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications
  set read_at = now()
  where id = p_id and user_id = (select auth.uid()) and read_at is null;
end $$;

grant execute on function public.mark_notification_read(uuid) to authenticated;
