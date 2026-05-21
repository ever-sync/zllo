-- ============================================================================
-- zllo — Marketplace: catálogo de produtos das assistências (Fase M1)
-- Cada loja cadastra seus produtos (peças, acessórios, aparelhos). O cliente
-- navega pelos produtos ATIVOS de todas as lojas. Pedido/checkout vêm na M3.
-- ============================================================================

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null,
  description text,
  category    text,                       -- ex.: pelicula, capinha, carregador, bateria, tela…
  price       numeric not null check (price >= 0),
  stock       int not null default 0 check (stock >= 0),
  photos      text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_shop_idx   on public.products (shop_id);
create index products_active_idx on public.products (is_active);

-- Grant explícito: o "grant on all tables" do schema inicial não cobre
-- tabelas criadas depois.
grant select, insert, update, delete on public.products to authenticated;

alter table public.products enable row level security;

-- A loja gerencia (CRUD) apenas os próprios produtos.
create policy "products_shop_all" on public.products for all to authenticated
  using (shop_id = private.current_shop_id())
  with check (shop_id = private.current_shop_id());

-- Qualquer usuário logado vê os produtos ativos (catálogo do marketplace).
create policy "products_select_active" on public.products for select to authenticated
  using (is_active = true);

create trigger trg_products_updated before update on public.products
  for each row execute function private.set_updated_at();
