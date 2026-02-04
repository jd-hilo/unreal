import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Image } from 'react-native';
import { useTypewriter } from '@/hooks/useTypewriter';
import { trackEvent, MixpanelEvents, trackScreenView } from '@/lib/mixpanel';
import { useAuth } from '@/store/useAuth';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { generateInterestingDecisionQuestions, deriveDecisionOptionsWithContext, predictDecision } from '@/lib/ai';
import { insertDecision, updateDecisionPrediction } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [showButtons, setShowButtons] = useState(false);
  const [navigatingDecide, setNavigatingDecide] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [loadingAction, setLoadingAction] = useState<'decide' | 'simulate' | null>(null);
  const loadingIntervalRef = useRef<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const DECIDE_LOADING_STEPS = [
    'Creating your decision...',
    'Analyzing your profile...',
    'Building context...',
    'Consulting your twin...',
    'Calculating probabilities...',
    'Finalizing recommendation...'
  ];

  const SIMULATE_LOADING_STEPS = [
    'Initializing timeline...',
    'Analyzing your current life...',
    'Mapping relationships...',
    'Setting up scenarios...',
    'Preparing simulations...',
    'Finalizing your timeline...'
  ];
  
  // Button slide-up animations
  const button1Anim = useRef(new Animated.Value(100)).current;
  const button2Anim = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Typewriter effect for "Let's explore..."
  const { displayedLines, isComplete } = useTypewriter(["Let's explore..."], { speed: 50 });
  const displayText = displayedLines[0] || '';

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - complete');
    }, [])
  );

  // Track screen view
  useEffect(() => {
    trackScreenView('Onboarding Complete', {});
    trackEvent(MixpanelEvents.ONBOARDING_COMPLETE_VIEWED);
  }, [user]);

  useEffect(() => {
    // Show buttons after typing completes
    if (isComplete) {
      setTimeout(() => {
        setShowButtons(true);
        Animated.parallel([
          Animated.timing(button1Anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(button2Anim, {
            toValue: 0,
            duration: 600,
            delay: 100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 500);
    }
  }, [isComplete]);

  const startLoadingTicker = () => {
    setLoadingStepIndex(0);
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = setInterval(() => {
      setLoadingStepIndex((prev) => {
        const maxIndex = (loadingAction === 'decide' ? DECIDE_LOADING_STEPS : SIMULATE_LOADING_STEPS).length - 1;
        if (prev < maxIndex) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);
  };

  const stopLoadingTicker = () => {
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = null;
    fadeAnim.setValue(0);
    pulseAnim.setValue(1);
    rotateAnim.setValue(0);
  };

  // Loading animation and steps
  useEffect(() => {
    if (showLoading) {
      startLoadingTicker();
      return () => stopLoadingTicker();
    }
  }, [showLoading]);

  async function handleDecide() {
    console.log('handleDecide called', { user: !!user, navigatingDecide });
    if (!user) {
      console.warn('No user found');
      return;
    }
    if (navigatingDecide) {
      console.log('Already navigating');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.ONBOARDING_COMPLETE_DECIDE_CLICKED);
    setLoadingAction('decide');
    setNavigatingDecide(true);
    setShowLoading(true);
    startLoadingTicker();
    
    try {
      // Generate question
      const corePack = await buildCorePack(user.id);
      const questions = await generateInterestingDecisionQuestions(corePack, 3);
      const question = (typeof questions[0] === 'string' ? questions[0] : questions[0]?.question) || 'Should I make this change?';

      // Derive options
      const options = await deriveDecisionOptionsWithContext(question, corePack);

      // Create decision
      const decision = await insertDecision(user.id, {
        question: question.trim(),
        options,
        status: 'pending',
      });

      trackEvent(MixpanelEvents.DECISION_CREATED, {
        decision_id: decision.id,
        num_options: options.length,
        has_participants: false,
        num_participants: 0
      });

      // Build packs and predict
      const relevancePack = await buildRelevancePack(user.id, question);
      const prediction = await predictDecision({
        corePack,
        relevancePack,
        question: question.trim(),
        options,
        participantCount: 1,
      });

      await updateDecisionPrediction(decision.id, prediction);

      trackEvent(MixpanelEvents.DECISION_ANALYZED, {
        decision_id: decision.id,
        predicted_option: prediction.prediction,
        confidence: Math.max(...Object.values(prediction.probs)),
        num_participants: 0
      });

      router.replace(`/decision/${decision.id}`);
    } catch (error) {
      console.error('Failed to create decision:', error);
      router.push('/decision/new?autoSubmit=true');
    } finally {
      stopLoadingTicker();
      setShowLoading(false);
      setNavigatingDecide(false);
    }
  }


  const renderLoadingScreen = () => {
    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const currentLoadingSteps = loadingAction === 'decide' ? DECIDE_LOADING_STEPS : SIMULATE_LOADING_STEPS;
    const mainText = loadingAction === 'decide' ? 'Asking your twin...' : 'Simulating the next year...';

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
                <Text style={styles.loadingText}>{mainText}</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusBlur}>
                    <Text style={styles.statusText}>
                      {currentLoadingSteps[loadingStepIndex] || currentLoadingSteps[currentLoadingSteps.length - 1]}
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
                              inputRange: [1, 1.1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                        opacity: pulseAnim.interpolate({
                          inputRange: [1, 1.1],
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
  };

  if (showLoading) {
    return renderLoadingScreen();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.container}>
            {/* Typing Text */}
            <View style={styles.textContainer}>
              <Text style={styles.typingText}>{displayText}</Text>
            </View>

            {/* Buttons */}
            {showButtons && (
              <View style={styles.buttonsContainer}>
                {/* Twin Decide for You */}
                <Animated.View
                  style={[
                    styles.buttonWrapper,
                    {
                      transform: [{ translateY: button1Anim }],
                      opacity: buttonOpacity,
                    },
                  ]}
                  pointerEvents="box-none"
                >
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Decide button pressed');
                      handleDecide();
                    }}
                    activeOpacity={0.8}
                    style={styles.button}
                    disabled={navigatingDecide}
                  >
                    <View style={styles.buttonBlur}>
                      <View style={styles.buttonContent} pointerEvents="box-none">
                        <View style={styles.buttonIconContainer}>
                          <Image 
                            source={require('@/assets/images/compass.png')}
                            style={[styles.buttonIcon, { tintColor: '#FFFFFF' }]}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>Decide for me</Text>
                          <Text style={styles.buttonSubtitle}>
                            Make a choice, simulate outcomes
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Explore alternate lives */}
                <Animated.View
                  style={[
                    styles.buttonWrapper,
                    {
                      transform: [{ translateY: button2Anim }],
                      opacity: buttonOpacity,
                    },
                  ]}
                  pointerEvents="box-none"
                >
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Simulate button pressed');
                      setLoadingAction('simulate');
                      setShowLoading(true);
                      startLoadingTicker();
                      // Small delay to show loading screen before navigation
                      setTimeout(() => {
                        router.push('/simulate/new?fromOnboarding=true');
                        stopLoadingTicker();
                        setShowLoading(false);
                        setLoadingAction(null);
                      }, 500);
                    }}
                    activeOpacity={0.8}
                    style={styles.button}
                  >
                    <View style={styles.buttonBlur}>
                      <View style={styles.buttonContent} pointerEvents="box-none">
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>Simulate your life</Text>
                          <Text style={styles.buttonSubtitle}>
                            Explore Alternate Realities
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  typingText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
    marginTop: 100,
  },
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
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  loadingCubeIcon: {
    width: 60,
    height: 60,
    opacity: 0.9,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
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
  },
  buttonWrapper: {
    width: '100%',
  },
  button: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonBlur: {
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  buttonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 32,
    height: 32,
  },
  buttonTextContainer: {
    flex: 1,
    gap: 4,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

