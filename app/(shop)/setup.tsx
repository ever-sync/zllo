import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

const ALL_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Outros'];
const FALLBACK = { lat: -23.5614, lng: -46.6559 };

export default function ShopSetup() {
  const router = useRouter();
  const { shop, refresh } = useShop();
  const [name, setName] = useState(shop?.name ?? '');
  const [address, setAddress] = useState(shop?.address ?? '');
  const [brands, setBrands] = useState<string[]>(['Apple', 'Samsung']);
  const [radiusKm, setRadiusKm] = useState('10');
  const [walletId, setWalletId] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // walletId é privado (não vem no contexto da loja); lê via RPC do próprio dono.
  useEffect(() => {
    supabase.rpc('get_my_shop').then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.asaas_wallet_id) setWalletId(row.asaas_wallet_id);
    });
  }, []);

  const toggleBrand = (b: string) =>
    setBrands((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } else {
        setCoords(FALLBACK);
      }
    } catch {
      setCoords(FALLBACK);
    } finally {
      setLocating(false);
    }
  };

  const onSave = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe o nome da loja.');
      return;
    }
    const loc = coords ?? FALLBACK;
    setLoading(true);
    try {
      const { error: rpcErr } = await supabase.rpc('upsert_my_shop', {
        p_name: name.trim(),
        p_address: address.trim() || null,
        p_brands: brands,
        p_radius: Number(radiusKm) || 10,
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_is_online: true,
      });
      if (rpcErr) throw rpcErr;
      await supabase.rpc('set_my_wallet', { p_wallet_id: walletId });
      await refresh();
      router.replace('/(shop)/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title={shop ? 'Editar loja' : 'Configurar loja'} subtitle="Para receber solicitações por perto" />

      <View style={{ gap: 13 }}>
        <TextField label="Nome da loja" placeholder="Ex: Reparo Smart" value={name} onChangeText={setName} />
        <TextField label="Endereço" placeholder="Rua, número — bairro, cidade" value={address} onChangeText={setAddress} />

        <View>
          <Text style={styles.label}>Marcas atendidas</Text>
          <View style={styles.chips}>
            {ALL_BRANDS.map((b) => {
              const on = brands.includes(b);
              return (
                <Pressable
                  key={b}
                  onPress={() => toggleBrand(b)}
                  style={[styles.chip, { backgroundColor: on ? colors.ink : colors.white, borderColor: on ? colors.ink : colors.gray200 }]}
                >
                  <Text style={[styles.chipText, { color: on ? colors.white : colors.ink }]}>{b}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField label="Raio de atendimento (km)" placeholder="10" keyboardType="number-pad" value={radiusKm} onChangeText={setRadiusKm} />

        <TextField
          label="Conta de recebimento (walletId Asaas)"
          placeholder="Cole aqui o walletId da sua conta Asaas"
          autoCapitalize="none"
          value={walletId}
          onChangeText={setWalletId}
          hint="Necessário para receber os pagamentos por Pix (97% do valor; 3% é a comissão zllo)."
        />

        <View>
          <Text style={styles.label}>Localização da loja</Text>
          <Pressable style={styles.locBtn} onPress={useMyLocation} disabled={locating}>
            <Ionicons name={coords ? 'checkmark-circle' : 'location-outline'} size={20} color={coords ? colors.green : colors.blue} />
            <Text style={styles.locText}>
              {locating ? 'Obtendo localização…' : coords ? 'Localização capturada' : 'Usar minha localização'}
            </Text>
          </Pressable>
          {coords ? (
            <Text style={styles.locHint}>
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.locHint}>Sem isso, usamos uma localização padrão (SP) para o matching.</Text>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Salvar loja" onPress={onSave} loading={loading} style={{ marginTop: 4 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.gray600, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.headBold, fontSize: 12.5 },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14 },
  locText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  locHint: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 6 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red },
});
