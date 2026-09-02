import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Animated, Image, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { useAuth } from '@/store/useAuth';
import { updateProfileFields, saveOnboardingResponse, getProfile } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useTypewriter } from '@/hooks/useTypewriter';
import { Sparkles, MapPin } from 'lucide-react-native';

// Conditionally import expo-location
let LocationModule: typeof Location | null = null;
try {
  LocationModule = require('expo-location');
} catch (e) {
  console.warn('expo-location not available');
}

interface Question {
  id: string;
  question: string;
  options: string[];
  category: 'food' | 'fun';
}

const FOOD_QUESTIONS: Question[] = [
  {
    id: 'diet',
    question: 'Diet preference?',
    options: [
      'No restrictions',
      'Vegetarian',
      'Vegan',
      'Pescatarian',
      'Flexitarian',
      'Other',
    ],
    category: 'food',
  },
  {
    id: 'flavor',
    question: 'Favorite flavor?',
    options: [
      'Sweet',
      'Salty/umami',
      'Spicy',
      'Sour/tangy',
      'Savory/herby',
      'Mix of flavors',
    ],
    category: 'food',
  },
  {
    id: 'texture',
    question: 'Preferred texture?',
    options: [
      'Crunchy/crisp',
      'Creamy/smooth',
      'Chewy',
      'Tender/soft',
      'No preference',
    ],
    category: 'food',
  },
  {
    id: 'cuisine',
    question: 'Go-to cuisine?',
    options: [
      'Italian',
      'Mexican/Latin',
      'Asian',
      'American/Comfort',
      'Mediterranean',
      'No preference',
    ],
    category: 'food',
  },
  {
    id: 'priority',
    question: 'What matters most?',
    options: [
      'Bold flavors',
      'Comfort food',
      'Healthy options',
      'Trying new things',
      'Quick & convenient',
    ],
    category: 'food',
  },
];

const FUN_QUESTIONS: Question[] = [
  {
    id: 'energy_level',
    question: 'Preferred energy level?',
    options: [
      'High-energy (parties, dancing)',
      'Medium-energy (busy bars, concerts)',
      'Low-key & relaxed',
      'Depends on mood',
      'Daytime activities',
    ],
    category: 'fun',
  },
  {
    id: 'social_style',
    question: 'Social style?',
    options: [
      'Big groups',
      'Small group of friends',
      'One-on-one',
      'Solo activities',
      'Mix of all',
    ],
    category: 'fun',
  },
  {
    id: 'activity_type',
    question: 'Favorite activity type?',
    options: [
      'Live music',
      'Dancing/clubbing',
      'Food & drinks',
      'Creative/cultural',
      'Active/outdoor',
      'Gaming/niche',
    ],
    category: 'fun',
  },
  {
    id: 'vibe',
    question: 'Music vibe?',
    options: [
      'Electronic/dance',
      'Hip-hop/R&B/pop',
      'Rock/indie',
      'Jazz/chill',
      'Latin/world',
      'No preference',
    ],
    category: 'fun',
  },
  {
    id: 'priority',
    question: 'What matters most?',
    options: [
      'New places',
      'Tried & true favorites',
      'Great music & atmosphere',
      'Good company',
      'Value for money',
      'Exclusive/VIP feel',
    ],
    category: 'fun',
  },
];

const ALL_QUESTIONS = [...FOOD_QUESTIONS, ...FUN_QUESTIONS];

export default function LocalPreferencesScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [wantsLocalRecs, setWantsLocalRecs] = useState<boolean | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [requestingLocation, setRequestingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - local-preferences');
    }, [])
  );

  const currentQuestion = currentQuestionIndex >= 0 ? ALL_QUESTIONS[currentQuestionIndex] : null;
  const isInitialQuestion = currentQuestionIndex === -1;
  const progress = wantsLocalRecs === null 
    ? 0.85 
    : wantsLocalRecs === false 
      ? 0.95 
      : 0.85 + (currentQuestionIndex + 1) / (ALL_QUESTIONS.length + 1) * 0.1;

  function handleInitialAnswer(answer: boolean) {
    setWantsLocalRecs(answer);
    trackEvent(MixpanelEvents.PERSONAL_RECOMMENDATIONS_SELECTED, {
      selected: answer ? 'yes' : 'no',
    });
    if (!answer) {
      // Twin summarization (07-clarifier) before twin-reveal
      router.replace('/onboarding/07-clarifier');
    } else {
      // User said Yes - start the questions
      setCurrentQuestionIndex(0);
    }
  }

  function handleQuestionAnswer(value: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }

  function handleOtherValueChange(value: string) {
    if (!currentQuestion) return;
    setOtherValues((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }

  function handleNext() {
    if (!currentQuestion) return;
    
    const currentAnswer = answers[currentQuestion.id];
    const otherValue = otherValues[currentQuestion.id];
    
    // Validate answer
    if (!currentAnswer || (currentAnswer === 'Other' && !otherValue?.trim())) {
      return;
    }

    // Move to next question - clear selection for next question
    if (currentQuestionIndex < ALL_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered, request location
      handleLocationRequest();
    }
  }

  async function handleLocationRequest() {
    if (!user) {
      router.replace('/onboarding/enable-notifications');
      return;
    }

    setRequestingLocation(true);

    try {
      let locationEnabled = false;
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (LocationModule) {
        try {
          const { status } = await LocationModule.requestForegroundPermissionsAsync();
          
          if (status === 'granted') {
            try {
              const location = await LocationModule.getCurrentPositionAsync({
                accuracy: LocationModule.Accuracy.Balanced,
              });
              latitude = location.coords.latitude;
              longitude = location.coords.longitude;
              locationEnabled = true;
            } catch (error) {
              console.warn('Failed to get location:', error);
            }
          }
        } catch (error) {
          console.warn('Failed to request location permission:', error);
        }
      }

      // Build food and fun preferences objects
      const foodPrefs: Record<string, string> = {};
      const funPrefs: Record<string, string> = {};

      FOOD_QUESTIONS.forEach((q) => {
        const answer = answers[q.id];
        if (answer) {
          const finalAnswer = answer === 'Other' && otherValues[q.id]?.trim()
            ? otherValues[q.id].trim()
            : answer;
          foodPrefs[q.id] = finalAnswer;
        }
      });

      FUN_QUESTIONS.forEach((q) => {
        const answer = answers[q.id];
        if (answer) {
          const finalAnswer = answer === 'Other' && otherValues[q.id]?.trim()
            ? otherValues[q.id].trim()
            : answer;
          funPrefs[q.id] = finalAnswer;
        }
      });

      // Save preferences to core_json.onboarding_responses (like other onboarding steps)
      const localPreferencesData = {
        food_preferences: Object.keys(foodPrefs).length > 0 ? foodPrefs : undefined,
        fun_preferences: Object.keys(funPrefs).length > 0 ? funPrefs : undefined,
        location_enabled: locationEnabled,
        last_known_latitude: latitude,
        last_known_longitude: longitude,
      };
      
      await saveOnboardingResponse(user.id, 'local-preferences', JSON.stringify(localPreferencesData));

      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'local-preferences',
        step_name: 'Local Preferences Collected',
        location_enabled: locationEnabled,
      });

      router.replace('/onboarding/07-clarifier');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      router.replace('/onboarding/07-clarifier');
    } finally {
      setRequestingLocation(false);
    }
  }

  // Calculate canContinue - button should be disabled until an option is selected
  const canContinue = React.useMemo(() => {
    if (isInitialQuestion) {
      return wantsLocalRecs !== null;
    }
    
    if (!currentQuestion || currentQuestionIndex < 0) {
      return false;
    }
    
    const questionId = currentQuestion.id;
    const answer = answers[questionId];
    
    // No answer selected yet - explicitly check for undefined/null/empty
    if (!answer || typeof answer !== 'string' || answer.trim() === '') {
      return false;
    }
    
    // If "Other" is selected, need text input
    if (answer === 'Other') {
      const otherValue = otherValues[questionId];
      return !!(otherValue && typeof otherValue === 'string' && otherValue.trim().length > 0);
    }
    
    // Valid answer selected
    return true;
  }, [isInitialQuestion, currentQuestion, currentQuestionIndex, answers, otherValues, wantsLocalRecs]);

  const { displayedLines, isComplete: typewriterComplete } = useTypewriter(
    ["Where should I go to dinner?"],
    { speed: 50 }
  );

  const mockResponseFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typewriterComplete && isInitialQuestion) {
      Animated.timing(mockResponseFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        delay: 500,
      }).start();
    }
  }, [typewriterComplete, isInitialQuestion]);

  if (isInitialQuestion) {
    return (
      <OnboardingScreen
        title="Get personalized local recommendations?"
        subtitle="We'll help you discover restaurants, bars, and activities nearby"
        progress={progress}
        onNext={() => {
          // Route based on selection when Continue is clicked
          if (wantsLocalRecs !== null) {
            handleInitialAnswer(wantsLocalRecs);
          }
        }}
        nextLabel="Continue"
        canContinue={canContinue}
      >
        <View style={styles.container}>
          <View style={styles.optionsContainer}>
            <ChoiceQuestion
              question=""
              options={['Yes', 'No']}
              selectedValue={wantsLocalRecs === true ? 'Yes' : wantsLocalRecs === false ? 'No' : ''}
              onSelect={(value) => {
                // Just set the selection, don't route yet
                setWantsLocalRecs(value === 'Yes');
              }}
            />
          </View>

          {/* iPhone Mockup Visualization */}
          <View style={styles.mockupContainer}>
            <View style={styles.iphoneFrame}>
              <View style={styles.iphoneScreen}>
                <View style={styles.iphoneNotch} />
                
                <ScrollView 
                  style={styles.mockResultScroll} 
                  contentContainerStyle={styles.mockResultContainer}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                >
                  {/* Mock Question Card */}
                  <View style={styles.mockHeaderCard}>
                    <Text style={styles.mockHeaderLabel}>Question</Text>
                    <Text style={styles.mockHeaderValue}>
                      {displayedLines[0]}
                    </Text>
                  </View>

                  <Animated.View style={{ opacity: mockResponseFade }}>
                    {/* Mock Prediction Card */}
                    <View style={styles.mockPredictionCard}>
                      <Text style={styles.mockPredictionLabel}>Recommended</Text>
                      <Text style={styles.mockPredictionValue}>L'Artusi</Text>
                      <Text style={styles.mockConfidence}>94% confidence</Text>
                    </View>

                    {/* Mock Rationale Card */}
                    <View style={styles.mockSectionCard}>
                      <Text style={styles.mockSectionTitle}>Why this choice?</Text>
                      <Text style={styles.mockRationale}>
                        Based on your preference for Italian cuisine and high-energy atmospheres, L'Artusi is a perfect match.
                      </Text>
                    </View>

                    {/* Mock Options Card */}
                    <View style={styles.mockSectionCard}>
                      <Text style={styles.mockSectionTitle}>All Options</Text>
                      <View style={styles.mockOptionRow}>
                        <Text style={styles.mockOptionName}>L'Artusi</Text>
                        <View style={styles.mockProbContainer}>
                          <View style={styles.mockProbBarBg}>
                            <LinearGradient
                              colors={Colors.gradients.turquoise}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.mockProbBar, { width: '94%' }]}
                            />
                          </View>
                          <Text style={styles.mockProbValue}>94%</Text>
                        </View>
                      </View>
                      <View style={styles.mockOptionRow}>
                        <Text style={styles.mockOptionName}>I Sodi</Text>
                        <View style={styles.mockProbContainer}>
                          <View style={styles.mockProbBarBg}>
                            <View style={[styles.mockProbBar, { width: '68%', backgroundColor: 'rgba(0,0,0,0.1)' }]} />
                          </View>
                          <Text style={styles.mockProbValue}>68%</Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </OnboardingScreen>
    );
  }

  if (requestingLocation) {
    return (
      <OnboardingScreen
        title="Requesting location access..."
        progress={0.95}
        onNext={() => {}}
        loading={true}
        canContinue={false}
      >
        <View style={styles.container}>
          <Text style={styles.loadingText}>
            We'll use your location to provide personalized recommendations nearby.
          </Text>
        </View>
      </OnboardingScreen>
    );
  }

  if (!currentQuestion) return null;

  return (
    <OnboardingScreen
      title={currentQuestion.question}
      progress={progress}
      onNext={handleNext}
      nextLabel="Continue"
      canContinue={canContinue}
      buttonGradient={Colors.gradients.peach}
    >
      <View style={styles.container}>
        <Text style={styles.progressText}>
          {currentQuestionIndex + 1} / {ALL_QUESTIONS.length}
        </Text>
        {currentQuestion && (
          <ChoiceQuestion
            question=""
            options={currentQuestion.options}
            selectedValue={answers[currentQuestion?.id] || ''}
            onSelect={handleQuestionAnswer}
            otherValue={otherValues[currentQuestion.id] || ''}
            onOtherChange={handleOtherValueChange}
            placeholder="Please specify..."
          />
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  optionsContainer: {
    marginTop: 16,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Fonts.secondary.regular,
  },
  mockupContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iphoneFrame: {
    width: 280,
    height: 480,
    backgroundColor: '#1a1a1a',
    borderRadius: 40,
    padding: 10,
    borderWidth: 4,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iphoneScreen: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Light gray background like the real app
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  iphoneNotch: {
    width: 120,
    height: 20,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    top: 0,
    left: 70,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    zIndex: 10,
  },
  mockResultScroll: {
    flex: 1,
  },
  mockResultContainer: {
    padding: 12,
    paddingTop: 32,
  },
  mockHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mockHeaderLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mockHeaderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mockPredictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mockPredictionLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  mockPredictionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  mockConfidence: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  mockSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mockSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  mockRationale: {
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textSecondary,
  },
  mockOptionRow: {
    marginBottom: 10,
  },
  mockOptionName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  mockProbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockProbBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  mockProbBar: {
    height: '100%',
    borderRadius: 2,
  },
  mockProbValue: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    minWidth: 25,
  },
});

