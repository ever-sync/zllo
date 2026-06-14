import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }
    // onAuthStateChange cuida do redirecionamento.
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Brand size={30} />
      </View>

      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>Bem-vindo de volta 👋</Text>

      <View style={styles.form}>
        <TextField
          label="E-mail"
          placeholder="voce@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Senha"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Button label="Entrar" onPress={onSubmit} loading={loading} style={{ marginTop: 4 }} />

        <Pressable onPress={() => router.push('/(auth)/esqueci-senha')} style={styles.forgot}>
          <Text style={styles.footerLink}>Esqueci minha senha</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(auth)/register')} style={styles.footer}>
          <Text style={styles.footerText}>
            Não tem conta? <Text style={styles.footerLink}>Criar agora</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 24 },
  title: { fontFamily: fonts.headBlack, fontSize: 28, color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, marginTop: 4 },
  form: { gap: 14, marginTop: 24 },
  errorBox: {
    backgroundColor: colors.redBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.redText, lineHeight: 18 },
  footer: { marginTop: 16, alignItems: 'center' },
  forgot: { marginTop: 12, alignItems: 'center' },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.blue },
});
