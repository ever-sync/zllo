-- ============================================================================
-- zllo — schema inicial
-- Marketplace de assistência técnica de celular (cliente <-> assistência),
-- estilo Uber/iFood: solicitação dispara para lojas num raio de 10 km.
-- ============================================================================

-- ---------- Extensões ----------
create extension if not exists postgis with schema extensions;

-- ---------- Schema privado (helpers/triggers SECURITY DEFINER) ----------
create schema if not exists private;

-- ---------- Enums ----------
create type public.user_role as enum ('cliente', 'assistencia');
create type public.shipping_type as enum ('levar_local', 'frete');
create type public.request_status as enum ('aberta', 'fechada', 'cancelada', 'expirada');
create type public.quote_status as enum ('enviado', 'aceito', 'recusado', 'expirado');
create type public.target_status as enum ('pendente', 'visualizado', 'orcou', 'recusou', 'expirou');
create type public.service_order_status as enum (
  'aguardando_coleta', 'coletado', 'em_analise', 'aprovado',
  'em_manutencao', 'pronto', 'em_devolucao', 'concluida', 'cancelada'
);

-- ============================================================================
-- TABELAS
-- ============================================================================

-- Perfis (1:1 com auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'cliente',
  full_name   text,
  cpf         text unique,
  phone       text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Assistências técnicas (1:1 com um profile 'assistencia')
create table public.shops (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references public.profiles(id) on delete cascade,
  name              text not null,
  cnpj              text,
  address           text,
  location          extensions.geography(Point, 4326),
  service_radius_km numeric not null default 10,
  brands            text[] not null default '{}',
  is_online         boolean not null default true,
  rating            numeric not null default 0,
  reviews_count     int not null default 0,
  coins             int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Aparelhos cadastrados pelo cliente
create table public.devices (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  nickname   text,
  brand      text,
  model      text,
  color      text,
  storage    text,
  imei       text,
  photo_url  text,
  created_at timestamptz not null default now()
);

-- Solicitações de reparo
create table public.repair_requests (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  device_id       uuid references public.devices(id) on delete set null,
  description     text not null,
  photos          text[] not null default '{}',
  shipping_type   public.shipping_type not null,
  location        extensions.geography(Point, 4326),
  address         text,
  status          public.request_status not null default 'aberta',
  chosen_quote_id uuid,
  expires_at      timestamptz not null default (now() + interval '15 minutes'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Orçamentos enviados pelas lojas
create table public.quotes (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.repair_requests(id) on delete cascade,
  shop_id     uuid not null references public.shops(id) on delete cascade,
  value       numeric not null,
  description text,
  status      public.quote_status not null default 'enviado',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (request_id, shop_id)
);

-- FK circular: a solicitação aponta para o orçamento escolhido
alter table public.repair_requests
  add constraint repair_requests_chosen_quote_fk
  foreign key (chosen_quote_id) references public.quotes(id) on delete set null;

-- Alvos do broadcast (lojas notificadas + cronômetro de aceite, estilo Uber)
create table public.request_targets (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.repair_requests(id) on delete cascade,
  shop_id     uuid not null references public.shops(id) on delete cascade,
  distance_m  numeric,
  status      public.target_status not null default 'pendente',
  notified_at timestamptz not null default now(),
  responds_by timestamptz not null default (now() + interval '15 minutes'),
  unique (request_id, shop_id)
);

-- Ordens de serviço (após o cliente escolher um orçamento)
create table public.service_orders (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.repair_requests(id) on delete cascade,
  quote_id   uuid not null references public.quotes(id) on delete restrict,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  shop_id    uuid not null references public.shops(id) on delete cascade,
  device_id  uuid references public.devices(id) on delete set null,
  value      numeric not null,
  status     public.service_order_status not null default 'aguardando_coleta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Linha do tempo da OS
create table public.service_order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.service_orders(id) on delete cascade,
  status     public.service_order_status not null,
  note       text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Mensagens (chat cliente <-> loja)
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid references public.repair_requests(id) on delete cascade,
  order_id   uuid references public.service_orders(id) on delete cascade,
  shop_id    uuid references public.shops(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- Anúncios de celulares à venda (vitrine)
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid references public.profiles(id) on delete set null,
  title       text not null,
  brand       text,
  model       text,
  price       numeric not null,
  photos      text[] not null default '{}',
  description text,
  city        text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
create index shops_location_gix           on public.shops using gist (location);
create index repair_requests_location_gix on public.repair_requests using gist (location);
create index devices_owner_idx            on public.devices (owner_id);
create index repair_requests_client_idx   on public.repair_requests (client_id);
create index repair_requests_status_idx   on public.repair_requests (status);
create index quotes_request_idx           on public.quotes (request_id);
create index quotes_shop_idx              on public.quotes (shop_id);
create index request_targets_request_idx  on public.request_targets (request_id);
create index request_targets_shop_idx     on public.request_targets (shop_id);
create index service_orders_client_idx    on public.service_orders (client_id);
create index service_orders_shop_idx      on public.service_orders (shop_id);
create index service_order_events_order_idx on public.service_order_events (order_id);
create index messages_request_idx         on public.messages (request_id);
create index messages_order_idx           on public.messages (order_id);

-- ============================================================================
-- FUNÇÕES (SECURITY DEFINER em schema privado p/ evitar recursão de RLS)
-- ============================================================================

create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- shop do usuário atual (assistência), ou null
create or replace function private.current_shop_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.shops where owner_id = (select auth.uid());
$$;

-- usuário atual é dono da solicitação?
create or replace function private.is_request_owner(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.repair_requests r
    where r.id = p_request_id and r.client_id = (select auth.uid())
  );
$$;

-- a loja do usuário atual foi alvo desta solicitação?
create or replace function private.shop_targeted_on_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.request_targets t
    where t.request_id = p_request_id and t.shop_id = private.current_shop_id()
  );
$$;

-- usuário atual é parte (cliente ou loja) da OS?
create or replace function private.is_order_party(p_order_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.service_orders o
    where o.id = p_order_id
      and (o.client_id = (select auth.uid()) or o.shop_id = private.current_shop_id())
  );
$$;

-- a loja do usuário atual enxerga este cliente (tem target em solicitação dele)?
create or replace function private.shop_sees_client(p_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.repair_requests r
    join public.request_targets t on t.request_id = r.id
    where r.client_id = p_client_id and t.shop_id = private.current_shop_id()
  );
$$;

-- a loja do usuário atual enxerga este aparelho (via target)?
create or replace function private.shop_sees_device(p_device_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.repair_requests r
    join public.request_targets t on t.request_id = r.id
    where r.device_id = p_device_id and t.shop_id = private.current_shop_id()
  );
$$;

-- Matching: ao criar solicitação, notifica lojas online dentro de 10 km
create or replace function private.broadcast_repair_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.location is null then
    return new;
  end if;
  insert into public.request_targets (request_id, shop_id, distance_m, responds_by)
  select new.id,
         s.id,
         extensions.st_distance(s.location, new.location),
         new.expires_at
  from public.shops s
  where s.is_online = true
    and s.location is not null
    and extensions.st_dwithin(s.location, new.location, 10000); -- 10 km (metros)
  return new;
end;
$$;

-- Cria o profile automaticamente quando um usuário se cadastra
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, cpf, phone, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'cliente'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    new.email
  );
  return new;
end;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
create trigger trg_profiles_updated  before update on public.profiles        for each row execute function private.set_updated_at();
create trigger trg_shops_updated     before update on public.shops           for each row execute function private.set_updated_at();
create trigger trg_requests_updated  before update on public.repair_requests for each row execute function private.set_updated_at();
create trigger trg_quotes_updated    before update on public.quotes          for each row execute function private.set_updated_at();
create trigger trg_orders_updated    before update on public.service_orders  for each row execute function private.set_updated_at();

create trigger trg_broadcast_request after insert on public.repair_requests
  for each row execute function private.broadcast_repair_request();

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================================
-- GRANTS
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles             enable row level security;
alter table public.shops                enable row level security;
alter table public.devices              enable row level security;
alter table public.repair_requests      enable row level security;
alter table public.quotes               enable row level security;
alter table public.request_targets      enable row level security;
alter table public.service_orders       enable row level security;
alter table public.service_order_events enable row level security;
alter table public.messages             enable row level security;
alter table public.listings             enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_select_counterpart" on public.profiles for select to authenticated
  using (private.shop_sees_client(id));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- shops (diretório público para usuários logados)
create policy "shops_select_all" on public.shops for select to authenticated
  using (true);
create policy "shops_insert_own" on public.shops for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "shops_update_own" on public.shops for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- devices
create policy "devices_all_own" on public.devices for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "devices_select_counterpart" on public.devices for select to authenticated
  using (private.shop_sees_device(id));

-- repair_requests
create policy "requests_select_own" on public.repair_requests for select to authenticated
  using (client_id = (select auth.uid()));
create policy "requests_select_targeted" on public.repair_requests for select to authenticated
  using (private.shop_targeted_on_request(id));
create policy "requests_insert_own" on public.repair_requests for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "requests_update_own" on public.repair_requests for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
create policy "requests_delete_own" on public.repair_requests for delete to authenticated
  using (client_id = (select auth.uid()));

-- quotes
create policy "quotes_shop_insert" on public.quotes for insert to authenticated
  with check (shop_id = private.current_shop_id());
create policy "quotes_shop_select" on public.quotes for select to authenticated
  using (shop_id = private.current_shop_id());
create policy "quotes_shop_update" on public.quotes for update to authenticated
  using (shop_id = private.current_shop_id()) with check (shop_id = private.current_shop_id());
create policy "quotes_client_select" on public.quotes for select to authenticated
  using (private.is_request_owner(request_id));
create policy "quotes_client_update" on public.quotes for update to authenticated
  using (private.is_request_owner(request_id)) with check (private.is_request_owner(request_id));

-- request_targets (inserção apenas via trigger de matching)
create policy "targets_shop_select" on public.request_targets for select to authenticated
  using (shop_id = private.current_shop_id());
create policy "targets_shop_update" on public.request_targets for update to authenticated
  using (shop_id = private.current_shop_id()) with check (shop_id = private.current_shop_id());
create policy "targets_client_select" on public.request_targets for select to authenticated
  using (private.is_request_owner(request_id));

-- service_orders
create policy "orders_party_select" on public.service_orders for select to authenticated
  using (client_id = (select auth.uid()) or shop_id = private.current_shop_id());
create policy "orders_client_insert" on public.service_orders for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "orders_party_update" on public.service_orders for update to authenticated
  using (client_id = (select auth.uid()) or shop_id = private.current_shop_id())
  with check (client_id = (select auth.uid()) or shop_id = private.current_shop_id());

-- service_order_events
create policy "events_party_select" on public.service_order_events for select to authenticated
  using (private.is_order_party(order_id));
create policy "events_party_insert" on public.service_order_events for insert to authenticated
  with check (private.is_order_party(order_id));

-- messages
create policy "messages_select_participant" on public.messages for select to authenticated
  using (
    sender_id = (select auth.uid())
    or (request_id is not null and private.is_request_owner(request_id))
    or (shop_id is not null and shop_id = private.current_shop_id())
    or (order_id is not null and private.is_order_party(order_id))
  );
create policy "messages_insert_sender" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()));

-- listings (vitrine pública p/ logados; dono gerencia o seu)
create policy "listings_select_all" on public.listings for select to authenticated
  using (true);
create policy "listings_insert_own" on public.listings for insert to authenticated
  with check (seller_id = (select auth.uid()));
create policy "listings_update_own" on public.listings for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "listings_delete_own" on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()));

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table public.repair_requests;
alter publication supabase_realtime add table public.request_targets;
alter publication supabase_realtime add table public.quotes;
alter publication supabase_realtime add table public.service_orders;
alter publication supabase_realtime add table public.service_order_events;
alter publication supabase_realtime add table public.messages;
