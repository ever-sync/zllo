import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, MessageBanner, SkeletonCard } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/confirm';
import { pickImage } from '@/lib/pick-image';
import { CATEGORIES, priceBRL } from '@/lib/products';
import { useShop } from '@/lib/shop';
import { uploadPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  category: string | null;
  description: string | null;
  photos: string[];
};

const SELECT = 'id, name, price, stock, is_active, category, description, photos';

export default function Produtos() {
  const router = useRouter();
  const { session } = useAuth();
  const { shop } = useShop();
  const [rows, setRows] = useState<Product[] | null>(null);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!shop) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('products')
      .select(SELECT)
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    setRows((data as Product[]) ?? []);
  }, [shop]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleActive = async (product: Product, value: boolean) => {
    if (!shop) return;
    const { error: upErr } = await supabase.from('products').update({ is_active: value }).eq('id', product.id);
    if (upErr) {
      notify('Ops', upErr.message);
      return;
    }
    setRows((prev) => (prev ?? []).map((p) => (p.id === product.id ? { ...p, is_active: value } : p)));
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setStock('1');
    setCategory('');
    setDescription('');
    setPhotos([]);
    setNewPhotos([]);
    setError(null);
  };

  const openNew = () => {
    resetForm();
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(String(p.price).replace('.', ','));
    setStock(String(p.stock));
    setCategory(p.category ?? '');
    setDescription(p.description ?? '');
    setPhotos(p.photos ?? []);
    setNewPhotos([]);
    setError(null);
    setModal(true);
  };

  const onAddPhoto = async () => {
    if (photos.length + newPhotos.length >= 4) return;
    const img = await pickImage();
    if (img) setNewPhotos((p) => [...p, img]);
  };

  const onDelete = async (product: Product) => {
    const ok = await confirmAsync('Excluir produto?', product.name, 'Excluir', true);
    if (!ok) return;
    const { error: delErr } = await supabase.from('products').delete().eq('id', product.id);
    if (delErr) {
      notify('Ops', delErr.message);
      return;
    }
    void load();
  };

  const onSave = async () => {
    setError(null);
    if (!shop || name.trim().length < 2) {
      setError('Informe o nome do produto.');
      return;
    }
    const value = Number(price.replace(/\./g, '').replace(',', '.'));
    if (!value || value <= 0) {
      setError('Informe um preço válido.');
      return;
    }
    if (!session) {
      setError('Sessão expirada.');
      return;
    }
    setSaving(true);
    try {
      const urls = [...photos];
      for (const p of newPhotos) {
        urls.push(await uploadPhoto({ base64: p.base64, userId: session.user.id, folder: 'products' }));
      }
      const payload = {
        name: name.trim(),
        price: value,
        stock: Math.max(0, parseInt(stock, 10) || 0),
        category: category.trim() || null,
        description: description.trim() || null,
        photos: urls,
      };
      const { error: saveErr } = editingId
        ? await supabase.from('products').update(payload).eq('id', editingId)
        : await supabase.from('products').insert({ ...payload, shop_id: shop.id, is_active: true });
      if (saveErr) throw saveErr;
      setModal(false);
      resetForm();
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!shop) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Produtos" subtitle="Marketplace da loja" />
        <EmptyState
          icon="storefront-outline"
          title="Configure sua loja"
          description="Complete o cadastro antes de publicar produtos."
          actionLabel="Configurar loja"
          onAction={() => router.push('/(shop)/setup')}
        />
      </Screen>
    );
  }

  if (rows === null) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Produtos" subtitle="Marketplace da loja" />
        <View style={{ gap: 10, marginTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Produtos" subtitle={`${rows.filter((p) => p.is_active).length} ativos`} />

      <Button label="Novo produto" onPress={openNew} style={{ marginBottom: 12 }} />

      {rows.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Nenhum produto"
          description="Cadastre películas, capinhas e acessórios para vender pelo app."
          actionLabel="Cadastrar produto"
          onAction={openNew}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map((p) => (
            <Card key={p.id}>
              <Pressable onPress={() => openEdit(p)}>
                <View style={styles.row}>
                  {p.photos?.[0] ? (
                    <Image source={{ uri: p.photos[0] }} style={styles.thumbList} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumbList, styles.thumbPlaceholder]}>
                      <Ionicons name="cube-outline" size={18} color={colors.gray400} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.meta}>
                      {priceBRL(Number(p.price))} · estoque {p.stock}
                      {p.category ? ` · ${p.category}` : ''}
                    </Text>
                  </View>
                  <Switch
                    value={p.is_active}
                    onValueChange={(v) => void toggleActive(p, v)}
                    trackColor={{ true: colors.lime, false: colors.gray200 }}
                    thumbColor={colors.white}
                  />
                </View>
              </Pressable>
              <Pressable onPress={() => void onDelete(p)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Excluir</Text>
              </Pressable>
            </Card>
          ))}
        </View>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingId ? 'Editar produto' : 'Novo produto'}</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Ex: Película 3D iPhone 15" style={styles.input} />
            <Text style={styles.label}>Preço (R$)</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="29,90" style={styles.input} />
            <Text style={styles.label}>Estoque</Text>
            <TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" style={styles.input} />
            <Text style={styles.label}>Categoria (opcional)</Text>
            <View style={styles.chips}>
              {CATEGORIES.slice(0, 5).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, category === c && styles.chipActive]}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="Detalhes do produto" style={styles.input} />
            <Text style={styles.label}>Fotos ({photos.length + newPhotos.length}/4)</Text>
            <View style={styles.photoRow}>
              {photos.map((url) => (
                <View key={url} style={styles.thumbWrap}>
                  <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
                  <Pressable style={styles.thumbX} onPress={() => setPhotos((arr) => arr.filter((u) => u !== url))}>
                    <Ionicons name="close" size={12} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {newPhotos.map((p) => (
                <View key={p.uri} style={styles.thumbWrap}>
                  <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
                  <Pressable style={styles.thumbX} onPress={() => setNewPhotos((arr) => arr.filter((x) => x.uri !== p.uri))}>
                    <Ionicons name="close" size={12} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {photos.length + newPhotos.length < 4 ? (
                <Pressable style={styles.addPhoto} onPress={() => void onAddPhoto()}>
                  <Ionicons name="camera-outline" size={22} color={colors.gray400} />
                </Pressable>
              ) : null}
            </View>
            {error ? <MessageBanner variant="error">{error}</MessageBanner> : null}
            <View style={styles.actions}>
              <Button label="Cancelar" variant="secondary" onPress={() => setModal(false)} style={{ flex: 1 }} />
              <Button label="Salvar" onPress={() => void onSave()} loading={saving} style={{ flex: 2 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbList: { width: 48, height: 48, borderRadius: radius.md },
  thumbPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-start' },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.redText },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  sheetTitle: { fontFamily: fonts.headBlack, fontSize: 20, color: colors.ink, marginBottom: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray200 },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.gray600 },
  chipTextActive: { color: colors.white },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
