'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, PRODUCT_SELECT, formatPrice, type Product } from '@/lib/products';
import { invalidateProductCatalog } from './actions';

type FormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  photos: string[];
  is_active: boolean;
};

const EMPTY: FormState = {
  name: '',
  description: '',
  category: '',
  price: '',
  stock: '0',
  photos: [],
  is_active: true,
};

export function ProdutosManager({
  shopId,
  userId,
  initial,
}: {
  shopId: string;
  userId: string;
  initial: Product[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setProducts((data as Product[]) ?? []);
  }, [supabase, shopId]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      category: p.category ?? '',
      price: String(p.price).replace('.', ','),
      stock: String(p.stock),
      photos: p.photos ?? [],
      is_active: p.is_active,
    });
    setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^\w.-]/g, '_');
      const path = `${userId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
      const { error: upErr } = await supabase.storage.from('photos').upload(path, file);
      if (!upErr) {
        const { data } = supabase.storage.from('photos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
    setUploading(false);
  };

  const removePhoto = (url: string) =>
    setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== url) }));

  const onSave = async () => {
    setError(null);
    if (form.name.trim().length < 2) {
      setError('Informe o nome do produto.');
      return;
    }
    const price = Number(form.price.replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) {
      setError('Preço inválido.');
      return;
    }
    const stock = parseInt(form.stock, 10);
    setSaving(true);
    const row = {
      shop_id: shopId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category || null,
      price,
      stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
      photos: form.photos,
      is_active: form.is_active,
    };
    const res = editingId
      ? await supabase.from('products').update(row).eq('id', editingId)
      : await supabase.from('products').insert(row);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await invalidateProductCatalog();
    close();
    await refetch();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    await invalidateProductCatalog();
    await refetch();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    await invalidateProductCatalog();
    await refetch();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-g600">
          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
        </span>
        <button
          onClick={openNew}
          className="rounded-xl bg-blue px-4 py-2.5 font-head text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          + Novo produto
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
          <h3 className="font-head text-base font-bold text-ink">
            {editingId ? 'Editar produto' : 'Novo produto'}
          </h3>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm text-g600">Nome</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Película 3D iPhone 13"
              className="rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm text-g600">Descrição</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Detalhes, compatibilidade, garantia…"
              className="resize-none rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">Categoria</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-xl border border-line px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
              >
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">Preço (R$)</span>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                inputMode="decimal"
                placeholder="0,00"
                className="rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-sm text-g600">Estoque</span>
              <input
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                inputMode="numeric"
                placeholder="0"
                className="rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-body text-sm text-g600">Fotos</span>
            <div className="flex flex-wrap items-center gap-3">
              {form.photos.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    onClick={() => removePhoto(url)}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-g400 hover:border-blue">
                {uploading ? '…' : '+'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files)}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 accent-blue"
            />
            <span className="font-body text-sm text-ink">Ativo (visível no marketplace)</span>
          </label>

          {error ? (
            <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 font-body text-sm text-[#B91C1C]">{error}</p>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={onSave}
              disabled={saving || uploading}
              className="rounded-xl bg-blue px-4 py-2.5 font-head text-sm font-bold text-white transition-opacity disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              onClick={close}
              className="rounded-xl border border-line px-4 py-2.5 font-head text-sm font-bold text-ink hover:bg-g100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">
            Nenhum produto ainda. Clique em “Novo produto” para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className={
                'flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 ' +
                (p.is_active ? '' : 'opacity-60')
              }
            >
              <div className="flex items-start gap-3">
                {p.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-g100 text-xl">
                    📦
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-head text-sm font-bold text-ink">{p.name}</p>
                  {p.category ? (
                    <span className="mt-0.5 inline-block rounded bg-g100 px-1.5 py-0.5 font-body text-[10px] text-g600">
                      {p.category}
                    </span>
                  ) : null}
                  <p className="mt-1 font-head text-base font-black text-ink">{formatPrice(p.price)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between font-body text-xs text-g600">
                <span>Estoque: {p.stock}</span>
                <span>{p.is_active ? 'Ativo' : 'Inativo'}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 rounded-lg border border-line px-3 py-1.5 font-body text-xs font-bold text-ink hover:bg-g100"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  className="flex-1 rounded-lg border border-line px-3 py-1.5 font-body text-xs font-bold text-ink hover:bg-g100"
                >
                  {p.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => remove(p)}
                  className="rounded-lg border border-line px-3 py-1.5 font-body text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2]"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
