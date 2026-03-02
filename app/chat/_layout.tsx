import { Stack } from 'expo-router';
import { Colors } from '@/constants/Theme';

const chatTheme = {
  dark: false,
  colors: {
    primary: '#25729f',
    background: Colors.background,
    card: Colors.background,
    text: Colors.textPrimary,
    border: 'rgba(0,0,0,0.1)',
    notification: '#25729f',
  },
};

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
      theme={chatTheme}
    />
  );
}
