import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';
import { useState } from 'react';

export default function EsqueciSenha() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }
    setInfo('Enviamos um link de recuperação para o seu e-mail.');
  };

  return (
    <Screen>
      <AppHeader title="Recuperar senha" subtitle="Enviaremos um link por e-mail" />
      <TextField
        label="E-mail"
        placeholder="voce@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}
      <Button label="Enviar link" onPress={onSubmit} loading={loading} style={{ marginTop: 12 }} />
      <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={styles.link}>Voltar ao login</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.redText, marginTop: 8 },
  info: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.greenText, marginTop: 8 },
  link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.blue, textAlign: 'center' },
});
