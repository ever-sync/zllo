import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

const registerSchema = z.object({
  fullName: z.string().min(3, 'Informe seu nome completo.'),
  cpf: z.string().refine((val) => isValidCPF(val), { message: 'CPF inválido.' }),
  phone: z.string().refine((val) => isValidPhone(val), { message: 'Telefone inválido (com DDD).' }),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Mínimo de 6 caracteres.'),
  cep: z.string().refine((val) => isValidCEP(val), { message: 'CEP inválido.' }),
  street: z.string().min(2, 'Informe o logradouro.'),
  number: z.string().min(1, 'Nº'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Informe o bairro.'),
  city: z.string().min(2, 'Informe a cidade.'),
  uf: z.string().length(2, 'UF'),
  lgpd: z.literal(true, {
    message: 'É preciso aceitar os termos e a Política de Privacidade (LGPD).',
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('cliente');
  const [cepLoading, setCepLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      cpf: '',
      phone: '',
      email: '',
      password: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      uf: '',
      lgpd: false as any,
    },
  });

  const onCepBlur = async (cepValue: string) => {
    if (!isValidCEP(cepValue)) return;
    setCepLoading(true);
    const addr = await fetchAddressByCEP(cepValue);
    setCepLoading(false);
    if (addr) {
      if (addr.street) setValue('street', addr.street, { shouldValidate: true });
      if (addr.neighborhood) setValue('neighborhood', addr.neighborhood, { shouldValidate: true });
      if (addr.city) setValue('city', addr.city, { shouldValidate: true });
      if (addr.uf) setValue('uf', addr.uf, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    setInfo(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          cpf: onlyDigits(values.cpf),
          phone: onlyDigits(values.phone),
          role,
          cep: onlyDigits(values.cep),
          street: values.street.trim(),
          number: values.number.trim(),
          complement: values.complement?.trim() || null,
          neighborhood: values.neighborhood.trim(),
          city: values.city.trim(),
          uf: values.uf.trim().toUpperCase(),
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
    // Sessão activa → onAuthStateChange redireciona automaticamente.
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
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Nome completo"
              placeholder="Seu nome"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.fullName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="cpf"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="CPF"
              placeholder="000.000.000-00"
              keyboardType="number-pad"
              onBlur={onBlur}
              onChangeText={(t) => onChange(formatCPF(t))}
              value={value}
              error={errors.cpf?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Telefone"
              placeholder="(11) 91234-5678"
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={(t) => onChange(formatPhone(t))}
              value={value}
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="E-mail"
              placeholder="voce@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Senha"
              placeholder="Crie uma senha"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Endereço</Text>
        <Text style={styles.sectionSub}>Usamos para localizar assistências perto de você.</Text>

        <Controller
          control={control}
          name="cep"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="CEP"
              placeholder="00000-000"
              keyboardType="number-pad"
              onBlur={() => {
                onBlur();
                void onCepBlur(value);
              }}
              onChangeText={(t) => onChange(formatCEP(t))}
              value={value}
              error={errors.cep?.message}
              hint={cepLoading ? 'Buscando endereço…' : undefined}
            />
          )}
        />

        <Controller
          control={control}
          name="street"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Logradouro"
              placeholder="Rua, avenida…"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.street?.message}
            />
          )}
        />

        <View style={styles.row}>
          <View style={{ width: 110 }}>
            <Controller
              control={control}
              name="number"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Número"
                  placeholder="Nº"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.number?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="complement"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Complemento"
                  placeholder="Apto, bloco… (opcional)"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.complement?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="neighborhood"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Bairro"
              placeholder="Bairro"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.neighborhood?.message}
            />
          )}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Cidade"
                  placeholder="Cidade"
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.city?.message}
                />
              )}
            />
          </View>
          <View style={{ width: 80 }}>
            <Controller
              control={control}
              name="uf"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="UF"
                  placeholder="UF"
                  autoCapitalize="characters"
                  maxLength={2}
                  onBlur={onBlur}
                  onChangeText={(t) => onChange(t.toUpperCase())}
                  value={value}
                  error={errors.uf?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="lgpd"
          render={({ field: { onChange, value } }) => (
            <Checkbox checked={!!value} onToggle={() => onChange(!value)} style={{ marginTop: 8 }}>
              <Text style={styles.lgpdText}>
                Li e concordo com os{' '}
                <Text style={styles.lgpdLink} onPress={() => router.push('/termos')}>
                  Termos de Uso
                </Text>{' '}
                e a{' '}
                <Text style={styles.lgpdLink} onPress={() => router.push('/privacidade')}>
                  Política de Privacidade
                </Text>
                , e autorizo o tratamento dos meus dados conforme a LGPD.
              </Text>
            </Checkbox>
          )}
        />

        {errors.lgpd?.message ? <MessageBanner variant="error">{errors.lgpd.message}</MessageBanner> : null}
        {formError ? <MessageBanner variant="error">{formError}</MessageBanner> : null}
        {info ? <MessageBanner variant="success">{info}</MessageBanner> : null}

        <Button label="Criar conta" onPress={handleSubmit(onSubmit)} loading={loading} style={{ marginTop: 4 }} />

        <Pressable onPress={() => router.replace('/login')} style={styles.footer}>
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
  header: { paddingTop: 40, paddingBottom: 48 },
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
