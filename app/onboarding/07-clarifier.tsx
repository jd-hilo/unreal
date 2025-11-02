import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { useTwin } from '@/store/useTwin';
import { useAuth } from '@/store/useAuth';
import { completeOnboarding, getProfile } from '@/lib/storage';

export default function OnboardingStep7() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setOnboardingComplete = useTwin((state) => state.setOnboardingComplete);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const university = profile?.university || profile?.core_json?.onboarding_responses?.university;
      const hometown = profile?.hometown || profile?.core_json?.onboarding_responses?.hometown;
      if (university) setAnswer1(university);
      if (hometown) setAnswer2(hometown);
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

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
