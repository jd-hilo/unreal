import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { trackEvent } from '@/lib/mixpanel';

export default function DreamNetWorth() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - dream-self-net-worth');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.dream_vision?.net_worth_goal) {
        setValue(profile.dream_vision.net_worth_goal);
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
        dream_vision: { ...dreamVision, net_worth_goal: value }
      });
    }
    router.push('/onboarding/dream-self/02-career');
  }

  return (
    <OnboardingScreen
      title="What is your dream net worth?"
      progress={0.1}
      onNext={handleNext}
      canContinue={!loading}
    >
      <View style={styles.form}>
        <FloatingLabelInput
          label="Dream Net Worth"
          value={value}
          onChangeText={setValue}
          placeholder="e.g. $10M, Financial Freedom"
          autoFocus={true}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 20 },
});
