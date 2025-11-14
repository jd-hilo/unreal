import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';
import { HomeGradientIcon, UserGradientIcon } from '@/components/GradientIcons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
        lazy: true,
        // Avoid aggressive unmounting to prevent focus/unfocus loops
        detachInactiveScreens: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(150, 150, 150, 0.8)',
        sceneStyle: { backgroundColor: '#0C0C10' },
        sceneContainerStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 32,
          height: 90,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarBackground: () => (
          <View 
            style={{
              ...StyleSheet.absoluteFillObject,
              overflow: 'hidden',
            }}
          >
            <View 
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: '#0D0E12',
              }}
            />
            <View 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: 'rgba(17, 19, 24, 0.9)',
              }}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          // Keep screen mounted to prevent churn
          unmountOnBlur: false,
          tabBarIcon: ({ focused, size }) => 
            focused ? (
              <HomeGradientIcon size={size} />
            ) : (
              <Home size={size} color="rgba(150, 150, 150, 0.8)" />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          unmountOnBlur: false,
          tabBarIcon: ({ focused, size }) => 
            focused ? (
              <UserGradientIcon size={size} />
            ) : (
              <User size={size} color="rgba(150, 150, 150, 0.8)" />
            ),
        }}
      />
    </Tabs>
  );
}
