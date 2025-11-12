import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import {
  initializeMixpanel,
  identifyUser,
  setUserProperties,
} from '@/lib/mixpanel';
import adjustService from '@/adjustService';
export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuth((state) => state.initialize);
  const user = useAuth((state) => state.user);
  const checkPremiumStatus = useTwin((state) => state.checkPremiumStatus);
  useEffect(() => {
    (async () => {
      try {
        adjustService.initialize();
        console.log('Adjust has been initialized');
      } catch (error) {
        console.error('Error  tracking:', error);
      }
    })();
  }, []);
  useEffect(() => {
    initialize();
  }, []);

  // Initialize Mixpanel
  useEffect(() => {
    initializeMixpanel();
  }, []);

  // Initialize premium status and Mixpanel user when user is available
  useEffect(() => {
    if (user?.id) {
      checkPremiumStatus(user.id);

      // Identify user in Mixpanel
      identifyUser(user.id);

      // Set basic user properties
      setUserProperties({
        user_id: user.id,
        signup_date: user.created_at || new Date().toISOString(),
      });
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
