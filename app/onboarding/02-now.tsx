import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse } from '@/lib/storage';

export default function OnboardingStep2() {
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
      const existingResponse = profile?.core_json?.onboarding_responses?.['01-now'] || profile?.core_json?.onboarding_responses?.['02-now'];
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
        console.log('💾 Saving onboarding response for 02-now:', text.trim());
        const result = await saveOnboardingResponse(user.id, '02-now', text.trim());
        console.log('✅ Successfully saved onboarding response:', result);
      } catch (error) {
        console.error('❌ Failed to save onboarding response:', error);
        alert('Failed to save your response. Please try again.');
        return; // Don't navigate if save failed
      }
    }
    router.push('/onboarding/02-path');
  }

  function handleBack() {
    router.back();
  }

  return (
    <OnboardingScreen
      title="Tell us about your current situation"
      progress={50}
      onNext={handleNext}
      canContinue={text.trim().length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['#4169E1', '#1E40AF', '#1E3A8A']}
      progressBarGradient={['#4A90E2', '#357ABD', '#2E6DA4']}
      buttonShadowColor="#4169E1"
    >
      <View style={styles.inputWrapper}>
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

