import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useTwin } from '@/store/useTwin';
import { useAuth } from '@/store/useAuth';
import { completeOnboarding, getProfile, saveOnboardingResponse } from '@/lib/storage';
import { trackEvent, MixpanelEvents, setUserProperty } from '@/lib/mixpanel';
import { summarizeOnboardingGroup, type OnboardingSummaryData } from '@/lib/ai';
import { useTypewriter } from '@/hooks/useTypewriter';
import * as Haptics from 'expo-haptics';

export default function OnboardingStep7() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setOnboardingComplete = useTwin((state) => state.setOnboardingComplete);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Typewriter animation for title
  const titleText = "it's time to create your digital twin";
  const { displayedLines: titleLines, isComplete: titleComplete } = useTypewriter(
    [titleText],
    { 
      speed: 15, // Super fast typing for rapid haptics
      onLineStart: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onCharTyped: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    }
  );
  
  // Cursor blink animation
  const cursorBlinkAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (!titleComplete) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorBlinkAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorBlinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      cursorBlinkAnim.setValue(1);
    }
  }, [titleComplete]);
  
  // Messages for creating digital twin
  const TWIN_MESSAGES = [
    "Loading desires...",
    "Analyzing situation...",
    "Mapping values...",
    "Understanding journey...",
    "Processing decisions...",
    "Building personality...",
    "Creating twin...",
    "Almost ready...",
  ];

  // Animation values for messages
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cycle through messages with fade in/out animation
  useEffect(() => {
    if (!isSummarizing) {
      // Reset when not loading
      setCurrentMessageIndex(0);
      messageOpacity.setValue(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const showNextMessage = (index: number) => {
      if (index >= TWIN_MESSAGES.length) {
        // Loop back to start
        setCurrentMessageIndex(0);
        showNextMessage(0);
        return;
      }

      // Fade in
      messageOpacity.setValue(0);
      setCurrentMessageIndex(index);
      
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Stay visible, then fade out
      timeoutRef.current = setTimeout(() => {
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          // Move to next message after fade out
          timeoutRef.current = setTimeout(() => {
            showNextMessage(index + 1);
          }, 100);
        });
      }, 1200); // Stay visible for 1.2 seconds
    };

    // Start showing messages
    showNextMessage(0);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isSummarizing]);

  async function handleComplete() {
    if (!user) {
      setOnboardingComplete(true);
      trackEvent(MixpanelEvents.ONBOARDING_COMPLETED);
      router.replace('/(tabs)/home');
      return;
    }

    setIsSummarizing(true);

    try {
      // Collect all onboarding data
      const profile = await getProfile(user.id);
      const responses = profile?.core_json?.onboarding_responses || {};

      // Parse stored data
      let valuesData: { values: string[]; context?: string } | undefined;
      if (responses['values-data']) {
        try {
          valuesData = JSON.parse(responses['values-data']);
        } catch (e) {
          // Ignore parse errors
        }
      }

      let lifeSituationData: any;
      if (responses['01-now-group']) {
        try {
          lifeSituationData = JSON.parse(responses['01-now-group']);
        } catch (e) {
          // Ignore parse errors
        }
      }

      let lifeJourneyData: any;
      if (responses['02-path-group']) {
        try {
          lifeJourneyData = JSON.parse(responses['02-path-group']);
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Get birth year from onboarding responses
      const birthYear = responses['birth-year'];
      // Get interests from life situation data
      let interestsData: string[] | undefined;
      if (lifeSituationData?.interests) {
        interestsData = lifeSituationData.interests;
      } else if (responses['interests']) {
        try {
          interestsData = JSON.parse(responses['interests']);
        } catch (e) {
          // If not JSON, ignore
        }
      }

      // Prepare summary data
      const summaryData: OnboardingSummaryData = {
        birthYear: birthYear ? String(birthYear) : undefined,
        values: valuesData ? {
          selected: valuesData.values || [],
          context: valuesData.context,
        } : undefined,
        lifeSituation: lifeSituationData,
        lifeJourney: lifeJourneyData,
        challenges: responses['challenges'],
        decisionStyle: responses['04-style'],
        interests: interestsData,
        stressHandling: responses['06-stress'],
      };

      // Generate AI summaries
      const summaries = await summarizeOnboardingGroup(summaryData);

      // Save summarized responses
      if (summaries['01-now']) {
        await saveOnboardingResponse(user.id, '01-now', summaries['01-now']);
      }
      if (summaries['02-path']) {
        await saveOnboardingResponse(user.id, '02-path', summaries['02-path']);
      }
      if (summaries['06-stress']) {
        await saveOnboardingResponse(user.id, '06-stress', summaries['06-stress']);
      }
      if (summaries['04-style']) {
        await saveOnboardingResponse(user.id, '04-style', summaries['04-style']);
      }
      if (summaries.interests && summaries.interests.length > 0) {
        await saveOnboardingResponse(user.id, 'interests', JSON.stringify(summaries.interests));
      }

      // Save values_json - preserve existing values_json if it exists, otherwise use AI summaries
      const { supabase } = await import('@/lib/supabase');
      const existingValuesJson = profile?.values_json || [];
      const existingCoreJson = profile?.core_json || {};
      const existingCoreValues = existingCoreJson.core_values || [];
      
      // Use AI summaries if available, otherwise preserve existing values
      const finalValuesJson = (summaries.values_json && summaries.values_json.length > 0) 
        ? summaries.values_json 
        : (existingValuesJson.length > 0 ? existingValuesJson : []);
      
      const finalCoreValues = finalValuesJson.length > 0 
        ? finalValuesJson 
        : (existingCoreValues.length > 0 ? existingCoreValues : []);
      
      // Update both values_json and core_json.core_values
      const updatedCoreJson = {
        ...existingCoreJson,
        core_values: finalCoreValues
      };
      
      await supabase
        .from('profiles')
        .update({ 
          values_json: finalValuesJson,
          core_json: updatedCoreJson
        } as any)
        .eq('user_id', user.id);

      // Get hometown and university from profile (already saved in life journey section)
      const hometown = profile?.hometown || lifeJourneyData?.hometown;
      const university = profile?.university || lifeJourneyData?.collegeName;
      
      // Complete onboarding (hometown and university should already be saved, but ensure they're set)
      await completeOnboarding(user.id, {
        university: university || undefined,
        hometown: hometown || undefined,
      });

      setOnboardingComplete(true);
      
      // Track onboarding completed
      trackEvent(MixpanelEvents.ONBOARDING_COMPLETED);
      setUserProperty('onboarding_complete', true);
      
      router.replace('/onboarding/complete');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsSummarizing(false);
      // Still try to complete without AI summary
      try {
        const profile = await getProfile(user.id);
        const hometown = profile?.hometown;
        const university = profile?.university;
        await completeOnboarding(user.id, {
          university: university || undefined,
          hometown: hometown || undefined,
        });
        setOnboardingComplete(true);
        trackEvent(MixpanelEvents.ONBOARDING_COMPLETED);
        router.replace('/onboarding/complete');
      } catch (e) {
        console.error('Failed to complete onboarding after error:', e);
      }
    }
  }

  // Create animated title component
  const animatedTitle = (
    <Text style={styles.animatedTitle}>
      {titleLines[0]}
      {!titleComplete && (
        <Animated.Text style={[styles.cursor, { opacity: cursorBlinkAnim }]}>
          |
        </Animated.Text>
      )}
    </Text>
  );

  return (
    <OnboardingScreen
      title={animatedTitle}
      progress={0.90}
      onNext={handleComplete}
      nextLabel={isSummarizing ? "Creating" : "Create Digital Twin"}
      loading={isSummarizing}
      canContinue={!isSummarizing}
      animatedButton={!isSummarizing}
    >
      {isSummarizing ? (
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.messageContainer,
              {
                opacity: messageOpacity,
              },
            ]}
          >
            <Text style={styles.loadingMessage}>
              {TWIN_MESSAGES[currentMessageIndex]}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    minHeight: 120,
    position: 'relative',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  animatedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 8,
  },
  cursor: {
    color: 'rgba(65, 105, 225, 0.9)',
    fontWeight: '400',
  },
});
