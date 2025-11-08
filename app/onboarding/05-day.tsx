import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';

export default function OnboardingStep5() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [text, setText] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const existingResponse = profile?.core_json?.onboarding_responses?.['05-day'];
      if (existingResponse) {
        setText(existingResponse);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  async function handleNext() {
    if (user && text.trim()) {
      try {
        await saveOnboardingResponse(user.id, '05-day', text.trim());
      } catch (error) {
        console.error('Failed to save onboarding response:', error);
      }
    }
    router.push('/onboarding/06-stress');
  }

  return (
    <OnboardingScreen
      title="Walk me through a typical day"
      progress={62.5}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="What does a normal day look like for you?"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={styles.input}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  input: {
    minHeight: 150,
  },
});
