import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors } from '@/constants/Theme';

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
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '00-birth-year',
          step_name: 'Birth Year'
        });
      } catch (error) {
        console.error('Failed to save birth year:', error);
      }
    }
    router.push('/onboarding/01-values-multiselect');
  }

  // Generate year options from 2012 down to 1950
  const years: string[] = [];
  for (let year = 2012; year >= 1950; year--) {
    years.push(String(year));
  }

  return (
    <OnboardingScreen
      title="What year were you born?"
      progress={0.30}
      onNext={handleNext}
      canContinue={selectedYear.length > 0}
      buttonGradient={Colors.gradients.turquoise}
      progressBarGradient={Colors.gradients.turquoise}
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

