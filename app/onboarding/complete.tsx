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
import { buildCorePack } from '@/lib/relevance';
import { generateInterestingDecisionQuestions, generateInterestingWhatIfScenarios } from '@/lib/ai';
import { ActivityIndicator } from 'react-native';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [showButtons, setShowButtons] = useState(false);
  const [generatingDecide, setGeneratingDecide] = useState(false);
  const [generatingExplore, setGeneratingExplore] = useState(false);
  
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

  async function handleDecide() {
    if (!user || generatingDecide) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.ONBOARDING_COMPLETE_DECIDE_CLICKED);
    setGeneratingDecide(true);

    try {
      // Generate interesting questions based on user profile
      const corePack = await buildCorePack(user.id);
      const questions = await generateInterestingDecisionQuestions(corePack, 3);
      
      // Pass the first question as a pre-filled value
      const question = questions[0] || '';
      router.push(`/decision/new${question ? `?question=${encodeURIComponent(question)}` : ''}`);
    } catch (error) {
      console.error('Failed to generate decision questions:', error);
      // Still navigate even if generation fails
      router.push('/decision/new');
    } finally {
      setGeneratingDecide(false);
    }
  }

  async function handleExplore() {
    if (!user || generatingExplore) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.ONBOARDING_COMPLETE_EXPLORE_CLICKED);
    setGeneratingExplore(true);

    try {
      // Generate interesting scenarios based on user profile
      const corePack = await buildCorePack(user.id);
      const scenarios = await generateInterestingWhatIfScenarios(corePack, 3);
      
      // Pass the first scenario as a pre-filled value
      const scenario = scenarios[0] || '';
      router.push(`/whatif/new${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ''}`);
    } catch (error) {
      console.error('Failed to generate what-if scenarios:', error);
      // Still navigate even if generation fails
      router.push('/whatif/new');
    } finally {
      setGeneratingExplore(false);
    }
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
                >
                  <TouchableOpacity
                    onPress={handleDecide}
                    activeOpacity={0.8}
                    style={styles.button}
                    disabled={generatingDecide}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.buttonBlur}>
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          {generatingDecide ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Image 
                              source={require('@/assets/images/compass.png')}
                              style={styles.buttonIcon}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>Twin Decides for You</Text>
                          <Text style={styles.buttonSubtitle}>
                            {generatingDecide ? 'Generating questions...' : 'Make a choice, simulate outcomes'}
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
                >
                  <TouchableOpacity
                    onPress={handleExplore}
                    activeOpacity={0.8}
                    style={styles.button}
                    disabled={generatingExplore}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.buttonBlur}>
                      <View style={styles.buttonContent}>
                        <View style={styles.buttonIconContainer}>
                          {generatingExplore ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Image 
                              source={require('@/assets/images/star.png')}
                              style={styles.buttonIcon}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                        <View style={styles.buttonTextContainer}>
                          <Text style={styles.buttonTitle}>Explore alternate lives</Text>
                          <Text style={styles.buttonSubtitle}>
                            {generatingExplore ? 'Generating scenarios...' : 'See your alternate reality'}
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
    marginBottom: 60,
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
