import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/store/useAuth';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuth((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="decision" />
        <Stack.Screen name="whatif" />
        <Stack.Screen name="relationships" />
        <Stack.Screen name="journal" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
