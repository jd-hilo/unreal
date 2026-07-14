import { Tabs } from 'expo-router';
import { Home, MessageSquare, Zap, Trophy, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ManWhiteIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  return (
    <Image
      source={require('@/assets/images/manwhite.png')}
      style={{
        width: size,
        height: size,
        tintColor: color, // Black when focused, gray when unfocused
      }}
      resizeMode="contain"
    />
  );
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={80} tint="light" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            if (options.href === null) return null;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }
            };

            const Icon = options.tabBarIcon;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrapper, isFocused && styles.iconWrapperFocused]}>
                  {Icon && (
                    <Icon
                      focused={isFocused}
                      color={isFocused ? '#25729f' : Colors.textTertiary}
                      size={24}
                      fill={isFocused ? '#25729f' : 'none'}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textTertiary,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Home size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="decide"
        options={{
          title: 'Decide',
          tabBarIcon: ({ focused, color, size }) => (
            <MessageSquare size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="simulate"
        options={{
          title: 'Simulate',
          tabBarIcon: ({ focused, color, size }) => (
            <Zap size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          href: null,
          tabBarIcon: ({ focused, color, size }) => (
            <Trophy size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: 'Vibe',
          tabBarIcon: ({ focused, color, size }) => (
            <ManWhiteIcon size={size} color={color} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Twin',
          tabBarIcon: ({ focused, color, size }) => (
            <Sparkles size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    paddingHorizontal: 0,
  },
  tabBarBlur: {
    width: '100%',
    maxWidth: width * 0.69, // 15% increase from 60% (now 69% of screen width)
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // More transparent for glass effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Subtle glass border
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 76, // Reduced from 88
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    width: '100%',
  },
  tabItem: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 10, // Reduced padding
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperFocused: {
    backgroundColor: 'rgba(37, 114, 159, 0.14)',
  },
  activeDot: {
    display: 'none', // Remove the dot
  },
});
