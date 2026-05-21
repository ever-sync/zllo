'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ShopConfig = {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  brands: string[];
  service_radius_km: number;
  is_online: boolean;
  asaas_wallet_id: string;
};

export function ConfiguracoesClient({ initial }: { initial: ShopConfig }) {
  const supabase = useState(() => createClient())[0];
  const [form, setForm] = useState(initial);
  const [brandsText, setBrandsText] = useState(initial.brands.join(', '));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof ShopConfig>(k: K, v: ShopConfig[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setMsg(null);
    if (form.name.trim().length < 2) {
      setMsg({ ok: false, text: 'Informe o nome da loja.' });
      return;
    }
    setSaving(true);
    const brands = brandsText.split(',').map((b) => b.trim()).filter(Boolean);
    const { error } = await supabase
      .from('shops')
      .update({
        name: form.name.trim(),
        cnpj: form.cnpj.trim() || null,
        address: form.address.trim() || null,
        brands,
        service_radius_km: Number(form.service_radius_km) || 10,
        is_online: form.is_online,
        asaas_wallet_id: form.asaas_wallet_id.trim() || null,
      })
      .eq('id', form.id);
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Alterações salvas.' });
  };

  const field = 'rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div>
          <p className="font-head text-sm font-bold text-ink">Loja {form.is_online ? 'online' : 'offline'}</p>
          <p className="font-body text-xs text-g600">Offline, você não recebe novas solicitações.</p>
        </div>
        <button
          onClick={() => set('is_online', !form.is_online)}
          className={
            'relative h-7 w-12 rounded-full transition-colors ' + (form.is_online ? 'bg-blue' : 'bg-g400')
          }
          aria-label="Alternar online"
        >
          <span className={'absolute top-1 h-5 w-5 rounded-full bg-white transition-all ' + (form.is_online ? 'left-6' : 'left-1')} />
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Nome da loja</span>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">CNPJ</span>
          <input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="Opcional" className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Endereço</span>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, número — bairro, cidade" className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Marcas atendidas</span>
          <input value={brandsText} onChange={(e) => setBrandsText(e.target.value)} placeholder="Apple, Samsung, Xiaomi…" className={field} />
          <span className="font-body text-xs text-g400">Separe por vírgula.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Raio de atendimento (km)</span>
          <input
            type="number"
            min={1}
            value={form.service_radius_km}
            onChange={(e) => set('service_radius_km', Number(e.target.value))}
            className={field}
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <div>
          <p className="font-head text-sm font-bold text-ink">Recebimento (Pix)</p>
          <p className="font-body text-xs text-g600">walletId da sua conta Asaas — necessária para receber os pagamentos (97%).</p>
        </div>
        <input
          value={form.asaas_wallet_id}
          onChange={(e) => set('asaas_wallet_id', e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className={field}
        />
      </div>

      {msg ? (
        <p className={'rounded-lg px-3 py-2 font-body text-sm ' + (msg.ok ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]')}>
          {msg.text}
        </p>
      ) : null}

      <button
        onClick={save}
        disabled={saving}
        className="self-start rounded-xl bg-blue px-5 py-3 font-head font-bold text-white transition-opacity disabled:opacity-60"
      >
        {saving ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </div>
  );
}
