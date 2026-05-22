import { Alert, Platform } from 'react-native';

/**
 * Confirmação cross-platform. Na web o Alert do RN é no-op, então usamos
 * window.confirm; no nativo, Alert com dois botões. Resolve true/false.
 */
export function confirmAsync(
  title: string,
  message?: string,
  confirmLabel = 'Confirmar',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

/** Aviso simples cross-platform (web usa window.alert; nativo usa Alert). */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
