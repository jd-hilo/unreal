import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

export default function Index() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const onboardingComplete = useTwin((state) => state.onboardingComplete);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace('/auth');
    } else if (!onboardingComplete) {
      router.replace('/onboarding/01-now');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [user, initialized, onboardingComplete]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000000" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
