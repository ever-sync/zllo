'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Field } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  price: number;
  photos: string[];
  description: string | null;
  city: string | null;
};

export function ListingEditForm({ listing }: { listing: Listing }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [title, setTitle] = useState(listing.title);
  const [brand, setBrand] = useState(listing.brand ?? '');
  const [model, setModel] = useState(listing.model ?? '');
  const [price, setPrice] = useState(String(listing.price).replace('.', ','));
  const [city, setCity] = useState(listing.city ?? '');
  const [description, setDescription] = useState(listing.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price.replace(/\./g, '').replace(',', '.'));
    if (!value || value <= 0 || title.trim().length < 3) {
      setError('Preencha título e preço válidos.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upErr } = await supabase
      .from('listings')
      .update({
        title: title.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        price: value,
        city: city.trim() || null,
        description: description.trim() || null,
      })
      .eq('id', listing.id);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.push(`/cliente/vitrine/${listing.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void onSave(e)} className="flex flex-col gap-3">
      <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Field label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} />
      <Field label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
      <Field label="Preço" value={price} onChange={(e) => setPrice(e.target.value)} required />
      <Field label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-g600">Descrição</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-24 rounded-xl border border-line px-3 py-2 text-sm"
        />
      </label>
      {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
      <button type="submit" disabled={saving} className="rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white disabled:opacity-60">
        {saving ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </form>
  );
}
