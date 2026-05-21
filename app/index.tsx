import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href={profile?.role === 'assistencia' ? '/(shop)/(tabs)' : '/(client)/(tabs)'} />;
}
