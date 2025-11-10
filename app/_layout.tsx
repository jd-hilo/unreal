import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuth((state) => state.initialize);
  const user = useAuth((state) => state.user);
  const checkPremiumStatus = useTwin((state) => state.checkPremiumStatus);

  useEffect(() => {
    initialize();
  }, []);

  // Initialize premium status when user is available
  useEffect(() => {
    if (user?.id) {
      checkPremiumStatus(user.id);
    }
  }, [user?.id]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0C0C10' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="decision" />
        <Stack.Screen name="whatif" />
        <Stack.Screen name="relationships" />
        <Stack.Screen name="journal" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
