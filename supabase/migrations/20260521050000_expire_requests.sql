-- ============================================================================
-- zllo — Expiração automática de solicitações (pg_cron)
-- O cronômetro estilo Uber deixava de valer só no frontend. Aqui o banco
-- garante o estado: a cada minuto, fecha o que passou do prazo.
-- ============================================================================

create extension if not exists pg_cron;

-- Marca como expirado o que passou do prazo:
--  - solicitação SEM nenhum orçamento e fora do prazo → 'expirada'
--    (se já recebeu orçamentos, segue aberta para o cliente escolher);
--  - alvo (loja) cuja janela de resposta acabou → 'expirou'.
create or replace function private.expire_stale_requests()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.repair_requests r
    set status = 'expirada'
    where r.status = 'aberta'
      and r.expires_at < now()
      and not exists (select 1 from public.quotes q where q.request_id = r.id);

  update public.request_targets t
    set status = 'expirou'
    where t.status in ('pendente', 'visualizado')
      and t.responds_by < now();
end;
$$;

-- (re)agenda o job para rodar a cada minuto, de forma idempotente.
do $$
begin
  perform 1 from cron.job where jobname = 'zllo-expire-requests';
  if found then
    perform cron.unschedule('zllo-expire-requests');
  end if;
  perform cron.schedule(
    'zllo-expire-requests',
    '* * * * *',
    $job$ select private.expire_stale_requests(); $job$
  );
end $$;
