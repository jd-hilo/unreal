import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { useAuth } from '@/store/useAuth';
import { updateProfileFields, saveOnboardingResponse } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Location from 'expo-location';

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

  const currentQuestion = currentQuestionIndex >= 0 ? ALL_QUESTIONS[currentQuestionIndex] : null;
  const isInitialQuestion = currentQuestionIndex === -1;
  const progress = wantsLocalRecs === null 
    ? 0.85 
    : wantsLocalRecs === false 
      ? 0.95 
      : 0.85 + (currentQuestionIndex + 1) / (ALL_QUESTIONS.length + 1) * 0.1;

  function handleInitialAnswer(answer: boolean) {
    setWantsLocalRecs(answer);
    if (!answer) {
      // User said No - route directly to premium onboarding
      router.replace('/premium-onboarding');
    } else {
      // User said Yes - start the questions
      setCurrentQuestionIndex(0);
    }
  }

  function handleQuestionAnswer(value: string) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }

  function handleOtherValueChange(value: string) {
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
      router.replace('/premium-onboarding');
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

      router.replace('/premium-onboarding');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still continue even if save fails
      router.replace('/premium-onboarding');
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
        buttonGradient={Colors.gradients.peach}
        progressBarGradient={Colors.gradients.peach}
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
        </View>
      </OnboardingScreen>
    );
  }

  if (requestingLocation) {
    return (
      <OnboardingScreen
        title="Requesting location access..."
        progress={0.95}
        loading={true}
        canContinue={false}
        buttonGradient={Colors.gradients.peach}
        progressBarGradient={Colors.gradients.peach}
      >
        <View style={styles.container}>
          <Text style={styles.loadingText}>
            We'll use your location to provide personalized recommendations nearby.
          </Text>
        </View>
      </OnboardingScreen>
    );
  }

  return (
    <OnboardingScreen
      title={currentQuestion.question}
      progress={progress}
      onNext={handleNext}
      nextLabel="Continue"
      canContinue={canContinue}
      buttonGradient={Colors.gradients.peach}
      progressBarGradient={Colors.gradients.peach}
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
});

