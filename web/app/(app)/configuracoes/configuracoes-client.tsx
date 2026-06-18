'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SHOP_LOCATION_FALLBACK } from '@/lib/shop-location';
import { emptyShopPickup, shopPickupRpcArgs, type ShopPickup } from '@/lib/shop-pickup';
import { createClient } from '@/lib/supabase/client';

const ALL_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Outros'];

export type ShopConfig = {
  id?: string;
  name: string;
  cnpj: string;
  address: string;
  brands: string[];
  service_radius_km: number;
  is_online: boolean;
  asaas_wallet_id: string;
  lat?: number;
  lng?: number;
  pickup: ShopPickup;
};

export type ProfileConfig = { fullName: string; cpf: string };

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export function ConfiguracoesClient({
  initial,
  profile,
}: {
  initial: ShopConfig | null;
  profile: ProfileConfig;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isNew = !initial?.id;

  const [fullName, setFullName] = useState(profile.fullName);
  const [cpf, setCpf] = useState(profile.cpf);

  const [form, setForm] = useState<ShopConfig>(
    initial ?? {
      name: '',
      cnpj: '',
      address: '',
      brands: ['Apple', 'Samsung'],
      service_radius_km: 10,
      is_online: true,
      asaas_wallet_id: '',
      pickup: emptyShopPickup(),
    },
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() =>
    initial?.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof ShopConfig>(k: K, v: ShopConfig[K]) => setForm((f) => ({ ...f, [k]: v }));

  const setPickup = <K extends keyof ShopPickup>(k: K, v: ShopPickup[K]) =>
    setForm((f) => ({ ...f, pickup: { ...f.pickup, [k]: v } }));

  const toggleBrand = (b: string) =>
    setForm((f) => ({
      ...f,
      brands: f.brands.includes(b) ? f.brands.filter((x) => x !== b) : [...f.brands, b],
    }));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMsg({ ok: false, text: 'Geolocalização não disponível neste navegador.' });
      return;
    }
    setLocating(true);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setCoords(SHOP_LOCATION_FALLBACK);
        setLocating(false);
        setMsg({ ok: false, text: 'Permissão negada — usando localização padrão (SP).' });
      },
      { enableHighAccuracy: false, timeout: 12000 },
    );
  };

  const save = async () => {
    setMsg(null);
    if (form.name.trim().length < 2) {
      setMsg({ ok: false, text: 'Informe o nome da loja.' });
      return;
    }
    if (form.brands.length === 0) {
      setMsg({ ok: false, text: 'Selecione ao menos uma marca.' });
      return;
    }
    if (fullName.trim().length < 3) {
      setMsg({ ok: false, text: 'Informe seu nome completo.' });
      return;
    }
    if (onlyDigits(cpf).length !== 11) {
      setMsg({ ok: false, text: 'Informe um CPF válido (11 dígitos).' });
      return;
    }

    const loc = coords ?? SHOP_LOCATION_FALLBACK;
    setSaving(true);

    // O upsert_my_shop exige CPF e nome no cadastro — grava o perfil primeiro.
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setSaving(false);
      setMsg({ ok: false, text: 'Sessão expirada. Faça login novamente.' });
      return;
    }
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), cpf: onlyDigits(cpf) })
      .eq('id', uid);
    if (profErr) {
      setSaving(false);
      setMsg({
        ok: false,
        text: /duplicate|unique/i.test(profErr.message)
          ? 'Este CPF já está cadastrado em outra conta.'
          : profErr.message,
      });
      return;
    }

    const { error: shopErr } = await supabase.rpc('upsert_my_shop', {
      p_name: form.name.trim(),
      p_address: form.address.trim() || 'Endereço não informado',
      p_brands: form.brands,
      p_radius: Number(form.service_radius_km) || 10,
      p_lat: loc.lat,
      p_lng: loc.lng,
      p_is_online: form.is_online,
      ...shopPickupRpcArgs(form.pickup),
    });

    if (shopErr) {
      setSaving(false);
      setMsg({ ok: false, text: shopErr.message });
      return;
    }

    if (form.asaas_wallet_id.trim()) {
      const { error: walletErr } = await supabase.rpc('set_my_wallet', {
        p_wallet_id: form.asaas_wallet_id.trim(),
      });
      if (walletErr) {
        setSaving(false);
        setMsg({ ok: false, text: walletErr.message });
        return;
      }
    }

    setSaving(false);
    setMsg({ ok: true, text: isNew ? 'Loja configurada! Redirecionando…' : 'Alterações salvas.' });
    router.refresh();
    if (isNew) {
      setTimeout(() => router.push('/operacao'), 800);
    }
  };

  const field =
    'rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue';

  return (
    <div className="flex flex-col gap-5">
      {isNew ? (
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
          <p className="font-head text-sm font-bold text-ink">Configure sua assistência</p>
          <p className="mt-1 font-body text-xs leading-relaxed text-g600">
            Complete o cadastro para receber solicitações de reparo e operar pelo painel web.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div>
          <p className="font-head text-sm font-bold text-ink">Loja {form.is_online ? 'online' : 'offline'}</p>
          <p className="font-body text-xs text-g600">Offline, você não recebe novas solicitações.</p>
        </div>
        <button
          type="button"
          onClick={() => set('is_online', !form.is_online)}
          className={
            'relative h-7 w-12 rounded-full transition-colors ' + (form.is_online ? 'bg-blue' : 'bg-g400')
          }
          aria-label="Alternar online"
        >
          <span
            className={
              'absolute top-1 h-5 w-5 rounded-full bg-white transition-all ' +
              (form.is_online ? 'left-6' : 'left-1')
            }
          />
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <div>
          <p className="font-head text-sm font-bold text-ink">Seus dados</p>
          <p className="font-body text-xs text-g600">
            Necessários para configurar a loja e emitir orçamentos.
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Nome completo</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">CPF</span>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            inputMode="numeric"
            placeholder="000.000.000-00"
            className={field}
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Nome da loja</span>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">CNPJ</span>
          <input
            value={form.cnpj}
            onChange={(e) => set('cnpj', e.target.value)}
            placeholder="Opcional"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm text-g600">Endereço</span>
          <input
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Rua, número — bairro, cidade"
            className={field}
          />
        </label>

        <div className="rounded-xl border border-line bg-g100 p-4">
          <p className="font-head text-sm font-bold text-ink">Coleta Uber Direct</p>
          <p className="mt-1 font-body text-xs text-g600">
            Endereço de onde a Uber busca pedidos do marketplace. Se vazio, usa o endereço da loja.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-body text-sm text-g600">Telefone da loja</span>
              <input value={form.pickup.pickup_phone} onChange={(e) => setPickup('pickup_phone', e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-body text-sm text-g600">Rua</span>
              <input value={form.pickup.pickup_street} onChange={(e) => setPickup('pickup_street', e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">Número</span>
              <input value={form.pickup.pickup_number} onChange={(e) => setPickup('pickup_number', e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">CEP</span>
              <input value={form.pickup.pickup_cep} onChange={(e) => setPickup('pickup_cep', e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">Cidade</span>
              <input value={form.pickup.pickup_city} onChange={(e) => setPickup('pickup_city', e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">UF</span>
              <input
                value={form.pickup.pickup_uf}
                onChange={(e) => setPickup('pickup_uf', e.target.value.toUpperCase().slice(0, 2))}
                className={field}
              />
            </label>
          </div>
        </div>

        <div>
          <p className="font-body text-sm text-g600">Marcas atendidas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_BRANDS.map((b) => {
              const on = form.brands.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBrand(b)}
                  className={
                    'rounded-full border px-3.5 py-1.5 font-head text-xs font-bold transition-colors ' +
                    (on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink')
                  }
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

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

        <div>
          <p className="font-body text-sm text-g600">Localização da loja</p>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:bg-g100 disabled:opacity-60"
          >
            <span className="text-lg">{coords ? '✓' : '📍'}</span>
            <span className="font-body text-sm font-semibold text-ink">
              {locating ? 'Obtendo localização…' : coords ? 'Localização capturada' : 'Usar minha localização'}
            </span>
          </button>
          {coords ? (
            <p className="mt-1.5 font-body text-xs text-g400">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          ) : (
            <p className="mt-1.5 font-body text-xs text-g400">
              Sem captura, usamos SP como referência para o matching.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        <div>
          <p className="font-head text-sm font-bold text-ink">Recebimento (Pix)</p>
          <p className="font-body text-xs text-g600">
            walletId da sua conta Asaas — necessária para receber os pagamentos (97%).
          </p>
        </div>
        <input
          value={form.asaas_wallet_id}
          onChange={(e) => set('asaas_wallet_id', e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className={field}
        />
      </div>

      {msg ? (
        <p
          className={
            'rounded-lg px-3 py-2 font-body text-sm ' +
            (msg.ok ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]')
          }
        >
          {msg.text}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="self-start rounded-xl bg-blue px-5 py-3 font-head font-bold text-white transition-opacity disabled:opacity-60"
      >
        {saving ? 'Salvando…' : isNew ? 'Salvar e começar' : 'Salvar alterações'}
      </button>
    </div>
  );
}
