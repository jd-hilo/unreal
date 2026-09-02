import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getHasSeenWelcome } from '@/lib/welcomeStorage';
import { getIncompleteOnboardingRoute } from '@/lib/onboardingResume';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  console.log('📍 INDEX: Component rendering');
  const router = useRouter();
  const { user, initialized, loading } = useAuth();
  const { checkOnboardingStatus } = useTwin();
  const hasRouted = useRef(false);
  const [hasCheckedWelcome, setHasCheckedWelcome] = useState(false);

  // Check welcome screen status
  useEffect(() => {
    const checkWelcome = async () => {
      const hasSeenWelcome = await getHasSeenWelcome();
      setHasCheckedWelcome(true);
      
      if (!hasSeenWelcome) {
        console.log('📍 INDEX: User has not seen welcome, routing to /welcome');
        hasRouted.current = true;
        router.replace('/welcome');
        return;
      }
    };
    
    checkWelcome();
  }, []);

  useEffect(() => {
    console.log('📍 INDEX: useEffect running', { hasRouted: hasRouted.current, initialized, loading, hasUser: !!user, hasCheckedWelcome });
    
    // Prevent multiple routing attempts
    if (hasRouted.current) {
      console.log('📍 INDEX: Already routed, skipping');
      return;
    }
    
    // Wait for welcome check and auth to finish initializing before routing
    if (!hasCheckedWelcome || !initialized || loading) {
      console.log('📍 INDEX: Waiting for welcome check or auth to initialize');
      return;
    }

    if (!user) {
      console.log('📍 INDEX: No user, routing to /auth');
      hasRouted.current = true;
      router.replace('/auth');
      return;
    }

    console.log('📍 INDEX: User found, checking onboarding status');
    hasRouted.current = true;

    // Check onboarding and route
    checkOnboardingStatus(user.id).then(async () => {
      const isComplete = useTwin.getState().onboardingComplete;
      console.log('📍 INDEX: Onboarding check complete', { isComplete });

      if (!isComplete) {
        const resumeRoute = getIncompleteOnboardingRoute();
        console.log('📍 INDEX: Routing to incomplete onboarding resume', resumeRoute);
        router.replace(resumeRoute);
        return;
      }

      // Onboarding complete — check if user needs to see premium onboarding
      const isPremium = useTwin.getState().isPremium;
      const seenKey = `premium_onboarding_seen_${user.id}`;
      const hasSeenPremiumOnboarding = await AsyncStorage.getItem(seenKey);

      if (!isPremium && !hasSeenPremiumOnboarding) {
        console.log('📍 INDEX: Routing to /premium-onboarding');
        await AsyncStorage.setItem(seenKey, 'true');
        router.replace({ pathname: '/premium-onboarding', params: { from: 'onboarding' } } as any);
      } else {
        console.log('📍 INDEX: Routing to /(tabs)/home');
        router.replace('/(tabs)/home');
      }
    }).catch((error) => {
      console.log('📍 INDEX: Onboarding check failed, routing to /(tabs)/home', error);
      router.replace('/(tabs)/home');
    });
  }, [user, initialized, loading, hasCheckedWelcome]);

  // Reset routing flag when user changes
  useEffect(() => {
    hasRouted.current = false;
  }, [user?.id]);

  return null;
}

