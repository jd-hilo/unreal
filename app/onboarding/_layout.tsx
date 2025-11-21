import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="choose-method" />
      <Stack.Screen name="00-name" />
      <Stack.Screen name="00-birth-year" />
      <Stack.Screen name="01-values-multiselect" />
      <Stack.Screen name="01-now-group" />
      <Stack.Screen name="02-path-group" />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="01-now" />
      <Stack.Screen name="02-path" />
      <Stack.Screen name="03-values" />
      <Stack.Screen name="04-style" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="06-stress" />
      <Stack.Screen name="politics" />
      <Stack.Screen name="07-clarifier" />
    </Stack>
  );
}
