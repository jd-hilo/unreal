import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse } from '@/lib/storage';

export default function OnboardingStep1() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const { getProfile } = await import('@/lib/storage');
      const profile = await getProfile(user.id);
      const existingResponse = profile?.core_json?.onboarding_responses?.['01-now'];
      if (existingResponse) {
        setText(existingResponse);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    if (user && text.trim()) {
      try {
        await saveOnboardingResponse(user.id, '01-now', text.trim());
      } catch (error) {
        console.error('Failed to save onboarding response:', error);
      }
    }
    router.push('/onboarding/02-path');
  }

  function handleBack() {
    router.back();
  }

  return (
    <OnboardingScreen
      title="Where are you in life right now?"
      subtitle="Help your AI twin understand your current situation"
      progress={12.5}
      onNext={handleNext}
      canContinue={text.trim().length > 0}
    >
      <View style={styles.inputCard}>
        <Input
          placeholder="E.g., I'm a software engineer at a tech startup, recently moved to a new city, and thinking about my career direction..."
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={styles.input}
          containerStyle={styles.inputContainer}
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>
      
      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          🎤 Tip: We recommend using voice transcription on your keyboard for easier input
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  inputCard: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 16,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 0,
  },
  input: {
    minHeight: 160,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(183, 149, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(200, 200, 200, 0.85)',
  },
});
