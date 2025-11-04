import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform } from 'react-native';

// Conditionally import liquid-glass only on iOS
let LiquidGlassView: any;
let isLiquidGlassSupported = false;

if (Platform.OS === 'ios') {
  try {
    const liquidGlass = require('@callstack/liquid-glass');
    LiquidGlassView = liquidGlass.LiquidGlassView;
    isLiquidGlassSupported = liquidGlass.isLiquidGlassSupported;
  } catch (e) {
    // Fallback if module not available
    console.log('Liquid glass not available, using blur fallback');
  }
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: 10,
          height: 64,
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          borderRadius: 18,
          overflow: 'hidden',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarBackground: () => {
          // Use liquid glass on iOS 26+ with native build, otherwise use BlurView
          if (isLiquidGlassSupported && LiquidGlassView) {
            return (
              <LiquidGlassView
                style={StyleSheet.absoluteFill}
                interactive
                effect="regular"
                tintColor="rgba(59, 37, 109, 0.3)"
              />
            );
          }
          
          return (
            <BlurView 
              tint="dark" 
              intensity={80} 
              style={StyleSheet.absoluteFill} 
            />
          );
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
