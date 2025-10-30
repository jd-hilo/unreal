import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';

export default function OnboardingStep2() {
  const router = useRouter();
  const [text, setText] = useState('');

  function handleNext() {
    router.push('/onboarding/03-values');
  }

  return (
    <OnboardingScreen
      title="How did you get here?"
      progress={28}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="Share your journey..."
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
