-- ============================================================================
-- zllo — SEED de teste (rode no SQL Editor do Supabase)
-- Cria 3 assistências perto da Av. Paulista (SP), já confirmadas e ONLINE.
-- Logins: loja1@zllo.dev / loja2@zllo.dev / loja3@zllo.dev  — senha: senha123
-- Use, no app cliente, uma solicitação perto de (-23.5614, -46.6559) para
-- ver o disparo no raio de 10 km.
-- ============================================================================
do $$
declare
  ids    uuid[] := array[
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid
  ];
  emails text[] := array['loja1@zllo.dev','loja2@zllo.dev','loja3@zllo.dev'];
  names  text[] := array['Reparo Smart','Tech Reparos','iFix SP'];
  lats   double precision[] := array[-23.5614, -23.5550, -23.5700];
  lngs   double precision[] := array[-46.6559, -46.6620, -46.6480];
  i int;
begin
  for i in 1..3 loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      ids[i], '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      emails[i], extensions.crypt('senha123', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', names[i], 'role', 'assistencia'),
      '', '', '', ''
    ) on conflict (id) do nothing;

    -- garante role/nome (o trigger handle_new_user já cria o profile)
    update public.profiles set role = 'assistencia', full_name = names[i] where id = ids[i];

    insert into public.shops (owner_id, name, address, location, is_online, brands, rating, reviews_count)
    values (
      ids[i], names[i], 'São Paulo, SP',
      extensions.st_setsrid(extensions.st_makepoint(lngs[i], lats[i]), 4326)::extensions.geography,
      true, array['Apple','Samsung','Xiaomi','Motorola'], 4.8, 120
    ) on conflict (owner_id) do nothing;
  end loop;
end $$;

-- ---------- Cliente de teste já confirmado + 1 aparelho ----------
-- Login: cliente@zllo.dev — senha: senha123
do $$
declare
  cid uuid := '44444444-4444-4444-4444-444444444444'::uuid;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    cid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'cliente@zllo.dev', extensions.crypt('senha123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Cliente Teste', 'role', 'cliente', 'cpf', '52998224725', 'phone', '11999990000'),
    '', '', '', ''
  ) on conflict (id) do nothing;

  update public.profiles set role = 'cliente', full_name = 'Cliente Teste' where id = cid;

  insert into public.devices (owner_id, nickname, brand, model, storage, color)
  values (cid, 'Meu iPhone', 'Apple', 'iPhone 13 Pro', '128 GB', 'Grafite')
  on conflict do nothing;
end $$;

-- ---------- Admin de teste (painel admin) ----------
-- Login: admin@zllo.dev — senha: senha123
do $$
declare aid uuid := '55555555-5555-5555-5555-555555555555'::uuid;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    aid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@zllo.dev', extensions.crypt('senha123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Admin zllo'),
    '', '', '', ''
  ) on conflict (id) do nothing;

  update public.profiles set full_name = 'Admin zllo' where id = aid;
  insert into public.admins (user_id) values (aid) on conflict do nothing;
end $$;

-- ---------- Produtos de exemplo no marketplace (lojas do seed) ----------
insert into public.products (shop_id, name, description, category, price, stock, is_active)
select s.id, p.name, p.description, p.category, p.price, p.stock, true
from (values
  ('Reparo Smart', 'Película 3D iPhone 13', 'Vidro temperado com borda preta. Cobertura total.', 'Película', 29.90, 50),
  ('Reparo Smart', 'Carregador Turbo 20W USB-C', 'Carregamento rápido, compatível com iPhone e Android.', 'Carregador', 89.00, 15),
  ('Tech Reparos', 'Capinha Anti-impacto', 'Proteção militar, transparente, não amarela.', 'Capinha', 49.90, 30),
  ('iFix SP', 'Bateria iPhone 11 (kit)', 'Bateria + ferramentas + adesivo. Instalação à parte.', 'Bateria', 119.90, 8)
) as p(shop, name, description, category, price, stock)
join public.shops s on s.name = p.shop
on conflict do nothing;
