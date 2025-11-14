import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

export default function Index() {
  console.log('📍 INDEX: Component rendering');
  const router = useRouter();
  const { user, initialized, loading } = useAuth();
  const { checkOnboardingStatus } = useTwin();
  const hasRouted = useRef(false);

  useEffect(() => {
    console.log('📍 INDEX: useEffect running', { hasRouted: hasRouted.current, initialized, loading, hasUser: !!user });
    
    // Prevent multiple routing attempts
    if (hasRouted.current) {
      console.log('📍 INDEX: Already routed, skipping');
      return;
    }
    
    // Wait for auth to finish initializing before routing
    if (!initialized || loading) {
      console.log('📍 INDEX: Waiting for auth to initialize');
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
    checkOnboardingStatus(user.id).then(() => {
      const isComplete = useTwin.getState().onboardingComplete;
      console.log('📍 INDEX: Onboarding check complete', { isComplete });
      
      if (!isComplete) {
        console.log('📍 INDEX: Routing to /onboarding/00-name');
        router.replace('/onboarding/00-name');
      } else {
        console.log('📍 INDEX: Routing to /(tabs)/home');
        router.replace('/(tabs)/home');
      }
    }).catch((error) => {
      console.log('📍 INDEX: Onboarding check failed, routing to /(tabs)/home', error);
      // If check fails, just go to home
      router.replace('/(tabs)/home');
    });
  }, [user, initialized, loading]);

  // Reset routing flag when user changes
  useEffect(() => {
    hasRouted.current = false;
  }, [user?.id]);

  return null;
}

