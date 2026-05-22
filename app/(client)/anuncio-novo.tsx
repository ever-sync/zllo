import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { pickImage } from '@/lib/pick-image';
import { uploadPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export default function AnuncioNovo() {
  const router = useRouter();
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onAddPhoto = async () => {
    if (photos.length >= 6) return;
    const img = await pickImage();
    if (img) setPhotos((p) => [...p, img]);
  };

  const onSubmit = async () => {
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
    if (!session) return;

    setLoading(true);
    try {
      const urls: string[] = [];
      for (const p of photos) {
        urls.push(await uploadPhoto({ base64: p.base64, userId: session.user.id, folder: 'listings' }));
      }
      const { error: insErr } = await supabase.from('listings').insert({
        seller_id: session.user.id,
        title: title.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        price: value,
        photos: urls,
        description: description.trim() || null,
        city: city.trim() || null,
      });
      if (insErr) throw insErr;

      Alert.alert('Anúncio publicado!', 'Seu celular já está na vitrine.');
      router.replace('/(client)/vitrine');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível publicar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Anunciar celular" subtitle="Coloque seu aparelho à venda" />

      <View style={{ gap: 14 }}>
        <TextField label="Título" placeholder="Ex: iPhone 13 Pro impecável" value={title} onChangeText={setTitle} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="Marca" placeholder="Apple" value={brand} onChangeText={setBrand} autoCapitalize="words" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Modelo" placeholder="iPhone 13 Pro" value={model} onChangeText={setModel} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="Preço" placeholder="2500" prefix="R$" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Cidade" placeholder="São Paulo, SP" value={city} onChangeText={setCity} autoCapitalize="words" />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>Descrição</Text>
      <TextField
        placeholder="Estado de conservação, acessórios, motivo da venda…"
        value={description}
        onChangeText={setDescription}
        multiline
        style={styles.textarea}
      />

      <Text style={[styles.label, { marginTop: 18 }]}>Fotos ({photos.length})</Text>
      <View style={styles.photoRow}>
        {photos.map((p, i) => (
          <View key={i} style={styles.thumbWrap}>
            <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
            <Pressable style={styles.thumbX} onPress={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}>
              <Ionicons name="close" size={12} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {photos.length < 6 ? (
          <Pressable style={styles.addPhoto} onPress={onAddPhoto}>
            <Ionicons name="camera-outline" size={22} color={colors.gray400} />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Publicar anúncio" onPress={onSubmit} loading={loading} style={{ marginTop: 22 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 8 },
  textarea: { minHeight: 96, textAlignVertical: 'top', paddingTop: 4 },
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
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: 14 },
});
