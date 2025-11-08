import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

export default function Index() {
  const router = useRouter();
  const { user, initialized, loading } = useAuth();
  const { checkOnboardingStatus } = useTwin();
  const hasRouted = useRef(false);

  useEffect(() => {
    // Prevent multiple routing attempts
    if (hasRouted.current) return;
    
    // Wait for auth to finish initializing before routing
    if (!initialized || loading) {
      return;
    }

    hasRouted.current = true;

    if (!user) {
      router.replace('/auth');
      return;
    }

    // Check onboarding and route
    checkOnboardingStatus(user.id).then(() => {
      const isComplete = useTwin.getState().onboardingComplete;
      if (!isComplete) {
        router.replace('/onboarding/00-name');
      } else {
        router.replace('/(tabs)/home');
      }
    }).catch(() => {
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

