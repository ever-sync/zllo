import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { notificationHrefFromPushData } from '@/lib/notification-routes';

/** Navega ao tocar em push notification (cold start + foreground). */
export function PushNavigationHandler() {
  const router = useRouter();
  const { session, profile } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || !session) return;

    const role = profile?.role ?? 'cliente';

    const navigate = (raw: Record<string, unknown>) => {
      const href = notificationHrefFromPushData(raw, role);
      if (href) router.push(href as never);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        navigate(data as Record<string, unknown>);
      }
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        navigate(data as Record<string, unknown>);
      }
    });

    return () => sub.remove();
  }, [router, session, profile?.role]);

  return null;
}
