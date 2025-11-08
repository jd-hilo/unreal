import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';

export default function OnboardingStep6() {
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
      const existingResponse = profile?.core_json?.onboarding_responses?.['06-stress'];
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
        await saveOnboardingResponse(user.id, '06-stress', text.trim());
      } catch (error) {
        console.error('Failed to save onboarding response:', error);
      }
    }
    router.push('/onboarding/07-clarifier');
  }

  return (
    <OnboardingScreen
      title="When things get hard, how do you usually react?"
      progress={75}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="Tell me about your stress responses..."
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
