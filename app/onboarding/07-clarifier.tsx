import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { useTwin } from '@/store/useTwin';
import { useAuth } from '@/store/useAuth';
import { completeOnboarding } from '@/lib/storage';

export default function OnboardingStep7() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setOnboardingComplete = useTwin((state) => state.setOnboardingComplete);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');

  async function handleComplete() {
    if (user) {
      try {
        await completeOnboarding(user.id, {
          university: answer1.trim() || undefined,
          hometown: answer2.trim() || undefined,
        });
        setOnboardingComplete(true);
        router.replace('/(tabs)/home');
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        // Still navigate even if save fails
        setOnboardingComplete(true);
        router.replace('/(tabs)/home');
      }
    } else {
      setOnboardingComplete(true);
      router.replace('/(tabs)/home');
    }
  }

  return (
    <OnboardingScreen
      title="Just a few quick details"
      progress={100}
      onNext={handleComplete}
      nextLabel="Get Started"
    >
      <View style={styles.container}>
        <Text style={styles.description}>
          Help us understand you better with these quick questions
        </Text>

        <Input
          label="What university did you attend?"
          placeholder="University name"
          value={answer1}
          onChangeText={setAnswer1}
        />

        <Input
          label="Where did you grow up?"
          placeholder="Hometown"
          value={answer2}
          onChangeText={setAnswer2}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
});
