import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import {
  initializeMixpanel,
  identifyUser,
  setUserProperties,
} from '@/lib/mixpanel';
import { getProfile } from '@/lib/storage';
import adjustService from '@/adjustService';
import { Inter_700Bold, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Colors } from '@/constants/Theme';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuth((state) => state.initialize);
  const user = useAuth((state) => state.user);
  const checkPremiumStatus = useTwin((state) => state.checkPremiumStatus);
  const onboardingComplete = useTwin((state) => state.onboardingComplete);
  const mixpanelInitPromiseRef = useRef<Promise<void> | null>(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    'Recoleta-Regular': require('@/assets/fonts/Recoleta-RegularDEMO.otf'),
    'Recoleta-Semibold': require('@/assets/fonts/recoleta-semibold.otf'),
  });
  useEffect(() => {
    (async () => {
      try {
        adjustService.initialize();
        console.log('Adjust has been initialized');
      } catch (error) {
        console.error('Error initializing Adjust:', error);
      }
    })();
  }, []);
  useEffect(() => {
    initialize();
  }, []);

  // Initialize Mixpanel
  useEffect(() => {
    (async () => {
      try {
        if (!mixpanelInitPromiseRef.current) {
          mixpanelInitPromiseRef.current = initializeMixpanel();
        }
        await mixpanelInitPromiseRef.current;
        console.log('✅ Mixpanel initialization complete');
      } catch (error) {
        console.error('❌ Failed to initialize Mixpanel:', error);
      }
    })();
  }, []);

  // Initialize premium status and Mixpanel user when user is available
  useEffect(() => {
    if (!user?.id) return;

    checkPremiumStatus(user.id);

    (async () => {
      try {
        // Ensure Mixpanel is initialized before identify / property calls
        if (!mixpanelInitPromiseRef.current) {
          mixpanelInitPromiseRef.current = initializeMixpanel();
        }
        await mixpanelInitPromiseRef.current;

        await identifyUser(user.id);
        console.log('✅ User identified in Mixpanel:', user.id);

        // Set basic user properties including A/B test group
        try {
          const profile = await getProfile(user.id);
          const userProperties: Record<string, any> = {
            user_id: user.id,
            signup_date: user.created_at || new Date().toISOString(),
          };

          if (profile?.ab_test_group) {
            userProperties.ab_test_group = profile.ab_test_group;
          }

          setUserProperties(userProperties);
        } catch (error) {
          console.error('Failed to fetch profile for Mixpanel:', error);
          setUserProperties({
            user_id: user.id,
            signup_date: user.created_at || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize/identify Mixpanel:', error);
      }
    })();
  }, [user?.id]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="ai-onboarding"
          options={{
            presentation: 'fullScreenModal',
            gestureEnabled: false,
            animation: 'none',
          }}
        />
        <Stack.Screen name="decision" />
        <Stack.Screen name="whatif" />
        <Stack.Screen name="relationships" />
        <Stack.Screen name="journal" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="premium-onboarding" />
        <Stack.Screen name="journey" />
        <Stack.Screen name="twin-update" />
        <Stack.Screen name="twin-insights" />
        <Stack.Screen name="full-profile" />
        <Stack.Screen name="account-settings" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {/* Must be outside Stack to avoid expo-router layout warning */}
      <StatusBar style="dark" />
    </>
  );
}
