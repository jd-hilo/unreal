import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function AvatarGenerationScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [name, setName] = useState('Friend');
  const [scaleAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - avatar');
    }, [])
  );

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  async function loadProfile() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.first_name) {
        setName(profile.first_name);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async function handleContinue() {
    if (!user) {
      router.replace('/onboarding/complete');
      return;
    }

    const avatarVariant = 'beam';
    const avatarColors = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];
    const avatarReason = "This unique gradient signature is generated from your biometric data and decision patterns. It represents the core of your digital twin.";

    try {
      await updateProfileFields(user.id, {
        avatar_variant: avatarVariant,
        avatar_colors: avatarColors,
        avatar_reason: avatarReason,
      });

      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'avatar',
        step_name: 'Avatar Generated'
      });

      router.replace('/onboarding/complete');
    } catch (error) {
      console.error('Failed to save avatar:', error);
      // Still continue even if save fails
      router.replace('/onboarding/complete');
    }
  }

  return (
    <OnboardingScreen
      title="Meet your digital twin"
      subtitle=""
      progress={0.95}
      onNext={handleContinue}
      nextLabel="Continue"
    >
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.avatarContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          <View style={styles.avatarWrapper}>
            <Avatar 
              name={name} 
              size={200} 
              variant="beam" 
              colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: opacityAnim }]}>
          <Text style={styles.mysteryText}>
            This unique gradient signature is generated from your biometric data and decision patterns. It represents the core of your digital twin.
          </Text>
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  avatarContainer: {
    marginBottom: 40,
    shadowColor: Colors.gradients.purple[0],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarWrapper: {
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    paddingHorizontal: 20,
  },
  mysteryText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: Fonts.primary.regular,
    fontStyle: 'italic',
  },
});

