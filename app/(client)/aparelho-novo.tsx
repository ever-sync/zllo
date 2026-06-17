import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { imeiDigits, isValidImei } from '@/lib/imei';
import { pickImage } from '@/lib/pick-image';
import { uploadPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export default function NovoAparelho() {
  const router = useRouter();
  const { session } = useAuth();
  const [nickname, setNickname] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const [imei, setImei] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onPickPhoto = async () => {
    const img = await pickImage();
    if (img) setPhoto(img);
  };

  const onSave = async () => {
    setError(null);
    if (!brand.trim() && !model.trim() && !nickname.trim()) {
      setError('Informe ao menos a marca e o modelo.');
      return;
    }
    if (!isValidImei(imei)) {
      setError('Informe um IMEI válido (15 dígitos). Disque *#06# para ver o seu.');
      return;
    }
    if (!session) return;
    setLoading(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        photoUrl = await uploadPhoto({ base64: photo.base64, userId: session.user.id, folder: 'devices' });
      }
      const { error: insErr } = await supabase.from('devices').insert({
        owner_id: session.user.id,
        nickname: nickname.trim() || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        storage: storage.trim() || null,
        color: color.trim() || null,
        imei: imeiDigits(imei),
        photo_url: photoUrl,
      });
      if (insErr) throw insErr;
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Cadastrar aparelho" subtitle="Detalhes do seu celular" />

      <Pressable style={styles.photoPicker} onPress={onPickPhoto}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="camera-outline" size={26} color={colors.gray400} />
            <Text style={styles.photoText}>Adicionar foto</Text>
          </View>
        )}
      </Pressable>

      <View style={{ gap: 13 }}>
        <TextField label="Apelido (opcional)" placeholder="Ex: meu iPhone do trabalho" value={nickname} onChangeText={setNickname} />
        <TextField label="Marca" placeholder="Ex: Apple, Samsung, Xiaomi" value={brand} onChangeText={setBrand} />
        <TextField label="Modelo" placeholder="Ex: iPhone 13 Pro" value={model} onChangeText={setModel} />
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <TextField label="Armazenamento" placeholder="128 GB" value={storage} onChangeText={setStorage} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Cor" placeholder="Grafite" value={color} onChangeText={setColor} />
          </View>
        </View>
        <TextField
          label="IMEI"
          placeholder="15 dígitos"
          value={imei}
          onChangeText={(t) => setImei(imeiDigits(t).slice(0, 15))}
          keyboardType="number-pad"
          maxLength={15}
          hint="Disque *#06# no celular para ver o IMEI. Verificamos contra roubo."
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Salvar aparelho" onPress={onSave} loading={loading} style={{ marginTop: 4 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoPicker: { alignSelf: 'center', marginBottom: 18 },
  photo: { width: 120, height: 120, borderRadius: radius['2xl'] },
  photoEmpty: {
    width: 120,
    height: 120,
    borderRadius: radius['2xl'],
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.gray600 },
  rowFields: { flexDirection: 'row', gap: 10 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red },
});
