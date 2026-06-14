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
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string };

export default function AnuncioChat() {
  const { id, buyerId } = useLocalSearchParams<{ id: string; buyerId?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [title, setTitle] = useState('Anúncio');
  const [peerName, setPeerName] = useState('Conversa');
  const [threadBuyerId, setThreadBuyerId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!id || !session) return;

    const { data: listing } = await supabase
      .from('listings')
      .select('title, seller_id')
      .eq('id', id)
      .maybeSingle();
    if (!listing) return;

    setTitle(listing.title);

    const isSeller = listing.seller_id === session.user.id;
    const resolvedBuyerId = isSeller ? (buyerId ?? null) : session.user.id;
    if (!resolvedBuyerId) return;
    setThreadBuyerId(resolvedBuyerId);

    if (isSeller) {
      const { data: threads } = await supabase.rpc('list_listing_interest_threads', { p_listing_id: id });
      const row = ((threads as { buyer_id: string; buyer_name: string | null }[] | null) ?? []).find(
        (t) => t.buyer_id === resolvedBuyerId,
      );
      setPeerName(row?.buyer_name?.split(' ')[0] ?? 'Comprador');
    } else {
      const { data: seller } = await supabase.rpc('get_listing_seller_contact', { p_listing_id: id });
      const row = seller as { full_name?: string | null } | null;
      setPeerName(row?.full_name?.split(' ')[0] ?? 'Vendedor');
    }

    const { data: m } = await supabase
      .from('listing_messages')
      .select('id, sender_id, body, created_at')
      .eq('listing_id', id)
      .eq('buyer_id', resolvedBuyerId)
      .order('created_at', { ascending: true });
    setMsgs((m as Msg[]) ?? []);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, [id, buyerId, session]);

  const scheduleLoad = useDebouncedReload(load);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id || !threadBuyerId) return;
    const ch = supabase
      .channel(`listing-chat-${id}-${threadBuyerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_messages',
          filter: `listing_id=eq.${id}`,
        },
        scheduleLoad,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, threadBuyerId, scheduleLoad]);

  const send = async () => {
    const body = text.trim();
    if (!body || !id || !session) return;
    setText('');
    const { error } = await supabase.rpc('send_listing_message', {
      p_listing_id: id,
      p_body: body,
      p_buyer_id: threadBuyerId ?? undefined,
    });
    if (error) return;
    void load();
  };

  if (!threadBuyerId && session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.name}>Selecione um comprador</Text>
        </View>
        <Text style={styles.hint}>Abra o chat a partir da lista de interessados no anúncio.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{peerName}</Text>
          <Text style={styles.device} numberOfLines={1}>{title}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {msgs.length === 0 ? (
            <Text style={styles.hint}>Combine detalhes da compra por aqui.</Text>
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
            onSubmitEditing={() => void send()}
            returnKeyType="send"
          />
          <Pressable onPress={() => void send()} style={styles.sendBtn}>
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
