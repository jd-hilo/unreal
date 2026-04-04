import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent } from '@/lib/mixpanel';
import { registerForPushNotifications } from '@/lib/notifications';

export default function EnableNotificationsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const cardSlideAnim = useRef(new Animated.Value(40)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - enable-notifications');
      Animated.parallel([
        Animated.spring(cardSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          delay: 200,
          damping: 18,
          stiffness: 160,
        }),
        Animated.timing(cardOpacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          delay: 200,
        }),
      ]).start();
    }, [])
  );

  async function handleEnable() {
    setIsProcessing(true);
    if (user) {
      await registerForPushNotifications(user.id);
    }
    setIsProcessing(false);
    router.replace('/onboarding/tool-teaser');
  }

  return (
    <OnboardingScreen
      title="Enable notifications to reach your dream self faster"
      subtitle="Get a daily nudge at 8am to complete your tasks and stay on track."
      progress={0.97}
      onNext={handleEnable}
      nextLabel="Enable Notifications"
      loading={isProcessing}
    >
      <Animated.View
        style={[
          styles.notificationWrapper,
          {
            transform: [{ translateY: cardSlideAnim }],
            opacity: cardOpacityAnim,
          },
        ]}
      >
        <Text style={styles.previewLabel}>Preview</Text>

        <View style={styles.lockScreenBg}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.lockTimeContainer}>
            <Text style={styles.lockTime}>8:00</Text>
            <Text style={styles.lockDate}>Thursday, February 27</Text>
          </View>

          <View style={styles.notificationBubble}>
            <View style={styles.notificationInner}>
              <View style={styles.notificationRow}>
                <View style={styles.appIconContainer}>
                  <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.appIcon}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.appName}>mora</Text>
                    <Text style={styles.notifTime}>now</Text>
                  </View>
                  <Text style={styles.notificationTitle}>Complete your tasks for today</Text>
                  <Text style={styles.notificationBody}>
                    Your dream self is waiting — take the next step.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  notificationWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockScreenBg: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 360,
    alignItems: 'center',
  },
  lockTimeContainer: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTime: {
    fontSize: 64,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  lockDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  notificationBubble: {
    width: '88%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  notificationInner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  appIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 9,
    overflow: 'hidden',
    flexShrink: 0,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.75)',
  },
  notifTime: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 1,
  },
  notificationBody: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.65)',
    lineHeight: 18,
  },
});
