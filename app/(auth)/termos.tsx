import { ScrollView, StyleSheet, Text } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/screen';
import { TERMS_BODY, TERMS_TITLE } from '@/lib/legal-content';
import { colors, fonts } from '@/theme';

export default function Termos() {
  return (
    <Screen>
      <AppHeader title="Termos de Uso" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{TERMS_TITLE}</Text>
        <Text style={styles.text}>{TERMS_BODY}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 32 },
  title: { fontFamily: fonts.headBold, fontSize: 18, color: colors.ink, marginBottom: 12 },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, lineHeight: 22 },
});
