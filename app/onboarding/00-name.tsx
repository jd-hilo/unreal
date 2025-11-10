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
    router.push('/onboarding/01-now');
  }

  return (
    <OnboardingScreen
      title="What's your first name?"
      subtitle="Help us personalize your experience"
      progress={0}
      onNext={handleNext}
      canContinue={firstName.trim().length > 0}
    >
      <View style={styles.inputCard}>
        <Input
          placeholder="Enter your first name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={handleNext}
          style={styles.input}
          containerStyle={styles.inputContainer}
        />
      </View>
      
      <View style={styles.helperCard}>
        <Text style={styles.helperText}>
          👋 We'll use this to make your AI twin feel more personal
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
    fontSize: 18,
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

