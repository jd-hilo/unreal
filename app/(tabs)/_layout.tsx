import { Tabs } from 'expo-router';
import { Home, Layers } from 'lucide-react-native';
import { HomeGradientIcon, SimulationsGradientIcon } from '@/components/GradientIcons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { useState, useEffect } from 'react';

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
  const user = useAuth((state) => state.user);
  const [abTestGroup, setAbTestGroup] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    async function fetchAbTestGroup() {
      if (user?.id) {
        try {
          const profile = await getProfile(user.id);
          setAbTestGroup(profile?.ab_test_group || null);
        } catch (error) {
          console.error('Failed to fetch AB test group:', error);
        }
      }
    }
    fetchAbTestGroup();
  }, [user?.id]);

  // Hide tab bar for group A users
  const shouldHideTabBar = abTestGroup === 'A';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(150, 150, 150, 0.8)',
        sceneStyle: { backgroundColor: '#0C0C10' },
        tabBarStyle: shouldHideTabBar ? {
          height: 0,
          opacity: 0,
          overflow: 'hidden',
        } : {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 32 : 16,
          height: Platform.OS === 'ios' ? 90 : 70,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
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
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderTopColor: 'rgba(17, 19, 24, 0.9)',
              }}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => 
            focused ? (
              <HomeGradientIcon size={size} />
            ) : (
              <Home size={size} color="rgba(150, 150, 150, 0.8)" />
            ),
        }}
      />
      <Tabs.Screen
        name="simulations"
        options={{
          title: 'Simulations',
          tabBarIcon: ({ focused, size }) => 
            focused ? (
              <SimulationsGradientIcon size={size} />
            ) : (
              <Layers size={size} color="rgba(150, 150, 150, 0.8)" />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
