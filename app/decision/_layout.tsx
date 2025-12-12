import { Stack } from 'expo-router';

export default function DecisionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }} 
      />
    </Stack>
  );
}
