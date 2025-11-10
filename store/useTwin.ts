import { create } from 'zustand';
import { isOnboardingComplete } from '@/lib/storage';
import { checkAndSyncPremiumStatus, getPremiumStatusFromSupabase } from '@/lib/revenuecat';

interface TwinState {
  twinAccuracy: number;
  isPremium: boolean;
  premiumLoading: boolean;
  onboardingComplete: boolean;
  setTwinAccuracy: (accuracy: number) => void;
  setPremium: (premium: boolean) => void;
  setPremiumLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  checkOnboardingStatus: (userId: string) => Promise<void>;
  checkPremiumStatus: (userId: string) => Promise<void>;
  calculateProgress: (completedCards: string[]) => number;
}

const CARD_WEIGHTS: Record<string, number> = {
  personality_quiz: 15,
  relationships: 15,
  career: 15,
  university: 5,
  location: 5,
  sexuality: 5,
  journal: 10,
};

export const useTwin = create<TwinState>((set) => ({
  twinAccuracy: 0,
  isPremium: false,
  premiumLoading: false,
  onboardingComplete: false,

  setTwinAccuracy: (accuracy) => set({ twinAccuracy: accuracy }),
  setPremium: (premium) => set({ isPremium: premium }),
  setPremiumLoading: (loading) => set({ premiumLoading: loading }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  
  checkOnboardingStatus: async (userId: string) => {
    try {
      const complete = await isOnboardingComplete(userId);
      set({ onboardingComplete: complete });
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      set({ onboardingComplete: false });
    }
  },

  checkPremiumStatus: async (userId: string) => {
    try {
      set({ premiumLoading: true });
      
      // Try to get status from RevenueCat and sync to Supabase
      const isPremium = await checkAndSyncPremiumStatus(userId);
      set({ isPremium, premiumLoading: false });
    } catch (error) {
      console.error('Failed to check premium status:', error);
      
      // Fallback: try to get from Supabase only
      try {
        const isPremium = await getPremiumStatusFromSupabase(userId);
        set({ isPremium, premiumLoading: false });
      } catch (fallbackError) {
        console.error('Failed to get premium status from Supabase:', fallbackError);
        set({ isPremium: false, premiumLoading: false });
      }
    }
  },

  calculateProgress: (completedCards: string[]) => {
    const total = completedCards.reduce((sum, card) => {
      return sum + (CARD_WEIGHTS[card] || 0);
    }, 0);

    const baseFromOnboarding = 30;
    return Math.min(100, baseFromOnboarding + total);
  },
}));
