import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';

export default function OnboardingStep4() {
  const router = useRouter();
  const [text, setText] = useState('');

  function handleNext() {
    router.push('/onboarding/05-day');
  }

  return (
    <OnboardingScreen
      title="How do you usually make big decisions?"
      progress={56}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="Describe your decision-making style..."
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
