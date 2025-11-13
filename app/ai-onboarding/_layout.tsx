import { Stack } from 'expo-router';

export default function AIOnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="call" />
      <Stack.Screen name="review" />
    </Stack>
  );
}

