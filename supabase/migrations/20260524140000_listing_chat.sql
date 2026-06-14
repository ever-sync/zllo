-- ============================================================================
-- zllo — Chat P2P da vitrine (comprador ↔ vendedor por anúncio)
-- ============================================================================

create table public.listing_messages (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id   uuid not null references public.profiles(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index listing_messages_thread_idx on public.listing_messages (listing_id, buyer_id, created_at);

grant select, insert on public.listing_messages to authenticated;

alter table public.listing_messages enable row level security;

create policy "listing_messages_select_party" on public.listing_messages
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );

create policy "listing_messages_insert_party" on public.listing_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.listing_interests li
      where li.listing_id = listing_id and li.buyer_id = buyer_id
    )
    and (
      buyer_id = (select auth.uid())
      or exists (
        select 1 from public.listings l
        where l.id = listing_id and l.seller_id = (select auth.uid())
      )
    )
  );

alter publication supabase_realtime add table public.listing_messages;

-- Lista threads para o vendedor (nome do comprador + última msg).
create or replace function public.list_listing_interest_threads(p_listing_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.seller_id = (select auth.uid())
  ) then
    raise exception 'Sem permissão';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'buyer_id', li.buyer_id,
      'buyer_name', p.full_name,
      'interested_at', li.created_at,
      'last_body', (
        select m.body from public.listing_messages m
        where m.listing_id = li.listing_id and m.buyer_id = li.buyer_id
        order by m.created_at desc limit 1
      ),
      'last_at', (
        select m.created_at from public.listing_messages m
        where m.listing_id = li.listing_id and m.buyer_id = li.buyer_id
        order by m.created_at desc limit 1
      )
    ) order by coalesce((
      select m.created_at from public.listing_messages m
      where m.listing_id = li.listing_id and m.buyer_id = li.buyer_id
      order by m.created_at desc limit 1
    ), li.created_at) desc)
    from public.listing_interests li
    join public.profiles p on p.id = li.buyer_id
    where li.listing_id = p_listing_id
  ), '[]'::jsonb);
end $$;

grant execute on function public.list_listing_interest_threads(uuid) to authenticated;

-- Envia mensagem (validação centralizada).
create or replace function public.send_listing_message(
  p_listing_id uuid,
  p_body text,
  p_buyer_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_seller uuid;
  v_buyer uuid;
  v_id uuid;
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Mensagem vazia'; end if;

  select seller_id into v_seller from public.listings where id = p_listing_id;
  if v_seller is null then raise exception 'Anúncio não encontrado'; end if;

  if v_uid = v_seller then
    v_buyer := p_buyer_id;
    if v_buyer is null then raise exception 'Informe o comprador'; end if;
  else
    v_buyer := v_uid;
  end if;

  if not exists (
    select 1 from public.listing_interests
    where listing_id = p_listing_id and buyer_id = v_buyer
  ) then
    raise exception 'Interesse não registrado';
  end if;

  if v_uid <> v_seller and v_uid <> v_buyer then
    raise exception 'Sem permissão';
  end if;

  insert into public.listing_messages (listing_id, buyer_id, sender_id, body)
  values (p_listing_id, v_buyer, v_uid, trim(p_body))
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.send_listing_message(uuid, text, uuid) to authenticated;

-- Push ao receber mensagem no anúncio.
create or replace function private.notify_listing_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
  v_recipient uuid;
  v_title text;
begin
  select seller_id, title into v_seller, v_title from public.listings where id = new.listing_id;
  v_recipient := case when new.sender_id = v_seller then new.buyer_id else v_seller end;

  if v_recipient is not null and v_recipient <> new.sender_id then
    perform private.send_push(
      v_recipient, 'Mensagem no anúncio',
      left(new.body, 120),
      jsonb_build_object(
        'type', 'listing_message',
        'listing_id', new.listing_id,
        'buyer_id', new.buyer_id
      ));
  end if;
  return new;
end $$;

create trigger trg_notify_listing_message after insert on public.listing_messages
  for each row execute function private.notify_listing_message();

-- Interesse: inclui buyer_id no push e grava 1ª mensagem opcional.
create or replace function public.express_listing_interest(p_listing_id uuid, p_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
  v_title text;
  v_buyer_name text;
  v_uid uuid := (select auth.uid());
begin
  select seller_id, title into v_seller, v_title
    from public.listings where id = p_listing_id;
  if v_seller is null then raise exception 'Anúncio não encontrado'; end if;
  if v_seller = v_uid then raise exception 'Você não pode demonstrar interesse no próprio anúncio'; end if;

  insert into public.listing_interests (listing_id, buyer_id, message)
  values (p_listing_id, v_uid, nullif(trim(p_message), ''))
  on conflict (listing_id, buyer_id) do update
    set message = excluded.message, created_at = now();

  if nullif(trim(p_message), '') is not null then
    insert into public.listing_messages (listing_id, buyer_id, sender_id, body)
    values (p_listing_id, v_uid, v_uid, trim(p_message));
  end if;

  select full_name into v_buyer_name from public.profiles where id = v_uid;

  perform private.send_push(
    v_seller, 'Interesse no seu anúncio',
    coalesce(v_buyer_name, 'Alguém') || ' quer saber mais sobre "' || left(v_title, 40) || '".',
    jsonb_build_object('type', 'listing_interest', 'listing_id', p_listing_id, 'buyer_id', v_uid)
  );
end $$;
