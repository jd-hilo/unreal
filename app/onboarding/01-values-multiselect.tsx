import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { MultiSelectValues } from '@/components/MultiSelectValues';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, saveOnboardingResponse } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function ValuesMultiselectScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      // Load from values_json if available
      if (profile?.values_json && Array.isArray(profile.values_json)) {
        setSelectedValues(profile.values_json);
      }
      // Load additional context from onboarding_responses if available
      const context = profile?.core_json?.onboarding_responses?.['values-context'];
      if (context) {
        setAdditionalContext(context);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  async function handleNext() {
    if (user) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { getProfile } = await import('@/lib/storage');
        
        // Get existing profile to preserve core_json
        const existingProfile = await getProfile(user.id);
        const existingCoreJson = existingProfile?.core_json || {};
        
        // Update core_json with core_values (always update, even if empty array)
        const updatedCoreJson = {
          ...existingCoreJson,
          core_values: selectedValues
        };
        
        // Save values_json and also save to core_json.core_values
        const { error, data } = await supabase
          .from('profiles')
          .update({ 
            values_json: selectedValues,
            core_json: updatedCoreJson
          } as any)
          .eq('user_id', user.id)
          .select();
        
        if (error) {
          console.error('❌ Failed to save values to profile:', error);
          throw error;
        }
        
        console.log('✅ Saved values_json and core_json.core_values:', {
          values_json: selectedValues,
          core_values: updatedCoreJson.core_values,
          updatedProfile: data?.[0]
        });
        
        // Save values and context temporarily for AI summarization
        if (selectedValues.length > 0 || additionalContext.trim()) {
          const valuesData = {
            values: selectedValues,
            context: additionalContext.trim(),
          };
          await saveOnboardingResponse(user.id, 'values-data', JSON.stringify(valuesData));
        }
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '01-values-multiselect',
          step_name: 'Values'
        });
      } catch (error) {
        console.error('Failed to save values:', error);
      }
    }
    router.push('/onboarding/01-now-group');
  }

  function toggleValue(value: string) {
    setSelectedValues((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      } else {
        return [...prev, value];
      }
    });
  }

  return (
    <OnboardingScreen
      title="What matters most to you?"
      progress={0.35}
      onNext={handleNext}
      canContinue={selectedValues.length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.container}>
        <MultiSelectValues
          selectedValues={selectedValues}
          onToggleValue={toggleValue}
          additionalContext={additionalContext}
          onAdditionalContextChange={setAdditionalContext}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

