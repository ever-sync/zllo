import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { colors, fonts } from '@/theme';

const SECTIONS = [
  { title: 'Notificações', items: ['Novos orçamentos', 'Mensagens', 'Resumo diário', 'Avaliações'] },
  { title: 'Conta e pagamentos', items: ['Dados bancários', 'Plano atual', 'Saque automático'] },
  { title: 'Privacidade', items: ['Dados da empresa', 'LGPD', 'Exportar histórico'] },
];

export default function Configuracoes() {
  return (
    <Screen>
      <AppHeader title="Configurações" subtitle="Preferências e conta" />
      {SECTIONS.map((sec) => (
        <Card key={sec.title} style={{ marginBottom: 12 }}>
          <Text style={styles.section}>{sec.title}</Text>
          {sec.items.map((item, j) => (
            <View key={item} style={[styles.row, j < sec.items.length - 1 && styles.rowBorder]}>
              <Text style={styles.item}>{item}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </View>
          ))}
        </Card>
      ))}
      <Text style={styles.note}>Tela de exemplo — as configurações reais entram conforme cada recurso fica pronto.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.head, fontSize: 15, color: colors.ink, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  item: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray400, textAlign: 'center', marginTop: 4 },
});
