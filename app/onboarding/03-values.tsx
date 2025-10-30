import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';

export default function OnboardingStep3() {
  const router = useRouter();
  const [text, setText] = useState('');

  function handleNext() {
    router.push('/onboarding/04-style');
  }

  return (
    <OnboardingScreen
      title="What matters most to you?"
      progress={42}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="What are your core values?"
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
