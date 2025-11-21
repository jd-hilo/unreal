import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';

export default function OnboardingStep6() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedValue, setSelectedValue] = useState('');
  const [otherValue, setOtherValue] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const existingResponse = profile?.core_json?.onboarding_responses?.['06-stress'];
      if (existingResponse) {
        // Check if it's a choice or free text
        const options = [
          'I withdraw and need space',
          'I talk it out with someone',
          'I exercise or stay active',
          'I get anxious and overthink',
          'I stay calm and problem-solve',
          'I get emotional and cry',
          'Other'
        ];
        if (options.some(opt => existingResponse.includes(opt))) {
          setSelectedValue(existingResponse);
        } else {
          setSelectedValue('Other');
          setOtherValue(existingResponse);
        }
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  async function handleNext() {
    if (user) {
      try {
        const answer = selectedValue === 'Other' && otherValue.trim() 
          ? otherValue.trim() 
          : selectedValue;
        if (answer) {
          await saveOnboardingResponse(user.id, '06-stress', answer);
        }
      } catch (error) {
        console.error('❌ Failed to save onboarding response:', error);
      }
    }
    router.push('/onboarding/politics');
  }

  return (
    <OnboardingScreen
      title="When things get hard, how do you usually react?"
      progress={75}
      onNext={handleNext}
      canContinue={selectedValue.length > 0 && (selectedValue !== 'Other' || otherValue.trim().length > 0)}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.container}>
        <ChoiceQuestion
          question=""
          options={[
            'I withdraw and need space',
            'I talk it out with someone',
            'I exercise or stay active',
            'I get anxious and overthink',
            'I stay calm and problem-solve',
            'I get emotional and cry',
            'Other'
          ]}
          selectedValue={selectedValue}
          onSelect={setSelectedValue}
          otherValue={otherValue}
          onOtherChange={setOtherValue}
          placeholder="Describe how you handle stress..."
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
});
