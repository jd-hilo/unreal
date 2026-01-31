import { Stack } from 'expo-router';

export default function CompatibilityLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      }}
    >
      <Stack.Screen name="info" />
      <Stack.Screen name="add-twin" />
      <Stack.Screen name="add-twin-form" />
      <Stack.Screen name="loading" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}









