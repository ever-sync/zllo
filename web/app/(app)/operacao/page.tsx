import { createClient } from '@/lib/supabase/server';

export default async function OperacaoPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  return (
    <div className="px-8 py-7">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-extrabold text-ink">Operação</h1>
        <p className="font-body text-sm text-g600">
          {shop?.name ?? 'Sua loja'} · pedidos e ordens em tempo real
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="font-head text-base font-bold text-ink">Fase 1 em construção</p>
        <p className="mx-auto mt-1 max-w-md font-body text-sm text-g600">
          Aqui vão aparecer, em tempo real, os pedidos chegando (com o contador de
          resposta) e o quadro de ordens de serviço. Por enquanto, esta é a base
          autenticada do console.
        </p>
      </div>
    </div>
  );
}
