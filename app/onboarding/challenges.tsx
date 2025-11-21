import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, saveOnboardingResponse } from '@/lib/storage';

export default function ChallengesScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [challenges, setChallenges] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      const existingResponse = profile?.core_json?.onboarding_responses?.['challenges'];
      if (existingResponse) {
        setChallenges(existingResponse);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  async function handleNext() {
    if (user && challenges.trim()) {
      try {
        await saveOnboardingResponse(user.id, 'challenges', challenges.trim());
      } catch (error) {
        console.error('Failed to save challenges:', error);
      }
    }
    router.push('/onboarding/04-style');
  }

  return (
    <OnboardingScreen
      title="What are some of your biggest challenges right now?"
      progress={40}
      onNext={handleNext}
      canContinue={challenges.trim().length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.inputWrapper}>
        <Input
          placeholder="E.g., Balancing work and personal life, financial stress, career uncertainty, health concerns..."
          value={challenges}
          onChangeText={setChallenges}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          autoFocus={true}
          style={styles.input}
          containerStyle={styles.inputContainer}
          returnKeyType="done"
          blurOnSubmit={true}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 0,
    padding: 0,
  },
  input: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 20,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 120,
  },
});

