#!/usr/bin/env bash
# Reposiciona as 3 lojas do seed perto de um ponto e re-dispara as solicitações
# abertas pra elas — útil pra testar o fluxo a partir da SUA localização, já que
# o seed coloca as lojas na Av. Paulista (SP) e `supabase db reset` reverte.
#
# Uso:  bash scripts/shops-near-me.sh <lat> <lng>
#   ex: bash scripts/shops-near-me.sh -23.2091 -45.9084
#
# Dica: a localização do seu pedido aparece no app; ou veja no banco com
#   select st_y(location::geometry), st_x(location::geometry) from repair_requests ...
set -e

LAT="${1:?Uso: bash scripts/shops-near-me.sh <lat> <lng>}"
LNG="${2:?Uso: bash scripts/shops-near-me.sh <lat> <lng>}"

CID=$(docker ps --filter "name=supabase_db_zllo.v2" --format "{{.Names}}" | head -1)
[ -z "$CID" ] && { echo "✋ Container do Postgres não encontrado. Rode 'supabase start'."; exit 1; }

docker exec -i "$CID" psql -U postgres <<SQL
-- 3 lojas do seed perto do ponto (pequenos offsets ~1km pra variar a distância)
update public.shops set location = extensions.st_setsrid(extensions.st_makepoint($LNG, $LAT), 4326)::extensions.geography where name = 'Reparo Smart';
update public.shops set location = extensions.st_setsrid(extensions.st_makepoint($LNG - 0.0066, $LAT - 0.0059), 4326)::extensions.geography where name = 'Tech Reparos';
update public.shops set location = extensions.st_setsrid(extensions.st_makepoint($LNG + 0.0084, $LAT + 0.0061), 4326)::extensions.geography where name = 'iFix SP';

-- re-dispara as solicitações abertas pras lojas no raio (janela nova de 15 min)
update public.repair_requests set expires_at = now() + interval '15 minutes' where status = 'aberta';
insert into public.request_targets (request_id, shop_id, distance_m, responds_by)
select r.id, s.id, extensions.st_distance(s.location, r.location), r.expires_at
from public.repair_requests r
join public.shops s on s.is_online = true and s.location is not null
  and extensions.st_dwithin(s.location, r.location, s.service_radius_km * 1000)
where r.status = 'aberta'
on conflict (request_id, shop_id) do nothing;

-- conferência
select name,
       round((extensions.st_distance(location, extensions.st_setsrid(extensions.st_makepoint($LNG, $LAT), 4326)::extensions.geography) / 1000)::numeric, 2) as dist_km
from public.shops order by name;
SQL

echo ""
echo "✅ Lojas perto de ($LAT, $LNG) e solicitações abertas re-disparadas."
echo "   Recarregue o Painel/Operação da loja para ver."
