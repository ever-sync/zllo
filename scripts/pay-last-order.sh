#!/usr/bin/env bash
# Simula a confirmação de pagamento (webhook Asaas) do pedido de produto mais
# recente em "aguardando_pagamento" — para testar o marketplace SEM Asaas.
# O trigger baixa o estoque e o pedido passa a aparecer em Pedidos/Vendas da loja.
# Uso: bash scripts/pay-last-order.sh
set -e
CID=$(docker ps --filter "name=supabase_db_zllo.v2" --format "{{.Names}}" | head -1)
[ -z "$CID" ] && { echo "✋ Postgres não encontrado. Rode 'supabase start'."; exit 1; }

docker exec -i "$CID" psql -U postgres <<'SQL'
update public.product_orders
   set status = 'pago', paid_at = now()
 where id = (
   select id from public.product_orders
   where status = 'aguardando_pagamento'
   order by created_at desc limit 1
 )
returning id, total, status, paid_at;
SQL

echo ""
echo "✅ Pagamento simulado. O pedido aparece PAGO em Pedidos (web) / Vendas (app) da loja,"
echo "   com o estoque já baixado. A loja pode então separar → pronto → concluir."
