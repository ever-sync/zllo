import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { MessageBanner, Skeleton } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { pickImage } from '@/lib/pick-image';
import { uploadPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export default function AnuncioEditar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('listings')
      .select('title, brand, model, price, city, description, photos')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      setTitle(data.title);
      setBrand(data.brand ?? '');
      setModel(data.model ?? '');
      setPrice(String(data.price).replace('.', ','));
      setCity(data.city ?? '');
      setDescription(data.description ?? '');
      setPhotos(data.photos ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAddPhoto = async () => {
    if (photos.length + newPhotos.length >= 6) return;
    const img = await pickImage();
    if (img) setNewPhotos((p) => [...p, img]);
  };

  const onSave = async () => {
    if (!id || title.trim().length < 3) {
      setError('Informe um título válido.');
      return;
    }
    const value = Number(price.replace(/\./g, '').replace(',', '.'));
    if (!value || value <= 0) {
      setError('Informe um preço válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const urls = [...photos];
      for (const p of newPhotos) {
        if (!session) throw new Error('Sessão expirada');
        urls.push(await uploadPhoto({ base64: p.base64, userId: session.user.id, folder: 'listings' }));
      }
      const { error: upErr } = await supabase
        .from('listings')
        .update({
          title: title.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          price: value,
          city: city.trim() || null,
          description: description.trim() || null,
          photos: urls,
        })
        .eq('id', id);
      if (upErr) throw upErr;
      notify('Salvo!', 'Anúncio atualizado.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Editar anúncio" />
        <Skeleton height={200} />
      </Screen>
    );
  }

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Editar anúncio" />
      <View style={{ gap: 14 }}>
        <TextField label="Título" value={title} onChangeText={setTitle} />
        <TextField label="Marca" value={brand} onChangeText={setBrand} />
        <TextField label="Modelo" value={model} onChangeText={setModel} />
        <TextField label="Preço" prefix="R$" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <TextField label="Cidade" value={city} onChangeText={setCity} />
        <TextField label="Descrição" value={description} onChangeText={setDescription} multiline style={{ minHeight: 96 }} />
      </View>
      <Text style={styles.label}>Fotos</Text>
      <View style={styles.photoRow}>
        {photos.map((url, i) => (
          <View key={url} style={styles.thumbWrap}>
            <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
            <Pressable style={styles.thumbX} onPress={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}>
              <Ionicons name="close" size={12} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {newPhotos.map((p, i) => (
          <View key={p.uri} style={styles.thumbWrap}>
            <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
            <Pressable style={styles.thumbX} onPress={() => setNewPhotos((arr) => arr.filter((_, idx) => idx !== i))}>
              <Ionicons name="close" size={12} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {photos.length + newPhotos.length < 6 ? (
          <Pressable style={styles.addPhoto} onPress={() => void onAddPhoto()}>
            <Ionicons name="camera-outline" size={22} color={colors.gray400} />
          </Pressable>
        ) : null}
      </View>
      {error ? <MessageBanner variant="error">{error}</MessageBanner> : null}
      <Button label="Salvar alterações" onPress={() => void onSave()} loading={saving} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginTop: 16, marginBottom: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
});
