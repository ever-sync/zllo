import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useDebouncedReload } from '@/hooks/use-debounced-reload';
import { getDeviceName } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string };

/**
 * Conversa do lado do CLIENTE. Diferente da loja, o cliente pode ter várias
 * conversas para uma mesma solicitação (uma por loja que orçou), então a loja
 * vem por parâmetro: `id` = request_id, `shopId` = loja, `shopName` = título.
 */
export default function Conversa() {
  const { id, shopId, shopName } = useLocalSearchParams<{ id: string; shopId: string; shopName?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [header, setHeader] = useState({ name: shopName ?? 'Assistência', device: '' });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!id || !shopId) return;
    const { data: r } = await supabase
      .from('repair_requests')
      .select('device:devices(brand, model, nickname)')
      .eq('id', id)
      .maybeSingle();
    if (r) {
      setHeader((h) => ({ ...h, device: getDeviceName((r as any).device, '') }));
    }
    const { data: m } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('request_id', id)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });
    setMsgs((m as Msg[]) ?? []);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, [id, shopId]);

  const scheduleLoad = useDebouncedReload(load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`client-conv-${id}-${shopId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${id}` }, scheduleLoad)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, shopId, scheduleLoad]);

  const send = async () => {
    const body = text.trim();
    if (!body || !id || !shopId || !session) return;
    setText('');
    await supabase.from('messages').insert({ request_id: id, shop_id: shopId, sender_id: session.user.id, body });
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.avatar}><Text style={styles.avatarText}>{header.name.slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{header.name}</Text>
          {header.device ? <Text style={styles.device}>{header.device}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.messages} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {msgs.length === 0 ? (
            <Text style={styles.hint}>Tire suas dúvidas com a assistência antes de fechar o reparo.</Text>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === session?.user.id;
              return (
                <View key={m.id} style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.bubbleText, { color: mine ? colors.white : colors.ink }]}>{m.body}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={colors.gray400}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray200, backgroundColor: colors.white },
  back: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headBold, fontSize: 13, color: colors.white },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  device: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600 },
  messages: { padding: 16, gap: 10, flexGrow: 1 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.gray400, textAlign: 'center', marginTop: 30, paddingHorizontal: 24, lineHeight: 19 },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  mine: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.gray200, backgroundColor: colors.white },
  input: { flex: 1, backgroundColor: colors.gray100, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  sendBtn: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
