import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';

export default function PoliticsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedValue, setSelectedValue] = useState('');

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
      } catch (error) {
        console.error('Failed to save political views:', error);
      }
    }
    router.push('/onboarding/07-clarifier');
  }

  return (
    <OnboardingScreen
      title="What are your political views?"
      progress={81.25}
      onNext={handleNext}
      canContinue={selectedValue.length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
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

