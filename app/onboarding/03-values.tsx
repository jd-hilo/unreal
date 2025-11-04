import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';

export default function OnboardingStep3() {
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
      const existingResponse = profile?.core_json?.onboarding_responses?.['03-values'];
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
        await saveOnboardingResponse(user.id, '03-values', text.trim());
      } catch (error) {
        console.error('Failed to save onboarding response:', error);
      }
    }
    router.push('/relationships/add?onboarding=true');
  }

  return (
    <OnboardingScreen
      title="What matters most to you?"
      subtitle="Share your core values and what drives you"
      progress={75}
      onNext={handleNext}
      canContinue={text.trim().length > 0}
    >
      <View style={styles.inputCard}>
        <Input
          placeholder="E.g., Family and relationships are my top priority, followed by personal growth and making a meaningful impact. I value honesty and authenticity..."
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
