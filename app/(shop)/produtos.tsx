import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, MessageBanner, SkeletonCard } from '@/components/ui/states';
import { notify } from '@/lib/confirm';
import { CATEGORIES, priceBRL } from '@/lib/products';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  category: string | null;
};

const SELECT = 'id, name, price, stock, is_active, category';

export default function Produtos() {
  const router = useRouter();
  const { shop } = useShop();
  const [rows, setRows] = useState<Product[] | null>(null);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [category, setCategory] = useState('');
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

  const onCreate = async () => {
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
    setSaving(true);
    const { error: insErr } = await supabase.from('products').insert({
      shop_id: shop.id,
      name: name.trim(),
      price: value,
      stock: Math.max(0, parseInt(stock, 10) || 0),
      category: category.trim() || null,
      photos: [],
      is_active: true,
    });
    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setModal(false);
    setName('');
    setPrice('');
    setStock('1');
    setCategory('');
    void load();
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

      <Button label="Novo produto" onPress={() => setModal(true)} style={{ marginBottom: 12 }} />

      {rows.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Nenhum produto"
          description="Cadastre películas, capinhas e acessórios para vender pelo app."
          actionLabel="Cadastrar produto"
          onAction={() => setModal(true)}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map((p) => (
            <Card key={p.id}>
              <View style={styles.row}>
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
            </Card>
          ))}
        </View>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Novo produto</Text>
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
            {error ? <MessageBanner variant="error">{error}</MessageBanner> : null}
            <View style={styles.actions}>
              <Button label="Cancelar" variant="secondary" onPress={() => setModal(false)} style={{ flex: 1 }} />
              <Button label="Salvar" onPress={() => void onCreate()} loading={saving} style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2 },
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
