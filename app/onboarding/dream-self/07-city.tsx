import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { trackEvent } from '@/lib/mixpanel';

export default function DreamCity() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - dream-self-city');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.dream_vision?.dream_city) {
        setValue(profile.dream_vision.dream_city);
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
        dream_vision: { ...dreamVision, dream_city: value }
      });
    }
    router.push('/onboarding/dream-self/08-travel');
  }

  return (
    <OnboardingScreen
      title="Which city do you want to live in?"
      progress={0.7}
      onNext={handleNext}
      canContinue={!loading}
    >
      <View style={styles.form}>
        <FloatingLabelInput
          label="Dream City"
          value={value}
          onChangeText={setValue}
          placeholder="e.g. Tokyo, New York, Zurich"
          autoFocus={true}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 20 },
});
