'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatProfileAddress, resolveRequestLocation } from '@/lib/geocode';

type Device = { id: string; name: string };
type Profile = {
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
};

type Shipping = 'levar_local' | 'frete';
type LocSource = 'cadastrado' | 'atual';

export function RequestForm({
  devices,
  userId,
  profile,
}: {
  devices: Device[];
  userId: string;
  profile: Profile | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const savedAddress = formatProfileAddress(profile ?? {});
  const hasAddress = !!(savedAddress && profile?.cep);

  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [shipping, setShipping] = useState<Shipping>('levar_local');
  const [locSource, setLocSource] = useState<LocSource>(hasAddress ? 'cadastrado' : 'atual');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length || photos.length >= 6) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const safe = file.name.replace(/[^\w.-]/g, '_');
      const path = `${userId}/requests/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
      const { error: upErr } = await supabase.storage.from('photos').upload(path, file);
      if (!upErr) {
        const { data } = supabase.storage.from('photos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setPhotos((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!deviceId) {
      setError('Selecione um aparelho.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Descreva o problema com mais detalhes.');
      return;
    }

    setLoading(true);
    const source = hasAddress ? locSource : 'atual';
    const loc = await resolveRequestLocation({ source, profile });
    if (loc.error) {
      setError(loc.error);
      setLoading(false);
      return;
    }

    if (source === 'cadastrado') {
      await supabase.rpc('set_my_location', { p_lat: loc.lat, p_lng: loc.lng });
    }

    const { error: rpcErr } = await supabase.rpc('create_repair_request', {
      p_device_id: deviceId,
      p_description: description.trim(),
      p_photos: photos,
      p_shipping_type: shipping,
      p_lat: loc.lat,
      p_lng: loc.lng,
      p_address: loc.address ?? undefined,
    });
    setLoading(false);

    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    router.push('/cliente/pedidos');
    router.refresh();
  };

  if (devices.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center">
        <h2 className="font-head text-lg font-extrabold text-ink">Cadastre um aparelho primeiro</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-g600">
          A solicitação precisa estar ligada ao aparelho que será reparado.
        </p>
        <Link href="/cliente/aparelhos" className="mt-5 inline-flex rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white">
          Cadastrar aparelho
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-g600">Aparelho</span>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          required
          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue"
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-g600">Qual o problema?</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          rows={5}
          placeholder="Ex: tela trincada, touch não responde no canto..."
          className="resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue"
        />
      </label>

      <div>
        <span className="text-sm text-g600">Fotos ({photos.length}/6)</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-[72px] w-[72px] rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-white"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < 6 ? (
            <label className="flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-g100 text-xl text-g400">
              {uploading ? '…' : '+'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading || loading}
                onChange={(e) => void onUpload(e.target.files)}
              />
            </label>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-xl border border-line p-3 has-[:checked]:border-blue has-[:checked]:bg-[#F0F4FF]">
          <input
            type="radio"
            name="shipping_type"
            value="levar_local"
            checked={shipping === 'levar_local'}
            onChange={() => setShipping('levar_local')}
            className="mr-2 accent-blue"
          />
          <span className="font-semibold text-ink">Levo na assistência</span>
          <p className="mt-1 text-xs text-g600">Você combina o melhor horário com a loja.</p>
        </label>
        <label className="rounded-xl border border-line p-3 has-[:checked]:border-blue has-[:checked]:bg-[#F0F4FF]">
          <input
            type="radio"
            name="shipping_type"
            value="frete"
            checked={shipping === 'frete'}
            onChange={() => setShipping('frete')}
            className="mr-2 accent-blue"
          />
          <span className="font-semibold text-ink">Preciso de coleta</span>
          <p className="mt-1 text-xs text-g600">As assistências próximas recebem seu endereço.</p>
        </label>
      </div>

      {hasAddress ? (
        <div>
          <span className="text-sm text-g600">De onde buscar assistências?</span>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className="rounded-xl border border-line p-3 has-[:checked]:border-blue has-[:checked]:bg-[#F0F4FF]">
              <input
                type="radio"
                checked={locSource === 'cadastrado'}
                onChange={() => setLocSource('cadastrado')}
                className="mr-2 accent-blue"
              />
              <span className="font-semibold text-ink">Meu endereço</span>
            </label>
            <label className="rounded-xl border border-line p-3 has-[:checked]:border-blue has-[:checked]:bg-[#F0F4FF]">
              <input
                type="radio"
                checked={locSource === 'atual'}
                onChange={() => setLocSource('atual')}
                className="mr-2 accent-blue"
              />
              <span className="font-semibold text-ink">Localização atual</span>
            </label>
          </div>
          <p className="mt-2 text-xs text-g600">
            {locSource === 'cadastrado' ? savedAddress : 'Usaremos o GPS do navegador (ou região padrão se negado).'}
          </p>
        </div>
      ) : (
        <p className="text-xs text-g600">Usaremos a localização do navegador para encontrar assistências próximas.</p>
      )}

      {error ? <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#B91C1C]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || uploading}
        className="w-fit rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? 'Enviando…' : 'Enviar para assistências'}
      </button>
    </form>
  );
}
