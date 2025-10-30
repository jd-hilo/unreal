import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';

export default function OnboardingStep5() {
  const router = useRouter();
  const [text, setText] = useState('');

  function handleNext() {
    router.push('/onboarding/06-stress');
  }

  return (
    <OnboardingScreen
      title="Walk me through a typical day"
      progress={70}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="What does a normal day look like for you?"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={styles.input}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  input: {
    minHeight: 150,
  },
});
