import { createClient } from '@/lib/supabase/server';
import { getDeviceName } from '@/lib/format';
import { ClientShell } from '../client-shell';
import { DeviceForm } from './device-form';

type Device = {
  id: string;
  nickname: string | null;
  brand: string | null;
  model: string | null;
  storage: string | null;
  color: string | null;
};

export default async function ClienteAparelhosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('devices').select('id, nickname, brand, model, storage, color').order('created_at', { ascending: false });
  const devices = (data as Device[] | null) ?? [];

  return (
    <ClientShell>
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-head text-2xl font-extrabold text-ink">Aparelhos</h1>
        <p className="mt-1 text-sm text-g600">Cadastre os aparelhos para agilizar pedidos de assistência.</p>
      </div>

      <DeviceForm />

      <section className="mt-6 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
        <h2 className="font-head text-lg font-extrabold text-ink">Cadastrados</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {devices.length === 0 ? (
            <p className="text-sm text-g600">Nenhum aparelho cadastrado ainda.</p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="rounded-xl border border-line p-4">
                <strong className="font-head text-base text-ink">{getDeviceName(device)}</strong>
                <p className="mt-1 text-sm text-g600">
                  {[device.storage, device.color].filter(Boolean).join(' · ') || 'Sem detalhes adicionais'}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
    </ClientShell>
  );
}
