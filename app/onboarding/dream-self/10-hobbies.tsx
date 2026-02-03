import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields, saveDailyTasks, getLocalDateString } from '@/lib/storage';
import { generateArchitectPlan } from '@/lib/ai';
import * as Haptics from 'expo-haptics';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function DreamHobbies() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.dream_vision?.hobbies_interests) {
        setValue(profile.dream_vision.hobbies_interests);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    if (!user || isBuilding) return;
    setIsBuilding(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const profile = await getProfile(user.id);
      const dreamVision = {
        ...(profile?.dream_vision || {}),
        hobbies_interests: value,
      };

      // 1. Save final vision and initial estimate
      await updateProfileFields(user.id, { 
        dream_vision: dreamVision,
        est_days_remaining: 365 // Initial baseline estimate
      });

      // 2. Generate Architect plan
      const tasks = await generateArchitectPlan(profile, dreamVision);

      // 3. Save generated tasks with today's date
      const today = getLocalDateString();
      const tasksWithDate = tasks.map(task => ({
        ...task,
        scheduled_date: today
      }));
      await saveDailyTasks(user.id, tasksWithDate);

      trackEvent(MixpanelEvents.STRATEGY_GENERATED, { type: 'dream_self' });

      // 4. Navigate to comparison
      router.push('/onboarding/dream-self/comparison');
    } catch (error) {
      console.error('Error building dream self:', error);
    } finally {
      setIsBuilding(false);
    }
  }

  return (
    <OnboardingScreen
      title="What are your dream hobbies?"
      progress={1.0}
      onNext={handleNext}
      nextLabel={isBuilding ? "Building..." : "Build My Dream Self"}
      loading={isBuilding}
      canContinue={!loading && !isBuilding}
    >
      <View style={styles.form}>
        <FloatingLabelInput
          label="Hobbies & Interests"
          value={value}
          onChangeText={setValue}
          placeholder="e.g. Learning piano, Sailing"
          autoFocus={true}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 20 },
});
