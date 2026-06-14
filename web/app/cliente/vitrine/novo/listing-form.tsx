'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ListingForm({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length || photos.length >= 6) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const safe = file.name.replace(/[^\w.-]/g, '_');
      const path = `${userId}/listings/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
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
    if (title.trim().length < 3) {
      setError('Dê um título ao anúncio.');
      return;
    }
    const value = Number(price.replace(/\./g, '').replace(',', '.'));
    if (!value || value <= 0) {
      setError('Informe um preço válido.');
      return;
    }

    setLoading(true);
    const { error: insErr } = await supabase.from('listings').insert({
      seller_id: userId,
      title: title.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      price: value,
      photos,
      description: description.trim() || null,
      city: city.trim() || null,
    });
    setLoading(false);

    if (insErr) {
      setError(insErr.message);
      return;
    }
    router.push('/cliente/vitrine');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">Anunciar celular</h1>
          <p className="mt-1 text-sm text-g600">Coloque seu aparelho à venda na vitrine.</p>
        </div>
        <Link href="/cliente/vitrine" className="text-sm font-semibold text-blue">
          Cancelar
        </Link>
      </div>

      <Field label="Título" value={title} onChange={setTitle} placeholder="Ex: iPhone 13 Pro impecável" required />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Marca" value={brand} onChange={setBrand} placeholder="Apple" />
        <Field label="Modelo" value={model} onChange={setModel} placeholder="iPhone 13 Pro" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Preço" value={price} onChange={setPrice} placeholder="2500" />
        <Field label="Cidade" value={city} onChange={setCity} placeholder="São Paulo, SP" />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-g600">Descrição</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Estado de conservação, acessórios, motivo da venda…"
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
                disabled={uploading}
                onChange={(e) => void onUpload(e.target.files)}
              />
            </label>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-[#B91C1C]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || uploading}
        className="rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? 'Publicando…' : 'Publicar anúncio'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-g600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-blue"
      />
    </label>
  );
}
