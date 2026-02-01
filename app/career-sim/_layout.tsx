import { Stack } from 'expo-router';

export default function CareerSimLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      }}
    >
      <Stack.Screen name="01-time-horizon" />
      <Stack.Screen name="02-current-role" />
      <Stack.Screen name="03-company" />
      <Stack.Screen name="04-salary" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
