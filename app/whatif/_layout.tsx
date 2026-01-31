import { Stack } from 'expo-router';

export default function WhatIfLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      gestureEnabled: false,
      fullScreenGestureEnabled: false,
    }}>
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
