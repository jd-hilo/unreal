import { create } from 'zustand';
import { isOnboardingComplete } from '@/lib/storage';

interface TwinState {
  twinAccuracy: number;
  isPremium: boolean;
  onboardingComplete: boolean;
  setTwinAccuracy: (accuracy: number) => void;
  setPremium: (premium: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  checkOnboardingStatus: (userId: string) => Promise<void>;
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
  onboardingComplete: false,

  setTwinAccuracy: (accuracy) => set({ twinAccuracy: accuracy }),
  setPremium: (premium) => set({ isPremium: premium }),
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

  calculateProgress: (completedCards: string[]) => {
    const total = completedCards.reduce((sum, card) => {
      return sum + (CARD_WEIGHTS[card] || 0);
    }, 0);

    const baseFromOnboarding = 30;
    return Math.min(100, baseFromOnboarding + total);
  },
}));
