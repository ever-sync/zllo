import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { formatCPF, formatPhone, isValidCPF, isValidPhone, onlyDigits } from '@/lib/cpf';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

/** Edição dos dados pessoais — compartilhada entre cliente e assistência. */
export function ProfileEditor() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const cpfLocked = Boolean(profile?.cpf);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ? formatPhone(profile.phone) : '');
  const [cpf, setCpf] = useState(profile?.cpf ? formatCPF(profile.cpf) : '');
  const [cep, setCep] = useState(profile?.cep ?? '');
  const [street, setStreet] = useState(profile?.street ?? '');
  const [number, setNumber] = useState(profile?.number ?? '');
  const [complement, setComplement] = useState(profile?.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [uf, setUf] = useState(profile?.uf ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setError(null);
    if (fullName.trim().length < 3) {
      setError('Informe seu nome completo.');
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setError('Telefone inválido. Use DDD + número.');
      return;
    }
    if (!cpfLocked && cpf.trim() && !isValidCPF(cpf)) {
      setError('CPF inválido.');
      return;
    }
    if (!profile) return;
    setSaving(true);
    const update: Record<string, string | null> = {
      full_name: fullName.trim(),
      phone: phone.trim() ? onlyDigits(phone) : null,
      cep: cep.trim() || null,
      street: street.trim() || null,
      number: number.trim() || null,
      complement: complement.trim() || null,
      neighborhood: neighborhood.trim() || null,
      city: city.trim() || null,
      uf: uf.trim() ? uf.trim().toUpperCase().slice(0, 2) : null,
    };
    if (!cpfLocked && cpf.trim()) {
      update.cpf = onlyDigits(cpf);
    }
    const { error: upErr } = await supabase.from('profiles').update(update).eq('id', profile.id);
    if (upErr) {
      setSaving(false);
      setError(
        /duplicate|unique/i.test(upErr.message)
          ? 'Este CPF já está cadastrado em outra conta.'
          : upErr.message,
      );
      return;
    }
    await refreshProfile();
    setSaving(false);
    router.back();
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Editar perfil" subtitle="Mantenha seus dados atualizados" />

      <View style={{ gap: 13 }}>
        <Text style={styles.section}>Dados pessoais</Text>
        <TextField label="Nome completo" placeholder="Seu nome" value={fullName} onChangeText={setFullName} />
        <TextField
          label="Telefone"
          placeholder="(11) 91234-5678"
          value={phone}
          onChangeText={(t) => setPhone(formatPhone(t))}
          keyboardType="phone-pad"
        />
        <TextField
          label="CPF"
          placeholder="000.000.000-00"
          value={cpf}
          onChangeText={(t) => setCpf(formatCPF(t))}
          keyboardType="number-pad"
          editable={!cpfLocked}
          hint={cpfLocked ? 'O CPF já está cadastrado e não pode ser alterado aqui.' : undefined}
        />

        <Text style={styles.section}>Endereço</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="CEP" placeholder="00000-000" value={cep} onChangeText={setCep} keyboardType="number-pad" />
          </View>
          <View style={{ width: 90 }}>
            <TextField label="UF" placeholder="SP" value={uf} onChangeText={setUf} maxLength={2} autoCapitalize="characters" />
          </View>
        </View>
        <TextField label="Rua" placeholder="Av. Paulista" value={street} onChangeText={setStreet} />
        <View style={styles.row}>
          <View style={{ width: 110 }}>
            <TextField label="Número" placeholder="123" value={number} onChangeText={setNumber} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Complemento" placeholder="Apto 12" value={complement} onChangeText={setComplement} />
          </View>
        </View>
        <TextField label="Bairro" placeholder="Centro" value={neighborhood} onChangeText={setNeighborhood} />
        <TextField label="Cidade" placeholder="São Paulo" value={city} onChangeText={setCity} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Salvar alterações" onPress={onSave} loading={saving} style={{ marginTop: 4, marginBottom: 8 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.head, fontSize: 15, color: colors.ink, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red },
});
