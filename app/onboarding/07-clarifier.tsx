import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, Animated, Image, Platform, Easing } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useTwin } from '@/store/useTwin';
import { useAuth } from '@/store/useAuth';
import { completeOnboarding, getProfile, saveOnboardingResponse, updateProfileFields } from '@/lib/storage';
import { trackEvent, MixpanelEvents, setUserProperty } from '@/lib/mixpanel';
import { summarizeOnboardingGroup, type OnboardingSummaryData, generateTwinArchetype, embedText } from '@/lib/ai';
import { useTypewriter } from '@/hooks/useTypewriter';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const LOADING_STEPS = [
  'Analyzing your past...',
  'Building desires...',
  'Instilling hometown values...',
  'Structuring decision patterns...',
  'Mapping your personality...',
  'Calibrating cognitive traits...',
  'Finalizing your digital twin...'
];

export default function OnboardingStep7() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setOnboardingComplete = useTwin((state) => state.setOnboardingComplete);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const loadingIntervalRef = useRef<number | null>(null);
  
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
  
  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - clarifier');
    }, [])
  );
  
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
  
  // Animation values for carousel
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Start carousel animation when loading
  useEffect(() => {
    if (isSummarizing) {
      setCurrentStep(0);
      // Initial fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Start rotating carousel
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = setInterval(() => {
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setCurrentStep((prev) => {
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
      }, 2000); // Change step every 2 seconds

      return () => {
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
        fadeAnim.setValue(0);
      };
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      setCurrentStep(0);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
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
      console.log('🔄 [Twin Creation] Generating summaries with data:', {
        hasLifeSituation: !!lifeSituationData,
        hasLifeJourney: !!lifeJourneyData,
        hasValues: !!valuesData,
      });
      
      const summaries = await summarizeOnboardingGroup(summaryData);
      
      // Extract age from summaries (calculated by summarizeOnboardingGroup)
      const age = summaries.age;
      
      console.log('✅ [Twin Creation] Generated summaries:', {
        '01-now': summaries['01-now'] ? `${summaries['01-now'].substring(0, 50)}...` : 'EMPTY',
        '02-path': summaries['02-path'] ? `${summaries['02-path'].substring(0, 50)}...` : 'EMPTY',
        '03-values': summaries['03-values'] ? `${summaries['03-values'].substring(0, 50)}...` : 'EMPTY',
        age: age || 'not calculated',
      });

      // Always save summarized responses (they should have fallbacks, but save even if empty)
      console.log('💾 [Twin Creation] Saving summaries to profile...');
      
      // Determine final values for each summary (with fallbacks)
      let finalLifeSituation = '';
      let finalLifeJourney = '';
      let finalCoreValue = '';
      
      // Always save Life Situation - save to both '02-now' (preferred) and '01-now' (legacy) for compatibility
      if (summaries['01-now'] && summaries['01-now'].trim()) {
        finalLifeSituation = summaries['01-now'];
        await saveOnboardingResponse(user.id, '02-now', finalLifeSituation);
        await saveOnboardingResponse(user.id, '01-now', finalLifeSituation);
        console.log('✅ [Twin Creation] Saved 02-now (Life Situation) to core_json:', finalLifeSituation.substring(0, 100));
      } else {
        console.warn('⚠️ [Twin Creation] 01-now summary is empty or missing');
        // Try to generate a minimal fallback
        finalLifeSituation = age ? `You are ${age} years old and navigating your current life path.` : 'You are working towards your goals and building your life.';
        await saveOnboardingResponse(user.id, '02-now', finalLifeSituation);
        await saveOnboardingResponse(user.id, '01-now', finalLifeSituation);
        console.log('✅ [Twin Creation] Saved minimal fallback for 02-now to core_json');
      }
      
      // Always save 02-path (Life Journey) - should have fallback if data exists
      if (summaries['02-path'] && summaries['02-path'].trim()) {
        finalLifeJourney = summaries['02-path'];
        await saveOnboardingResponse(user.id, '02-path', finalLifeJourney);
        console.log('✅ [Twin Creation] Saved 02-path (Life Journey) to core_json:', finalLifeJourney.substring(0, 100));
      } else {
        console.warn('⚠️ [Twin Creation] 02-path summary is empty or missing');
        // Try to generate a minimal fallback
        finalLifeJourney = 'Your life journey has shaped who you are today, with experiences and choices that have led you to where you are now.';
        await saveOnboardingResponse(user.id, '02-path', finalLifeJourney);
        console.log('✅ [Twin Creation] Saved minimal fallback for 02-path to core_json');
      }
      
      // Always save Core Values - save to both '01-values' (preferred) and '03-values' (legacy) for compatibility
      if (summaries['03-values'] && summaries['03-values'].trim()) {
        finalCoreValue = summaries['03-values'];
        await saveOnboardingResponse(user.id, '01-values', finalCoreValue);
        await saveOnboardingResponse(user.id, '03-values', finalCoreValue);
        console.log('✅ [Twin Creation] Saved 01-values (Core Values) to core_json:', finalCoreValue.substring(0, 100));
      } else if (valuesData?.values && valuesData.values.length > 0) {
        // Generate fallback from values data
        finalCoreValue = `Your core values include ${valuesData.values.join(', ')}. ${valuesData.context || 'These values guide your decisions and shape how you approach life.'}`;
        await saveOnboardingResponse(user.id, '01-values', finalCoreValue);
        await saveOnboardingResponse(user.id, '03-values', finalCoreValue);
        console.log('✅ [Twin Creation] Saved fallback 01-values from values data to core_json');
      } else {
        console.warn('⚠️ [Twin Creation] 03-values summary is empty and no values data available');
        // Still save a minimal fallback
        finalCoreValue = 'Your values guide your decisions and shape how you approach life.';
        await saveOnboardingResponse(user.id, '01-values', finalCoreValue);
        await saveOnboardingResponse(user.id, '03-values', finalCoreValue);
        console.log('✅ [Twin Creation] Saved minimal fallback for 01-values to core_json');
      }
      
      // Now save to dedicated columns as well
      console.log('💾 [Twin Creation] Saving summaries to dedicated columns...');
      
      // Generate a consolidated narrative summary for semantic search
      const consolidatedNarrative = [
        finalLifeSituation,
        finalLifeJourney,
        finalCoreValue
      ].filter(Boolean).join('\n\n');

      let narrativeEmbedding: number[] | null = null;
      try {
        console.log('🧠 [Twin Creation] Generating narrative embedding...');
        narrativeEmbedding = await embedText(consolidatedNarrative);
      } catch (embedError) {
        console.error('⚠️ [Twin Creation] Failed to generate narrative embedding:', embedError);
      }

      await updateProfileFields(user.id, {
        life_situation: finalLifeSituation,
        life_journey: finalLifeJourney,
        core_value: finalCoreValue,
        narrative_summary: consolidatedNarrative,
        narrative_embedding: narrativeEmbedding as any,
      } as any);
      console.log('✅ [Twin Creation] Saved summaries to dedicated columns (life_situation, life_journey, core_value)');
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
      
      // Update profile with values_json and core_json
      const updatedProfile = await supabase
        .from('profiles')
        .update({ 
          values_json: finalValuesJson,
          core_json: updatedCoreJson
        } as any)
        .eq('user_id', user.id)
        .select()
        .single();

      // Get updated profile for archetype generation
      const updatedProfileData = updatedProfile.data || profile;
      
      // Generate twin archetype during loading
      console.log('🎭 [Twin Creation] Generating twin archetype...');
      let archetypeResult;
      try {
        archetypeResult = await generateTwinArchetype({
          ...updatedProfileData,
          core_value: finalCoreValue,
          life_journey: finalLifeJourney,
        });
        console.log('✅ [Twin Creation] Generated archetype:', archetypeResult.title);
        
        // Add archetype to updatedCoreJson before completing onboarding
        updatedCoreJson.twin_archetype = archetypeResult;
        
        console.log('✅ [Twin Creation] Archetype added to core_json');
      } catch (archetypeError) {
        console.error('⚠️ [Twin Creation] Failed to generate archetype:', archetypeError);
        // Continue without archetype - it can be generated later
      }

      // Get hometown and university from profile (already saved in life journey section)
      const hometown = updatedProfileData?.hometown || lifeJourneyData?.hometown;
      const university = updatedProfileData?.university || lifeJourneyData?.collegeName;
      
      // Update profile with final core_json including archetype
      await supabase
        .from('profiles')
        .update({ 
          core_json: updatedCoreJson
        } as any)
        .eq('user_id', user.id);
      
      // Complete onboarding (hometown and university should already be saved, but ensure they're set)
      await completeOnboarding(user.id, {
        university: university || undefined,
        hometown: hometown || undefined,
      });

      setOnboardingComplete(true);
      
      // Track onboarding completed
      trackEvent(MixpanelEvents.ONBOARDING_COMPLETED);
      setUserProperty('onboarding_complete', true);
      
      // Always route to twin reveal page after creating digital twin
      router.replace('/onboarding/twin-reveal');
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
        
        // Always route to complete page after creating digital twin
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
      title={isSummarizing ? null : animatedTitle}
      progress={0.90}
      onNext={handleComplete}
      nextLabel={isSummarizing ? "Creating" : "Create Digital Twin"}
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
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0]
                })
              }]
            }
          ]}
        >
          <Text style={styles.loadingText}>
            {LOADING_STEPS[currentStep]}
          </Text>
        </Animated.View>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Fonts.primary.regular,
  },
  animatedTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: 36,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: Fonts.primary.regular,
      android: Fonts.primary.regular,
      default: Fonts.fallback.primary,
    }),
  },
  cursor: {
    color: 'rgba(65, 105, 225, 0.9)',
    fontWeight: '400',
  },
});
