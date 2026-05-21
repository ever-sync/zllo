-- ============================================================================
-- zllo — Avaliações (reviews) reais
-- O cliente avalia uma OS concluída; a nota/contagem da loja é recalculada
-- automaticamente. Substitui o ranking/avaliações que eram exemplos no app.
-- ============================================================================

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null unique references public.service_orders(id) on delete cascade,
  shop_id    uuid not null references public.shops(id) on delete cascade,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

create index reviews_shop_idx on public.reviews (shop_id);

grant select, insert on public.reviews to authenticated;

-- ---------- RLS ----------
alter table public.reviews enable row level security;

-- O cliente só avalia a própria OS, e somente se já estiver concluída.
create or replace function private.can_review_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.service_orders o
    where o.id = p_order_id
      and o.client_id = (select auth.uid())
      and o.status = 'concluida'
  );
$$;

-- Reputação é pública para usuários logados (cliente compara lojas; loja vê a sua).
create policy "reviews_select_all" on public.reviews for select to authenticated
  using (true);

create policy "reviews_insert_client" on public.reviews for insert to authenticated
  with check (client_id = (select auth.uid()) and private.can_review_order(order_id));

-- ---------- Recalcula nota média + contagem da loja a cada avaliação ----------
create or replace function private.recompute_shop_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.shops s set
    rating = coalesce(
      (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.shop_id = new.shop_id),
      0
    ),
    reviews_count = (select count(*) from public.reviews r where r.shop_id = new.shop_id)
  where s.id = new.shop_id;
  return new;
end;
$$;

create trigger trg_review_recompute after insert on public.reviews
  for each row execute function private.recompute_shop_rating();

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.reviews;
