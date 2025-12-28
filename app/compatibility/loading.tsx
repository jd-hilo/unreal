import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { calculateCompatibility, saveCompatibilityTest } from '@/lib/compatibility';
import { useAuth } from '@/store/useAuth';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

const LOADING_STEPS = [
  "Finding twin... 🔍",
  "Analyzing profiles... 🧠",
  "Checking values... 💎",
  "Running simulation... 🌀",
  "Calculating match... ⚡️",
  "Finalizing... ✨"
];

export default function CompatibilityLoadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ twinUserId: string; twinName: string; twinCode: string }>();
  const user = useAuth((state) => state.user);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Rotation animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotate.start();

    // Loading steps
    const stepInterval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    // Start compatibility calculation after a short delay
    const calculationTimeout = setTimeout(() => {
      runCompatibilityTest();
    }, 2000);

    return () => {
      pulse.stop();
      rotate.stop();
      clearInterval(stepInterval);
      clearTimeout(calculationTimeout);
    };
  }, []);

  async function runCompatibilityTest() {
    if (!user || !params.twinUserId) return;

    try {
      // Calculate compatibility
      const result = await calculateCompatibility(user.id, params.twinUserId);

      // Save to database
      const testId = await saveCompatibilityTest({
        userId1: user.id,
        userId2: params.twinUserId,
        compatibilityScore: result.score,
        breakdown: result.breakdown,
      });

      // Track completion
      trackEvent(MixpanelEvents.COMPATIBILITY_TEST_COMPLETED, {
        test_id: testId,
        compatibility_score: result.score,
        twin_user_id: params.twinUserId,
      });

      // Navigate to results
      router.replace(`/compatibility/${testId}`);
    } catch (error) {
      console.error('Failed to calculate compatibility:', error);
      // Navigate back on error
      router.back();
    }
  }

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingScreen}>
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContent}>
            {/* Animated Orb */}
            <View style={styles.orbContainer}>
              <Animated.View
                style={[
                  styles.orbOuter,
                  {
                    transform: [
                      { scale: pulseAnim },
                      { rotate: rotateInterpolate },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={Colors.gradients.turquoise}
                  style={styles.orbGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>
              <View style={styles.orbInner}>
                <View style={styles.cubeShadowWrapper}>
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.loadingCubeIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Loading Text */}
            <View style={styles.textContainer}>
              <Text style={styles.loadingText}>Running analysis...</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusBlur}>
                  <Text style={styles.statusText}>
                    {LOADING_STEPS[loadingStepIndex] || LOADING_STEPS[LOADING_STEPS.length - 1]}
                  </Text>
                </View>
              </View>
            </View>

            {/* Loading Dots */}
            <View style={styles.dotsContainer}>
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: Colors.textSecondary,
                      transform: [
                        {
                          scale: pulseAnim.interpolate({
                            inputRange: [1, 1.05],
                            outputRange: [1, 1.2],
                          }),
                        },
                      ],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.05],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingSafeArea: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  orbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  orbOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  orbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  cubeShadowWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingCubeIcon: {
    width: 60,
    height: 60,
    opacity: 0.9,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Fonts.secondary.bold,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBlur: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  statusText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
});
