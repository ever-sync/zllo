import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useAuth, type Profile } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { geocodeCEP } from '@/lib/geocode';
import { pickImage } from '@/lib/pick-image';
import { uploadPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';
import type { Device } from './(tabs)/aparelhos';

type Shipping = 'levar_local' | 'frete';
type LocSource = 'cadastrado' | 'atual';
const FALLBACK = { lat: -23.5614, lng: -46.6559 }; // Av. Paulista, SP (combina com o seed)

/** Endereço cadastrado em uma linha legível, ou null se incompleto. */
function formatAddress(p: Profile | null): string | null {
  if (!p?.street || !p?.city) return null;
  const linha1 = [p.street, p.number].filter(Boolean).join(', ');
  const local = p.uf ? `${p.city}/${p.uf}` : p.city;
  return [linha1, p.complement, p.neighborhood, local].filter(Boolean).join(' · ');
}

async function getCoords(): Promise<{ lat: number; lng: number; approx: boolean }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, approx: false };
    }
  } catch {
    // ignora — usa fallback
  }
  return { ...FALLBACK, approx: true };
}

export default function Solicitar() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [shipping, setShipping] = useState<Shipping>('levar_local');
  const [locSource, setLocSource] = useState<LocSource>('cadastrado');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const savedAddress = formatAddress(profile);
  const hasAddress = !!(savedAddress && profile?.cep);
  const source: LocSource = hasAddress ? locSource : 'atual';

  const loadDevices = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('devices')
      .select('id, nickname, brand, model, color, storage, photo_url')
      .order('created_at', { ascending: false });
    const list = (data as Device[]) ?? [];
    setDevices(list);
    setDeviceId((cur) => cur ?? list[0]?.id ?? null);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices]),
  );

  const onAddPhoto = async () => {
    if (photos.length >= 6) return;
    const img = await pickImage();
    if (img) setPhotos((p) => [...p, img]);
  };

  const onSubmit = async () => {
    setError(null);
    if (!deviceId) {
      setError('Selecione um aparelho.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Descreva o problema com mais detalhes.');
      return;
    }
    if (!session) return;

    setLoading(true);
    try {
      let lat: number;
      let lng: number;
      let address: string | null = null;

      if (source === 'cadastrado') {
        // Geocodifica o endereço cadastrado (por CEP) e reaproveita no perfil.
        const geo = await geocodeCEP(profile!.cep!);
        if (!geo) {
          setError('Não consegui localizar seu endereço cadastrado. Use "Localização atual".');
          setLoading(false);
          return;
        }
        lat = geo.lat;
        lng = geo.lng;
        address = savedAddress;
        await supabase.rpc('set_my_location', { p_lat: lat, p_lng: lng });
      } else {
        const gps = await getCoords();
        lat = gps.lat;
        lng = gps.lng;
      }

      const urls: string[] = [];
      for (const p of photos) {
        urls.push(await uploadPhoto({ base64: p.base64, userId: session.user.id, folder: 'requests' }));
      }
      const { error: rpcErr } = await supabase.rpc('create_repair_request', {
        p_device_id: deviceId,
        p_description: description.trim(),
        p_photos: urls,
        p_shipping_type: shipping,
        p_lat: lat,
        p_lng: lng,
        p_address: address,
      });
      if (rpcErr) throw rpcErr;

      notify('Solicitação enviada!', 'As assistências próximas já foram notificadas.');
      router.replace('/(client)/(tabs)/pedidos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Pedir assistência" subtitle="Conte o que houve com o aparelho" />

      {/* Aparelho */}
      <Text style={styles.label}>Aparelho</Text>
      {devices === null ? null : devices.length === 0 ? (
        <Pressable style={styles.addDevice} onPress={() => router.push('/(client)/aparelho-novo')}>
          <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
          <Text style={styles.addDeviceText}>Cadastrar um aparelho primeiro</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 8 }}>
          {devices.map((d) => {
            const selected = d.id === deviceId;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDeviceId(d.id)}
                style={[styles.deviceRow, { borderColor: selected ? colors.blue : colors.gray200, backgroundColor: selected ? '#EEEEFF' : colors.white }]}
              >
                <Ionicons name="phone-portrait-outline" size={20} color={selected ? colors.blue : colors.gray400} />
                <Text style={styles.deviceName}>
                  {d.nickname || `${d.brand ?? ''} ${d.model ?? ''}`.trim() || 'Aparelho'}
                </Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.blue} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Descrição */}
      <Text style={[styles.label, { marginTop: 20 }]}>Qual o problema?</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: tela trincada, touch não responde no canto..."
        placeholderTextColor={colors.gray400}
        multiline
        style={styles.textarea}
      />

      {/* Fotos */}
      <Text style={[styles.label, { marginTop: 20 }]}>Fotos ({photos.length})</Text>
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

      {/* Envio */}
      <Text style={[styles.label, { marginTop: 20 }]}>Como entregar o aparelho?</Text>
      <View style={styles.shipRow}>
        <ShipOption icon="walk-outline" label="Levo no local" active={shipping === 'levar_local'} onPress={() => setShipping('levar_local')} />
        <ShipOption icon="bicycle-outline" label="Pago frete" active={shipping === 'frete'} onPress={() => setShipping('frete')} />
      </View>

      {/* Localização (para encontrar assistências perto) */}
      {hasAddress ? (
        <>
          <Text style={[styles.label, { marginTop: 20 }]}>De onde buscar assistências?</Text>
          <View style={styles.shipRow}>
            <ShipOption icon="home-outline" label="Meu endereço" active={source === 'cadastrado'} onPress={() => setLocSource('cadastrado')} />
            <ShipOption icon="locate-outline" label="Localização atual" active={source === 'atual'} onPress={() => setLocSource('atual')} />
          </View>
          <Text style={styles.locHint}>
            {source === 'cadastrado' ? savedAddress : 'Vamos usar o GPS do aparelho.'}
          </Text>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Enviar solicitação"
        onPress={onSubmit}
        loading={loading}
        disabled={!deviceId}
        style={{ marginTop: 22 }}
      />
      <Text style={styles.note}>Sua solicitação vai para as assistências próximas de você.</Text>
    </Screen>
  );
}

function ShipOption({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shipOption, { borderColor: active ? colors.blue : colors.gray200, backgroundColor: active ? '#EEEEFF' : colors.white }]}
    >
      <Ionicons name={icon} size={22} color={active ? colors.blue : colors.gray600} />
      <Text style={[styles.shipText, { color: active ? colors.blue : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 8 },
  addDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 14,
  },
  addDeviceText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.blue },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  deviceName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  textarea: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 96,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
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
  shipRow: { flexDirection: 'row', gap: 10 },
  shipOption: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 18,
  },
  shipText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  locHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 8 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: 14 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, textAlign: 'center', marginTop: 10 },
});
