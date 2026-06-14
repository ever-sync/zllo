import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

/**
 * Header padrão das telas do cliente: saudação OU título à esquerda,
 * sino + avatar à direita. Mantém a identidade visual em todas as abas.
 */
export function ClientHeader({
  title,
  subtitle,
  greeting,
  right,
}: {
  title?: string;
  subtitle?: string;
  greeting?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const [unread, setUnread] = useState(0);
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const initial = (profile?.full_name?.trim()?.[0] ?? 'Z').toUpperCase();

  useFocusEffect(
    useCallback(() => {
      supabase.rpc('get_my_unread_notification_count').then(({ data }) => {
        setUnread(Number(data ?? 0));
      });
    }, []),
  );

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        {greeting ? (
          <Text style={styles.greeting}>
            Olá, <Text style={styles.name}>{firstName}!</Text>
          </Text>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        {right}
        <Pressable style={styles.bell} onPress={() => router.push('/(client)/notificacoes')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={colors.ink} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginBottom: 4 },
  greeting: { fontFamily: fonts.head, fontSize: 20, color: colors.ink },
  name: { fontFamily: fonts.headBlack, color: colors.ink },
  title: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.white },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headBlack, fontSize: 16, color: colors.ink },
});
