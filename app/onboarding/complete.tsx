import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
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
  const loadingIntervalRef = useRef<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const LOADING_STEPS = [
    'Analyzing your past...',
    'Building desires...',
    'Instilling hometown values...',
    'Structuring decision patterns...',
    'Finalizing your digital twin...'
  ];
  
  // Button slide-up animations
  const button1Anim = useRef(new Animated.Value(100)).current;
  const button2Anim = useRef(new Animated.Value(100)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Typewriter effect for "Let's explore..."
  const { displayedLines, isComplete } = useTypewriter(["Let's explore..."], { speed: 50 });
  const displayText = displayedLines[0] || '';

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

    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setLoadingStepIndex((prev) => {
          if (prev < LOADING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 2000); // Slower interval for readability
  };

  const stopLoadingTicker = () => {
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = null;
    fadeAnim.setValue(0);
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
    setNavigatingDecide(true);
    setShowLoading(true);
    startLoadingTicker();
    
    try {
      // Generate question
      const corePack = await buildCorePack(user.id);
      const questions = await generateInterestingDecisionQuestions(corePack, 3);
      const question = questions[0] || 'Should I make this change?';

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
    return (
      <View style={[styles.loadingScreen, { backgroundColor: Colors.background }]}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingTextContainer}>
              <Animated.Text 
                style={[
                  styles.loadingText, 
                  { 
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0]
                      })
                    }]
                  }
                ]}
              >
                {LOADING_STEPS[loadingStepIndex]}
              </Animated.Text>
            </View>
          </View>
        </SafeAreaView>
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
                      router.push('/simulate/new?fromOnboarding=true');
                    }}
                    activeOpacity={0.8}
                    style={styles.button}
                  >
                    <View style={styles.buttonBlur}>
                      <View style={styles.buttonContent} pointerEvents="box-none">
                        <View style={styles.buttonIconContainer}>
                          <Image 
                            source={require('@/assets/images/star.png')}
                            style={[styles.buttonIcon, { tintColor: '#FFFFFF' }]}
                            resizeMode="contain"
                          />
                        </View>
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
    marginBottom: 40,
    alignItems: 'center',
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
    marginTop: 0,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
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
  loadingTextContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Fonts.primary.regular,
  },
  // Legacy styles kept for reference but unused
  orbContainer: { display: 'none' },
  orbOuter: { display: 'none' },
  orbGradient: { display: 'none' },
  orbInner: { display: 'none' },
  loadingCubeIcon: { display: 'none' },
  statusContainer: { display: 'none' },
  statusBlur: { display: 'none' },
  statusText: { display: 'none' },
  dotsContainer: { display: 'none' },
  dot: { display: 'none' },
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

