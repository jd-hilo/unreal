import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { View, StyleSheet } from 'react-native';

export default function OnboardingStep6() {
  const router = useRouter();
  const [text, setText] = useState('');

  function handleNext() {
    router.push('/onboarding/07-clarifier');
  }

  return (
    <OnboardingScreen
      title="When things get hard, how do you usually react?"
      progress={84}
      onNext={handleNext}
    >
      <View style={styles.container}>
        <Input
          placeholder="Tell me about your stress responses..."
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
