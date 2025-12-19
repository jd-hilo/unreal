import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, TextInput, Keyboard, Animated, Easing } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { Button } from '@/components/Button';
import { ArrowLeft, ChevronRight, Lightbulb, GraduationCap, MapPin, Briefcase } from 'lucide-react-native';
import { insertWhatIf } from '@/lib/storage';
import { runWhatIf } from '@/lib/ai';
import { getProfile, getRelationships } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { computeScenarioAlignment } from '@/lib/relevance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';

export default function NewWhatIfScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const user = useAuth((state) => state.user);
  const [whatIfText, setWhatIfText] = useState(params.scenario || '');
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scenarioInputRef = useRef<TextInput>(null);
  const hasAutoSubmitted = useRef(false);

  const LOADING_STEPS = [
    "Exploring your scenario...",
    "Analyzing your profile...",
    "Building alternate reality...",
    "Consulting your twin...",
    "Calculating metrics...",
    "Finalizing your alternate life..."
  ];

  // Pre-fill scenario from query params and auto-submit if provided
  useEffect(() => {
    if (params.scenario && params.scenario.trim() && !hasAutoSubmitted.current && user) {
      hasAutoSubmitted.current = true;
      setWhatIfText(params.scenario);
      // Auto-submit after a short delay, passing the scenario directly
      const timer = setTimeout(() => {
        // Ensure we have the text before submitting
        if (params.scenario && params.scenario.trim()) {
          handleSubmit(params.scenario);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [params.scenario, user]);

  // Auto-focus input when screen loads (only if no pre-filled scenario)
  useEffect(() => {
    if (!params.scenario) {
      const timer = setTimeout(() => {
        scenarioInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [params.scenario]);

  // Loading animation and steps
  useEffect(() => {
    if (loading) {
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

      // Update loading steps
      const interval = setInterval(() => {
        setLoadingStepIndex((prev) => {
          if (prev < LOADING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);
      
      return () => {
        clearInterval(interval);
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
      };
    }
  }, [loading]);

  // Keyboard listeners to position button over keyboard
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  async function handleSubmit(textOverride?: string) {
    const textToUse = textOverride || whatIfText;
    if (!user || !textToUse.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
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
      
      // If user has a partner/spouse, override relationshipStatus to "in a relationship"
      const hasPartner = (relationships || []).some((r: any) => {
        const type = (r?.relationship_type || '').toLowerCase();
        return type === 'partner' || type === 'spouse';
      });
      if (hasPartner) {
        currentBiometrics.relationshipStatus = 'in a relationship';
      }
      
      // Debug: Log what baseline summary is being sent to AI
      console.log('===== WHAT-IF DEBUG =====');
      console.log('Current biometrics:', currentBiometrics);
      console.log('Baseline summary being sent to AI:');
      console.log(baselineSummary);
      console.log('========================');

      const result = await runWhatIf(baselineSummary, textToUse, currentBiometrics, profile);

      // Compute Scenario-specific Alignment Score (varies per What-If)
      let twinAlignmentScore: number | null = null;
      try {
        console.log('===== SCENARIO ALIGNMENT DEBUG =====');
        console.log('User ID:', user.id);
        twinAlignmentScore = await computeScenarioAlignment(user.id, result.summary, result.metrics, result.biometrics);
        console.log('Scenario Alignment Score:', twinAlignmentScore);
        console.log('====================================');
      } catch (e) {
        console.warn('Failed to compute scenario alignment:', e);
      }

      const whatIfData = await insertWhatIf(user.id, {
        counterfactual_type: 'general',
        payload: { 
          question: whatIfText,
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

      // Track what-if created
      trackEvent(MixpanelEvents.WHAT_IF_CREATED, {
        what_if_id: whatIfData.id,
        has_biometrics: !!result.biometrics
      });

      router.push(`/whatif/${whatIfData.id}`);
    } catch (error) {
      console.error('What-if error:', error);
      alert('Failed to process what-if scenario');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitPress() {
    handleSubmit();
  }

  const canSubmit = whatIfText.trim();

  // Loading screen
  if (loading) {
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
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.loadingCubeIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Exploring your alternate life...</Text>
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
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>
                <Text style={styles.greetingRest}>What if?</Text>
              </Text>
              <Text style={styles.greetingSubtext}>See your alternate life</Text>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 120 }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Scenario Input */}
              <View style={styles.section}>
                <FloatingLabelInput
                  ref={scenarioInputRef}
                  label="Your scenario"
                  value={whatIfText}
                  onChangeText={setWhatIfText}
                  multiline
                  placeholder="What if I..."
                  returnKeyType="done"
                  containerStyle={styles.scenarioInput}
                  style={styles.scenarioInputText}
                />
              </View>

              {/* Example Scenarios */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Lightbulb size={18} color={Colors.textSecondary} />
                  <Text style={styles.sectionLabel}>Try these examples</Text>
                </View>

                <View style={styles.examplesGrid}>
                  <TouchableOpacity
                    style={styles.exampleCard}
                    onPress={() => setWhatIfText('What if I had studied engineering instead of my current major?')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exampleCardBlur}>
                      <View style={styles.exampleIcon}>
                        <GraduationCap size={20} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.exampleContent}>
                        <Text style={styles.exampleTitle}>Different major</Text>
                        <Text style={styles.exampleDesc}>Academic path</Text>
                      </View>
                      <ChevronRight size={18} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exampleCard}
                    onPress={() => setWhatIfText('What if I had stayed in my hometown instead of moving?')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exampleCardBlur}>
                      <View style={styles.exampleIcon}>
                        <MapPin size={20} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.exampleContent}>
                        <Text style={styles.exampleTitle}>Different location</Text>
                        <Text style={styles.exampleDesc}>Where you live</Text>
                      </View>
                      <ChevronRight size={18} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exampleCard}
                    onPress={() => setWhatIfText('What if I had started my own business instead of working a corporate job?')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exampleCardBlur}>
                      <View style={styles.exampleIcon}>
                        <Briefcase size={20} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.exampleContent}>
                        <Text style={styles.exampleTitle}>Career path</Text>
                        <Text style={styles.exampleDesc}>Professional choice</Text>
                      </View>
                      <ChevronRight size={18} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Floating Action Button */}
            <View style={[styles.floatingButtonContainer, { bottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}>
              <TouchableOpacity
                onPress={handleSubmitPress}
                disabled={!canSubmit || loading}
                activeOpacity={0.9}
                style={[
                  styles.floatingButton,
                  (!canSubmit || loading) && styles.floatingButtonDisabled
                ]}
              >
                {canSubmit && !loading ? (
                  <LinearGradient
                    colors={Colors.gradients.turquoise}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.floatingButtonGradient,
                      styles.floatingButtonActiveBorder
                    ]}
                  >
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.cubeIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.floatingButtonText}>
                      Explore Timeline
                    </Text>
                    <ChevronRight 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                ) : (
                  <View style={styles.floatingButtonGradient}>
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.cubeIcon}
                      resizeMode="contain"
                    />
                    <Text style={[
                      styles.floatingButtonText,
                      styles.floatingButtonTextDisabled
                    ]}>
                      {loading ? 'Exploring...' : 'Explore Timeline'}
                    </Text>
                    {!loading && (
                      <ChevronRight 
                        size={20} 
                        color={Colors.textTertiary} 
                      />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
  },
  greetingRest: {
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  greetingSubtext: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: Fonts.secondary.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
  },
  scenarioInput: {
    marginTop: 4,
  },
  scenarioInputText: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 28,
    minHeight: 28,
  },
  examplesGrid: {
    gap: 12,
  },
  exampleCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  exampleCardBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  exampleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleContent: {
    flex: 1,
    flexShrink: 1,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
    flexShrink: 1,
    fontFamily: Fonts.secondary.bold,
  },
  exampleDesc: {
    fontSize: 13,
    color: Colors.textTertiary,
    flexShrink: 1,
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  floatingButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  floatingButtonDisabled: {
    opacity: 0.5,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  floatingButtonActiveBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  cubeIcon: {
    width: 22,
    height: 22,
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
});
