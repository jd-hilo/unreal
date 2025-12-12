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
import { generateInterestingDecisionQuestions, generateInterestingWhatIfScenarios, deriveDecisionOptionsWithContext, predictDecision, runWhatIf } from '@/lib/ai';
import { insertDecision, updateDecisionPrediction, insertWhatIf, getProfile, getRelationships } from '@/lib/storage';
import { computeScenarioAlignment } from '@/lib/relevance';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [showButtons, setShowButtons] = useState(false);
  const [navigatingDecide, setNavigatingDecide] = useState(false);
  const [navigatingExplore, setNavigatingExplore] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const LOADING_STEPS = [
    'Creating your decision...',
    'Analyzing your profile...',
    'Building context...',
    'Consulting your twin...',
    'Calculating probabilities...',
    'Finalizing recommendation...'
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
  }, []);

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
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);
  };

  const stopLoadingTicker = () => {
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    loadingIntervalRef.current = null;
  };

  // Loading animation and steps
  useEffect(() => {
    if (showLoading) {
      setLoadingStepIndex(0);
      
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

      // Start rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      startLoadingTicker();
      
      return () => {
        stopLoadingTicker();
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
      };
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

  async function handleExplore() {
    console.log('handleExplore called', { user: !!user, navigatingExplore });
    if (!user) {
      console.warn('No user found');
      return;
    }
    if (navigatingExplore) {
      console.log('Already navigating');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.ONBOARDING_COMPLETE_EXPLORE_CLICKED);
    setNavigatingExplore(true);
    setShowLoading(true);
    startLoadingTicker();

    try {
      // Generate interesting scenarios based on user profile
      const corePack = await buildCorePack(user.id);
      const scenarios = await generateInterestingWhatIfScenarios(corePack, 3);
      const scenario = scenarios[0] || 'What if I made a different choice?';
      
      // Get profile data for what-if processing
      const profile = await getProfile(user.id);
      const baselineSummary = profile?.narrative_summary || 'No profile data available';
      const relationships = await getRelationships(user.id);
      
      // Extract current biometric values from profile
      const currentBiometrics: {
        location?: string | null;
        netWorth?: string | null;
        relationshipStatus?: string | null;
      } = {
        location: profile?.current_location || profile?.core_json?.city || null,
        netWorth: profile?.net_worth || null,
        relationshipStatus: profile?.core_json?.relationship_status || null,
      };
      
      // If user has a partner/spouse, override relationshipStatus
      const hasPartner = (relationships || []).some((r: any) => {
        const type = (r?.relationship_type || '').toLowerCase();
        return type === 'partner' || type === 'spouse';
      });
      if (hasPartner) {
        currentBiometrics.relationshipStatus = 'in a relationship';
      }
      
      // Run what-if analysis
      const result = await runWhatIf(baselineSummary, scenario, currentBiometrics, profile);
      
      // Compute Scenario-specific Alignment Score
      let twinAlignmentScore: number | null = null;
      try {
        twinAlignmentScore = await computeScenarioAlignment(user.id, result.summary, result.metrics, result.biometrics);
      } catch (e) {
        console.warn('Failed to compute scenario alignment:', e);
      }
      
      // Create what-if record
      const whatIfData = await insertWhatIf(user.id, {
        counterfactual_type: 'general',
        payload: { 
          question: scenario,
          chaosLevel: result.chaosLevel,
          chaosMessage: result.chaosMessage,
          newObsession: result.newObsession,
          timelineVibe: result.timelineVibe,
        },
        metrics: result.metrics,
        summary: result.summary,
        biometrics: result.biometrics,
        twinAlignmentScore: twinAlignmentScore ?? undefined,
      });
      
      trackEvent(MixpanelEvents.WHAT_IF_CREATED, {
        what_if_id: whatIfData.id,
        has_biometrics: !!result.biometrics
      });
      
      // Navigate directly to result
      router.replace(`/whatif/${whatIfData.id}`);
    } catch (error) {
      console.error('Failed to create what-if:', error);
      // Fallback to form screen if something fails
      router.push('/whatif/new');
    } finally {
      stopLoadingTicker();
      setShowLoading(false);
      setNavigatingExplore(false);
    }
  }

  const renderLoadingScreen = () => {
    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingScreen}>
        <LinearGradient
          colors={['#050505', '#0A0A0A', '#050505']}
          style={styles.loadingContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <StatusBar style="light" />
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
                    colors={['rgba(135, 206, 250, 0.2)', 'rgba(100, 181, 246, 0.1)', 'rgba(65, 105, 225, 0.05)']}
                    style={styles.orbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.orbInner}>
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.loadingCubeIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Asking your twin...</Text>
                <View style={styles.statusContainer}>
                  <BlurView intensity={20} tint="dark" style={styles.statusBlur}>
                    <Text style={styles.statusText}>
                      {LOADING_STEPS[loadingStepIndex] || LOADING_STEPS[LOADING_STEPS.length - 1]}
                    </Text>
                  </BlurView>
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
                        backgroundColor: '#87CEFA',
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
        </LinearGradient>
      </View>
    );
  };

  if (showLoading) {
    return renderLoadingScreen();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
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
                    <BlurView intensity={40} tint="dark" style={styles.buttonBlur} pointerEvents="box-none">
                      <View style={styles.buttonContent} pointerEvents="box-none">
                        <View style={styles.buttonIconContainer}>
                          <Image 
                            source={require('@/assets/images/compass.png')}
                            style={styles.buttonIcon}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>Twin Decides for You</Text>
                          <Text style={styles.buttonSubtitle}>
                            Make a choice, simulate outcomes
                          </Text>
                        </View>
                      </View>
                    </BlurView>
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
                      console.log('Explore button pressed');
                      handleExplore();
                    }}
                    activeOpacity={0.8}
                    style={styles.button}
                    disabled={navigatingExplore}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.buttonBlur} pointerEvents="box-none">
                      <View style={styles.buttonContent} pointerEvents="box-none">
                        <View style={styles.buttonIconContainer}>
                          <Image 
                            source={require('@/assets/images/star.png')}
                            style={styles.buttonIcon}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>Explore alternate lives</Text>
                          <Text style={styles.buttonSubtitle}>
                            See your alternate reality
                          </Text>
                        </View>
                      </View>
                    </BlurView>
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
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: '#050505',
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
    marginBottom: 100,
    alignItems: 'center',
  },
  typingText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
    marginTop: 20,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  statusText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
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
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 20,
  },
});

