import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { updateProfileFields, getProfile, saveOnboardingResponse } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function OnboardingStep0() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExistingData();
    
    // Track onboarding started (first step)
    trackEvent(MixpanelEvents.ONBOARDING_STARTED);
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile?.first_name) {
        setFirstName(profile.first_name);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    if (user && firstName.trim()) {
      try {
        console.log('Saving first name:', firstName.trim());
        console.log('User ID:', user.id);
        
        // Only save to the first_name column - don't use saveOnboardingResponse
        // because it will overwrite and set first_name back to null
        const result = await updateProfileFields(user.id, { first_name: firstName.trim() });
        console.log('updateProfileFields result:', result);
        
        // Track onboarding step completed
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '00-name',
          step_name: 'Name'
        });
      } catch (error) {
        console.error('Failed to save first name:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    }
    router.push('/onboarding/00-birth-year');
  }

  return (
    <OnboardingScreen
      title="What's your first name?"
      progress={0}
      onNext={handleNext}
      canContinue={firstName.trim().length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.inputWrapper}>
        <Input
          placeholder="Enter name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus={true}
          returnKeyType="next"
          onSubmitEditing={handleNext}
          style={styles.input}
          containerStyle={styles.inputContainer}
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
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  helperText: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.7)',
    marginTop: 16,
    fontWeight: '400',
  },
});

