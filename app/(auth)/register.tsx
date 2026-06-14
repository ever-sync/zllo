import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Screen } from '@/components/ui/screen';
import { MessageBanner } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { fetchAddressByCEP, formatCEP, isValidCEP } from '@/lib/cep';
import { formatCPF, formatPhone, isValidCPF, isValidPhone, onlyDigits } from '@/lib/cpf';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/auth';
import { colors, fonts, radius } from '@/theme';

/** Versão do termo aceito — incremente ao mudar o texto do consentimento. */
const LGPD_VERSION = '1.0';

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('cliente');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const [lgpd, setLgpd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onCepBlur = async () => {
    if (!isValidCEP(cep)) return;
    setCepLoading(true);
    const addr = await fetchAddressByCEP(cep);
    setCepLoading(false);
    if (addr) {
      if (addr.street) setStreet(addr.street);
      if (addr.neighborhood) setNeighborhood(addr.neighborhood);
      if (addr.city) setCity(addr.city);
      if (addr.uf) setUf(addr.uf);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 3) e.fullName = 'Informe seu nome completo.';
    if (!isValidCPF(cpf)) e.cpf = 'CPF inválido.';
    if (!isValidPhone(phone)) e.phone = 'Telefone inválido (com DDD).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'E-mail inválido.';
    if (password.length < 6) e.password = 'Mínimo de 6 caracteres.';
    if (!isValidCEP(cep)) e.cep = 'CEP inválido.';
    if (street.trim().length < 2) e.street = 'Informe o logradouro.';
    if (number.trim().length < 1) e.number = 'Nº';
    if (neighborhood.trim().length < 2) e.neighborhood = 'Informe o bairro.';
    if (city.trim().length < 2) e.city = 'Informe a cidade.';
    if (uf.trim().length !== 2) e.uf = 'UF';
    setErrors(e);
    if (!lgpd) {
      setFormError('É preciso aceitar os termos e a Política de Privacidade (LGPD).');
      return false;
    }
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
          cep: onlyDigits(cep),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim() || null,
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          uf: uf.trim().toUpperCase(),
          lgpd_accepted: 'true',
          lgpd_version: LGPD_VERSION,
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

        <Text style={styles.sectionTitle}>Endereço</Text>
        <Text style={styles.sectionSub}>Usamos para localizar assistências perto de você.</Text>

        <TextField
          label="CEP"
          placeholder="00000-000"
          keyboardType="number-pad"
          value={cep}
          onChangeText={(t) => setCep(formatCEP(t))}
          onBlur={onCepBlur}
          error={errors.cep}
          hint={cepLoading ? 'Buscando endereço…' : undefined}
        />
        <TextField
          label="Logradouro"
          placeholder="Rua, avenida…"
          autoCapitalize="words"
          value={street}
          onChangeText={setStreet}
          error={errors.street}
        />
        <View style={styles.row}>
          <View style={{ width: 110 }}>
            <TextField
              label="Número"
              placeholder="Nº"
              keyboardType="number-pad"
              value={number}
              onChangeText={setNumber}
              error={errors.number}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Complemento"
              placeholder="Apto, bloco… (opcional)"
              value={complement}
              onChangeText={setComplement}
            />
          </View>
        </View>
        <TextField
          label="Bairro"
          placeholder="Bairro"
          autoCapitalize="words"
          value={neighborhood}
          onChangeText={setNeighborhood}
          error={errors.neighborhood}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Cidade"
              placeholder="Cidade"
              autoCapitalize="words"
              value={city}
              onChangeText={setCity}
              error={errors.city}
            />
          </View>
          <View style={{ width: 80 }}>
            <TextField
              label="UF"
              placeholder="UF"
              autoCapitalize="characters"
              maxLength={2}
              value={uf}
              onChangeText={(t) => setUf(t.toUpperCase())}
              error={errors.uf}
            />
          </View>
        </View>

        <Checkbox checked={lgpd} onToggle={() => setLgpd((v) => !v)} style={{ marginTop: 8 }}>
          <Text style={styles.lgpdText}>
            Li e concordo com os <Text style={styles.lgpdLink}>Termos de Uso</Text> e a{' '}
            <Text style={styles.lgpdLink}>Política de Privacidade</Text>, e autorizo o tratamento dos
            meus dados conforme a LGPD.
          </Text>
        </Checkbox>

        {formError ? <MessageBanner variant="error">{formError}</MessageBanner> : null}
        {info ? <MessageBanner variant="success">{info}</MessageBanner> : null}

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
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.ink : colors.gray600 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fonts.headBlack, fontSize: 28, color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 18, backgroundColor: colors.gray100, borderRadius: radius.full, padding: 4 },
  chip: { flex: 1, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  chipActive: { backgroundColor: colors.lime },
  chipIdle: { backgroundColor: 'transparent' },
  chipText: { fontFamily: fonts.headBold, fontSize: 12.5 },
  form: { gap: 13, marginTop: 18 },
  sectionTitle: { fontFamily: fonts.head, fontSize: 16, color: colors.ink, marginTop: 8 },
  sectionSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: -6 },
  row: { flexDirection: 'row', gap: 10 },
  lgpdText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, lineHeight: 18 },
  lgpdLink: { fontFamily: fonts.bodyBold, color: colors.blue },
  footer: { marginTop: 14, alignItems: 'center', paddingBottom: 8 },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.blue },
});
