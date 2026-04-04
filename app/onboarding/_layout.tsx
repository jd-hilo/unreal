import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
    }}>
      <Stack.Screen name="choose-method" />
      <Stack.Screen name="00-name" />
      <Stack.Screen name="00-birth-year" />
      <Stack.Screen name="00-gender" />
      <Stack.Screen name="motivate-reviews" />
      <Stack.Screen name="motivate-stats" />
      <Stack.Screen name="motivate-unique" />
      <Stack.Screen name="01-values-multiselect" />
      <Stack.Screen name="01-now-group" />
      <Stack.Screen name="02-path-group" />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="01-now" />
      <Stack.Screen name="02-path" />
      <Stack.Screen name="03-values" />
      <Stack.Screen name="04-style" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="career" />
      <Stack.Screen name="health" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="journey-preview" />
      <Stack.Screen name="signature" />
      <Stack.Screen name="tool-teaser" />
      <Stack.Screen name="06-stress" />
      <Stack.Screen name="politics" />
      <Stack.Screen name="enable-notifications" />
      <Stack.Screen name="07-clarifier" />
      <Stack.Screen name="local-preferences" />
      <Stack.Screen name="twin-reveal" />
    </Stack>
  );
}
