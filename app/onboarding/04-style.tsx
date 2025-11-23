import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function OnboardingStep4() {
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
      const existingResponse = profile?.core_json?.onboarding_responses?.['04-style'];
      if (existingResponse) {
        // Check if it's a choice or free text
        const options = ['Analytical', 'Intuitive', 'Collaborative', 'Quick', 'Other'];
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
          await saveOnboardingResponse(user.id, '04-style', answer);
        }
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '04-style',
          step_name: 'Decision Style'
        });
      } catch (error) {
        console.error('❌ Failed to save onboarding response:', error);
      }
    }
    router.push('/onboarding/06-stress');
  }

  return (
    <OnboardingScreen
      title="How do you usually make big decisions?"
      progress={60}
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
          options={['Analytical - I research and weigh pros/cons', 'Intuitive - I go with my gut', 'Collaborative - I discuss with others', 'Quick - I decide fast', 'Other']}
          selectedValue={selectedValue}
          onSelect={setSelectedValue}
          otherValue={otherValue}
          onOtherChange={setOtherValue}
          placeholder="Describe your decision-making style..."
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
