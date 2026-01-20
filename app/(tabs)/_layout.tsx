import { Tabs } from 'expo-router';
import { Home } from 'lucide-react-native';
import { HomeGradientIcon } from '@/components/GradientIcons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Theme';

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
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textTertiary,
        sceneStyle: { backgroundColor: Colors.background },
        tabBarStyle: {
          display: 'none',
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
                backgroundColor: Colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderTopColor: 'rgba(0, 0, 0, 0.1)',
              }}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
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
          gestureEnabled: false,
          tabBarIcon: ({ focused, size }) => 
            focused ? (
              <HomeGradientIcon size={size} />
            ) : (
              <Home size={size} color={Colors.textTertiary} />
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
