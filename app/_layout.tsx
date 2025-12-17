import { useEffect } from 'react';
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
import { Inter_700Bold } from '@expo-google-fonts/inter';
import { Colors } from '@/constants/Theme';

export default function RootLayout() {
  useFrameworkReady();
  const initialize = useAuth((state) => state.initialize);
  const user = useAuth((state) => state.user);
  const checkPremiumStatus = useTwin((state) => state.checkPremiumStatus);
  const onboardingComplete = useTwin((state) => state.onboardingComplete);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    'Recoleta-Regular': require('@/assets/fonts/Recoleta-RegularDEMO.otf'),
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
    initializeMixpanel();
  }, []);

  // Initialize premium status and Mixpanel user when user is available
  useEffect(() => {
    if (user?.id) {
      checkPremiumStatus(user.id);

      // Identify user in Mixpanel (async - will also initialize Session Replay)
      identifyUser(user.id).catch((error) => {
        console.error('Failed to identify user in Mixpanel:', error);
      });

      // Set basic user properties including A/B test group
      (async () => {
        try {
          const profile = await getProfile(user.id);
          const userProperties: Record<string, any> = {
            user_id: user.id,
            signup_date: user.created_at || new Date().toISOString(),
          };
          
          // Add A/B test group if available
          if (profile?.ab_test_group) {
            userProperties.ab_test_group = profile.ab_test_group;
          }
          
          setUserProperties(userProperties);
        } catch (error) {
          console.error('Failed to fetch profile for Mixpanel:', error);
          // Still set basic properties even if profile fetch fails
          setUserProperties({
            user_id: user.id,
            signup_date: user.created_at || new Date().toISOString(),
          });
        }
      })();
    }
  }, [user?.id]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
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
      <Stack.Screen name="+not-found" />
      <StatusBar style="dark" />
    </Stack>
  );
}
