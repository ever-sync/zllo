import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { formatCPF, formatPhone, isValidCPF, isValidPhone, onlyDigits } from '@/lib/cpf';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/auth';
import { colors, fonts, radius } from '@/theme';

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('cliente');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 3) e.fullName = 'Informe seu nome completo.';
    if (!isValidCPF(cpf)) e.cpf = 'CPF inválido.';
    if (!isValidPhone(phone)) e.phone = 'Telefone inválido (com DDD).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'E-mail inválido.';
    if (password.length < 6) e.password = 'Mínimo de 6 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    setFormError(null);
    setInfo(null);
    if (!validate()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          cpf: onlyDigits(cpf),
          phone: onlyDigits(phone),
          role,
        },
      },
    });
    setLoading(false);

    if (error) {
      setFormError(authErrorMessage(error.message));
      return;
    }
    if (!data.session) {
      // Confirmação de e-mail está ativada no projeto.
      setInfo('Conta criada! Enviamos um e-mail de confirmação. Confirme para entrar.');
      return;
    }
    // Sessão ativa → onAuthStateChange redireciona automaticamente.
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Brand size={30} />
      </View>

      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.subtitle}>É grátis. Leva menos de 2 minutos.</Text>

      <View style={styles.roleRow}>
        <RoleChip label="Sou cliente" active={role === 'cliente'} onPress={() => setRole('cliente')} />
        <RoleChip label="Sou assistência" active={role === 'assistencia'} onPress={() => setRole('assistencia')} />
      </View>

      <View style={styles.form}>
        <TextField
          label="Nome completo"
          placeholder="Seu nome"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
        />
        <TextField
          label="CPF"
          placeholder="000.000.000-00"
          keyboardType="number-pad"
          value={cpf}
          onChangeText={(t) => setCpf(formatCPF(t))}
          error={errors.cpf}
        />
        <TextField
          label="Telefone"
          placeholder="(11) 91234-5678"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(t) => setPhone(formatPhone(t))}
          error={errors.phone}
        />
        <TextField
          label="E-mail"
          placeholder="voce@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />
        <TextField
          label="Senha"
          placeholder="Crie uma senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <Button label="Criar conta" onPress={onSubmit} loading={loading} style={{ marginTop: 4 }} />

        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.footer}>
          <Text style={styles.footerText}>
            Já tem conta? <Text style={styles.footerLink}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.ink : colors.white, borderColor: active ? colors.ink : colors.gray200 }]}
    >
      <Text style={[styles.chipText, { color: active ? colors.white : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fonts.headBlack, fontSize: 28, color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  chip: { flex: 1, borderWidth: 1, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  chipText: { fontFamily: fonts.headBold, fontSize: 12.5 },
  form: { gap: 13, marginTop: 18 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red },
  info: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.green },
  footer: { marginTop: 14, alignItems: 'center', paddingBottom: 8 },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.blue },
});
