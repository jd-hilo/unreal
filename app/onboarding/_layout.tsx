import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="01-now" />
      <Stack.Screen name="02-path" />
      <Stack.Screen name="03-values" />
      <Stack.Screen name="04-style" />
      <Stack.Screen name="05-day" />
      <Stack.Screen name="06-stress" />
      <Stack.Screen name="07-clarifier" />
    </Stack>
  );
}
