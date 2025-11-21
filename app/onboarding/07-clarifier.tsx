import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useTwin } from '@/store/useTwin';
import { useAuth } from '@/store/useAuth';
import { completeOnboarding, getProfile, saveOnboardingResponse } from '@/lib/storage';
import { trackEvent, MixpanelEvents, setUserProperty } from '@/lib/mixpanel';
import { summarizeOnboardingGroup, type OnboardingSummaryData } from '@/lib/ai';
import { useTypewriter } from '@/hooks/useTypewriter';

export default function OnboardingStep7() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setOnboardingComplete = useTwin((state) => state.setOnboardingComplete);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Typewriter animation for title
  const titleText = "it's time to create your AI twin";
  const { displayedLines: titleLines, isComplete: titleComplete } = useTypewriter(
    [titleText],
    { speed: 50 }
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Start fade in animation when loading
  useEffect(() => {
    if (isSummarizing) {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation when not loading
      fadeAnim.setValue(0);
    }
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

      // Save values_json
      if (summaries.values_json && summaries.values_json.length > 0) {
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('profiles')
          .update({ values_json: summaries.values_json })
          .eq('user_id', user.id);
      }

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
      
      router.replace('/(tabs)/home');
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
        router.replace('/(tabs)/home');
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
      progress={90}
      onNext={handleComplete}
      nextLabel={isSummarizing ? "Processing..." : "Create AI Twin"}
      loading={isSummarizing}
      canContinue={!isSummarizing}
      animatedButton={!isSummarizing}
    >
      {isSummarizing ? (
        <Animated.View 
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Cube image fading in */}
          <Animated.View
            style={[
              styles.cubeContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/cube.png')}
              style={styles.cubeImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Loading text with animation */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.loadingTitle}>Creating your AI twin</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    position: 'relative',
  },
  cubeContainer: {
    width: 200,
    height: 200,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cubeImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  animatedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 8,
  },
  cursor: {
    color: 'rgba(135, 206, 250, 0.9)',
    fontWeight: '400',
  },
});
