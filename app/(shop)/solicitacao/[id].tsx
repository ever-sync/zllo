import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { getDeviceName } from '@/lib/format';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { distanceLabel, timeLeft, useNow } from '@/lib/time';
import { colors, fonts, radius } from '@/theme';

type RequestDetail = {
  id: string;
  description: string;
  photos: string[];
  shipping_type: 'levar_local' | 'frete';
  status: string;
  device: { brand: string | null; model: string | null; nickname: string | null; color: string | null; storage: string | null } | null;
  client: { full_name: string | null } | null;
};

type TargetInfo = { distance_m: number | null; responds_by: string; status: string };

export default function SolicitacaoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { shop } = useShop();
  const now = useNow(1000);

  const [request, setRequest] = useState<RequestDetail | null | undefined>(undefined);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [modal, setModal] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id || !shop) return;
    const { data: req } = await supabase
      .from('repair_requests')
      .select('id, description, photos, shipping_type, status, device:devices(brand, model, nickname, color, storage), client:profiles(full_name)')
      .eq('id', id)
      .maybeSingle();
    setRequest((req as unknown as RequestDetail) ?? null);

    const { data: tgt } = await supabase
      .from('request_targets')
      .select('distance_m, responds_by, status')
      .eq('request_id', id)
      .eq('shop_id', shop.id)
      .maybeSingle();
    setTarget((tgt as TargetInfo) ?? null);
  }, [id, shop]);

  useEffect(() => {
    load();
  }, [load]);

  const sendQuote = async () => {
    setError(null);
    const v = Number(value.replace(',', '.'));
    if (!v || v <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    if (!shop || !id) return;
    setSending(true);
    const { error: insErr } = await supabase
      .from('quotes')
      .insert({ request_id: id, shop_id: shop.id, value: v, description: note.trim() || null });
    if (insErr) {
      setSending(false);
      setError(/duplicate|unique/i.test(insErr.message) ? 'Você já enviou um orçamento para esta solicitação.' : insErr.message);
      return;
    }
    await supabase.from('request_targets').update({ status: 'orcou' }).eq('request_id', id).eq('shop_id', shop.id);
    setSending(false);
    setModal(false);
    Alert.alert('Orçamento enviado!', 'O cliente vai receber sua proposta.');
    router.back();
  };

  if (request === undefined) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 60 }} />
      </Screen>
    );
  }
  if (request === null) {
    return (
      <Screen>
        <AppHeader title="Solicitação" />
        <Text style={styles.muted}>Solicitação não encontrada ou indisponível.</Text>
      </Screen>
    );
  }

  const dev = request.device;
  const deviceName = getDeviceName(dev);
  const t = target ? timeLeft(target.responds_by, now) : null;
  const alreadyQuoted = target?.status === 'orcou';
  const expired = t?.expired || request.status !== 'aberta';

  return (
    <Screen>
      <AppHeader title="Solicitação" subtitle={request.client?.full_name ?? 'Cliente'} />

      <View style={styles.deviceHead}>
        <View style={styles.deviceIcon}>
          <Ionicons name="phone-portrait-outline" size={26} color={colors.gray600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <Text style={styles.deviceSub}>{[dev?.storage, dev?.color].filter(Boolean).join(' · ') || '—'}</Text>
        </View>
        {t && !alreadyQuoted ? (
          <View style={[styles.timer, { backgroundColor: t.urgent ? colors.redBg : colors.amberBg }]}>
            <Ionicons name="time-outline" size={13} color={t.urgent ? colors.redText : colors.amberText} />
            <Text style={[styles.timerText, { color: t.urgent ? colors.redText : colors.amberText }]}>{t.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Meta icon="location-outline" text={distanceLabel(target?.distance_m)} />
        <Meta icon={request.shipping_type === 'frete' ? 'bicycle-outline' : 'walk-outline'} text={request.shipping_type === 'frete' ? 'Paga frete' : 'Leva no local'} />
      </View>

      <Text style={styles.sectionLabel}>Problema relatado</Text>
      <View style={styles.descBox}>
        <Text style={styles.descText}>{request.description}</Text>
      </View>

      {request.photos?.length ? (
        <>
          <Text style={styles.sectionLabel}>Fotos ({request.photos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {request.photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} contentFit="cover" />
            ))}
          </ScrollView>
        </>
      ) : null}

      {alreadyQuoted ? (
        <View style={styles.quotedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.greenText} />
          <Text style={styles.quotedText}>Você já enviou um orçamento.</Text>
        </View>
      ) : expired ? (
        <View style={styles.quotedBanner}>
          <Ionicons name="time-outline" size={18} color={colors.gray600} />
          <Text style={[styles.quotedText, { color: colors.gray600 }]}>Esta solicitação não está mais disponível.</Text>
        </View>
      ) : (
        <Button label="Enviar orçamento" onPress={() => setModal(true)} style={{ marginTop: 22 }} />
      )}

      {/* POPUP de orçamento */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Enviar orçamento</Text>
            <Text style={styles.sheetSub}>{deviceName}</Text>

            <Text style={styles.label}>Valor (R$)</Text>
            <View style={styles.valueField}>
              <Text style={styles.valuePrefix}>R$</Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="0,00"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
                style={styles.valueInput}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Descrição</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Ex: troca de tela original, garantia de 90 dias, pronto em 2 dias..."
              placeholderTextColor={colors.gray400}
              multiline
              style={styles.noteInput}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.sheetActions}>
              <Button label="Cancelar" variant="secondary" onPress={() => setModal(false)} style={{ flex: 1 }} />
              <Button label="Enviar" onPress={sendQuote} loading={sending} style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.gray600} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  deviceHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  deviceIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontFamily: fonts.head, fontSize: 19, color: colors.ink, letterSpacing: -0.3 },
  deviceSub: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 1 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.md },
  timerText: { fontFamily: fonts.headBold, fontSize: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.gray600 },
  sectionLabel: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  descBox: { backgroundColor: colors.gray100, borderRadius: radius.lg, padding: 14 },
  descText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 21 },
  photo: { width: 100, height: 100, borderRadius: radius.lg },
  quotedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.greenBg, padding: 14, borderRadius: radius.lg, marginTop: 22 },
  quotedText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.greenText },
  // popup
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34, gap: 4 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.headBlack, fontSize: 20, color: colors.ink },
  sheetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginBottom: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 8 },
  valueField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, paddingHorizontal: 14 },
  valuePrefix: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.gray400, marginRight: 8 },
  valueInput: { flex: 1, paddingVertical: 14, fontFamily: fonts.head, fontSize: 20, color: colors.ink },
  noteInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14, minHeight: 84, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: 10 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
