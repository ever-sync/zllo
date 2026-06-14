import { ScrollView, StyleSheet, Text } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/screen';
import { PRIVACY_BODY, PRIVACY_TITLE } from '@/lib/legal-content';
import { colors, fonts } from '@/theme';

export default function Privacidade() {
  return (
    <Screen>
      <AppHeader title="Privacidade" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{PRIVACY_TITLE}</Text>
        <Text style={styles.text}>{PRIVACY_BODY}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 32 },
  title: { fontFamily: fonts.headBold, fontSize: 18, color: colors.ink, marginBottom: 12 },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, lineHeight: 22 },
});
