import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

const WEB_PAINEL = 'https://zllo-admin-production.up.railway.app';

export default function Configuracoes() {
  const router = useRouter();
  const { shop, setOnline, refresh } = useShop();
  const [walletId, setWalletId] = useState('');

  useEffect(() => {
    supabase.rpc('get_my_shop').then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.asaas_wallet_id) setWalletId(row.asaas_wallet_id);
    });
  }, [shop?.id]);

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Configurações" subtitle="Loja, recebimento e painel web" />

      {!shop ? (
        <Button label="Configurar minha loja" onPress={() => router.push('/(shop)/setup')} />
      ) : (
        <>
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.onlineRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.section}>Disponível para solicitações</Text>
                <Text style={styles.hint}>{shop.is_online ? 'Você está online' : 'Você está offline'}</Text>
              </View>
              <Switch
                value={shop.is_online}
                onValueChange={setOnline}
                trackColor={{ true: colors.lime, false: colors.gray200 }}
                thumbColor={colors.white}
              />
            </View>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.section}>Loja</Text>
            <MenuRow icon="storefront-outline" label="Editar dados da loja" onPress={() => router.push('/(shop)/setup')} />
            <MenuRow
              icon="wallet-outline"
              label="Conta Asaas (Pix)"
              value={walletId ? 'Configurada' : 'Pendente'}
              onPress={() => router.push('/(shop)/setup')}
              last
            />
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.section}>Painel web</Text>
            <MenuRow
              icon="globe-outline"
              label="Abrir painel no navegador"
              onPress={() => Linking.openURL(WEB_PAINEL)}
              last
            />
            <Text style={styles.webHint}>Orçamentos, OS, produtos e financeiro também no computador.</Text>
          </Card>
        </>
      )}

      {shop ? (
        <Button label="Atualizar dados" variant="secondary" onPress={() => refresh()} style={{ marginTop: 4 }} />
      ) : null}
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={19} color={colors.blue} />
      <Text style={styles.item}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.head, fontSize: 15, color: colors.ink, marginBottom: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  item: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  value: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.gray600 },
  webHint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray400, marginTop: 4, lineHeight: 16 },
});
