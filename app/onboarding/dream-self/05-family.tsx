import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { trackEvent } from '@/lib/mixpanel';

export default function DreamFamily() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - dream-self-family');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.dream_vision?.family_plans) {
        setValue(profile.dream_vision.family_plans);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    if (user) {
      const profile = await getProfile(user.id);
      const dreamVision = profile?.dream_vision || {};
      await updateProfileFields(user.id, {
        dream_vision: { ...dreamVision, family_plans: value }
      });
    }
    router.push('/onboarding/dream-self/06-home');
  }

  return (
    <OnboardingScreen
      title="What are your dream family plans?"
      progress={0.5}
      onNext={handleNext}
      canContinue={!loading}
    >
      <View style={styles.form}>
        <FloatingLabelInput
          label="Family Plans"
          value={value}
          onChangeText={setValue}
          placeholder="e.g. 2 kids, living near parents"
          autoFocus={true}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 20 },
});
