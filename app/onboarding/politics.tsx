import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors } from '@/constants/Theme';

export default function PoliticsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedValue, setSelectedValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - politics');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.political_views) {
        setSelectedValue(profile.political_views);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  async function handleNext() {
    if (user && selectedValue) {
      try {
        await updateProfileFields(user.id, {
          political_views: selectedValue,
        });
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: 'politics',
          step_name: 'Political Views'
        });
      } catch (error) {
        console.error('Failed to save political views:', error);
      }
    }
    router.push('/onboarding/local-preferences');
  }

  return (
    <OnboardingScreen
      title="What are your political views?"
      progress={0.8125}
      onNext={handleNext}
      canContinue={selectedValue.length > 0}
    >
      <View style={styles.container}>
        <ChoiceQuestion
          question=""
          options={['Far right', 'Slightly right', 'Moderate', 'Slightly left', 'Far left']}
          selectedValue={selectedValue}
          onSelect={setSelectedValue}
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

