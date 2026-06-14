import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { fmtNotificationTime, notificationHref, type NotificationRow } from '@/lib/notification-routes';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export default function Notificacoes() {
  const router = useRouter();
  const { profile } = useAuth();
  const role = profile?.role ?? 'cliente';
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, type, data, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as NotificationRow[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markAllRead = async () => {
    await supabase.rpc('mark_all_notifications_read');
    setRows((prev) => (prev ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const onOpen = async (n: NotificationRow) => {
    if (!n.read_at) {
      await supabase.rpc('mark_notification_read', { p_id: n.id });
      setRows((prev) => (prev ?? []).map((row) => (row.id === n.id ? { ...row, read_at: new Date().toISOString() } : row)));
    }
    const href = notificationHref(n, role);
    if (href) router.push(href as never);
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Notificações" subtitle="Orçamentos, mensagens e pedidos" />

      {rows?.some((n) => !n.read_at) ? (
        <Pressable onPress={() => void markAllRead()} style={styles.markAll}>
          <Text style={styles.markAllText}>Marcar todas como lidas</Text>
        </Pressable>
      ) : null}

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : rows === null ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Nenhuma notificação"
          description="Quando receber orçamentos ou mensagens, elas aparecerão aqui."
          actionLabel="Voltar ao início"
          onAction={() => router.replace('/(client)/(tabs)')}
        />
      ) : (
        <View style={{ gap: 10, marginTop: 8 }}>
          {rows.map((n) => {
            const unread = !n.read_at;
            const href = notificationHref(n, role);
            return (
              <Pressable
                key={n.id}
                style={[styles.card, unread && styles.cardUnread]}
                onPress={() => void onOpen(n)}
                disabled={!href}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.cardTime}>{fmtNotificationTime(n.created_at)}</Text>
                </View>
                <Text style={styles.cardBody} numberOfLines={3}>{n.body}</Text>
                {href ? (
                  <View style={styles.openRow}>
                    <Text style={styles.openText}>Abrir</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.blue} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { alignSelf: 'flex-end', marginBottom: 8 },
  markAllText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.blue },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 14,
  },
  cardUnread: { borderColor: colors.blue, backgroundColor: '#F0F4FF' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  cardTime: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray600 },
  cardBody: { fontFamily: fonts.body, fontSize: 13.5, color: colors.gray600, marginTop: 6, lineHeight: 20 },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
  openText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.blue },
});
