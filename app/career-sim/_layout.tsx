import { Stack } from 'expo-router';

export default function CareerSimLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="setup" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
