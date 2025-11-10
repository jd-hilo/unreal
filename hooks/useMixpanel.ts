import { useEffect } from 'react';
import { trackEvent, trackScreenView } from '@/lib/mixpanel';

/**
 * Hook to track screen views automatically
 */
export function useTrackScreen(screenName: string, properties?: Record<string, any>) {
  useEffect(() => {
    trackScreenView(screenName, properties);
  }, [screenName]);
}

/**
 * Hook to get tracking functions
 */
export function useMixpanel() {
  return {
    track: trackEvent,
    trackScreen: trackScreenView,
  };
}

