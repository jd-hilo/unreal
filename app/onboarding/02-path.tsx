import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';

export default function OnboardingStep2() {
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
      const existingResponse = profile?.core_json?.onboarding_responses?.['02-path'];
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
        console.log('💾 Saving onboarding response for 02-path:', text.trim());
        const result = await saveOnboardingResponse(user.id, '02-path', text.trim());
        console.log('✅ Successfully saved onboarding response:', result);
      } catch (error) {
        console.error('❌ Failed to save onboarding response:', error);
        alert('Failed to save your response. Please try again.');
        return; // Don't navigate if save failed
      }
    }
    router.push('/relationships/add?onboarding=true');
  }

  return (
    <OnboardingScreen
      title="How did you get here?"
      progress={25}
      onNext={handleNext}
      canContinue={text.trim().length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.inputWrapper}>
        <Input
          placeholder="E.g., I grew up in a small town, went to college for business, landed my first job at a startup, and recently moved to pursue better opportunities..."
          value={text}
          onChangeText={setText}
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
      
        <Text style={styles.helperText}>
        The more information, the more accurate your digital twin will be.
        </Text>
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
  helperText: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.7)',
    marginTop: 16,
    fontWeight: '400',
  },
});
