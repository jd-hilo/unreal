import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';

export default function BirthYearScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      const storedYear = profile?.core_json?.onboarding_responses?.['birth-year'];
      if (storedYear) {
        setSelectedYear(String(storedYear));
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  async function handleNext() {
    if (user && selectedYear) {
      try {
        const { saveOnboardingResponse } = await import('@/lib/storage');
        await saveOnboardingResponse(user.id, 'birth-year', selectedYear);
      } catch (error) {
        console.error('Failed to save birth year:', error);
      }
    }
    router.push('/onboarding/01-values-multiselect');
  }

  // Generate year options from current year down to 1950
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear; year >= 1950; year--) {
    years.push(String(year));
  }

  return (
    <OnboardingScreen
      title="What year were you born?"
      progress={5}
      onNext={handleNext}
      canContinue={selectedYear.length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.container}>
        <ChoiceQuestion
          question=""
          options={years}
          selectedValue={selectedYear}
          onSelect={setSelectedYear}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
});

