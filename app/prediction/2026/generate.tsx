import { View, Text, StyleSheet, ActivityIndicator, Platform, Animated, Easing } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { generateYearPrediction } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { getProfile } from '@/lib/storage';
import { insertYearPrediction, getYearPrediction, updateYearPrediction } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function PredictionGenerateScreen() {
  const router = useRouter();
  const { scenario } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check premium status for best_case and worst_case scenarios
    if (scenario && typeof scenario === 'string') {
      const scenarioType = scenario as 'estimated' | 'best_case' | 'worst_case';
      if ((scenarioType === 'best_case' || scenarioType === 'worst_case') && !isPremium) {
        trackEvent(MixpanelEvents.YEAR_PREDICTION_PREMIUM_BLOCKED, {
          scenario_type: scenarioType,
          feature: 'year_prediction_generate'
        });
        router.replace('/premium' as any);
        return;
      }
    }

    if (user && scenario) {
      generatePrediction();
    }

    // Start animations
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

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [user, scenario]);

  async function generatePrediction() {
    if (!user || !scenario || typeof scenario !== 'string') {
      setLoading(false);
      return;
    }

    const scenarioType = scenario as 'estimated' | 'best_case' | 'worst_case';

    try {
      setStatus('Analyzing your profile...');
      
      // Build core pack
      const corePack = await buildCorePack(user.id, [user.id]);
      
      setStatus('Generating your prediction...');
      
      // Get user profile for additional context
      const userProfile = await getProfile(user.id);
      
      // Generate prediction (AI will return both data and probability)
      const { data: predictionData, probability } = await generateYearPrediction({
        corePack,
        scenarioType,
        userProfile: userProfile || undefined,
      });

      setStatus('Saving your prediction...');

      // Check if prediction already exists
      const existing = await getYearPrediction(user.id, scenarioType);
      
      let predictionId: string;
      const isNew = !existing;
      if (existing) {
        // Update existing
        const updated = await updateYearPrediction(
          existing.id,
          predictionData,
          probability
        );
        predictionId = updated.id;
      } else {
        // Insert new
        const inserted = await insertYearPrediction(
          user.id,
          scenarioType,
          predictionData,
          probability
        );
        predictionId = inserted.id;
      }

      // Track prediction generation
      trackEvent(MixpanelEvents.YEAR_PREDICTION_GENERATED, {
        prediction_id: predictionId,
        scenario_type: scenarioType,
        probability: probability,
        is_new: isNew
      });

      setStatus('Complete!');

      // Navigate to results page
      setTimeout(() => {
        router.replace(`/prediction/2026/${predictionId}`);
      }, 500);
    } catch (error) {
      console.error('Failed to generate prediction:', error);
      setStatus('Error generating prediction');
      setLoading(false);
      // Navigate back on error
      setTimeout(() => {
        router.back();
      }, 2000);
    }
  }

  const scenarioNames = {
    estimated: 'Most Likely',
    best_case: 'Best Case',
    worst_case: 'Worst Case',
  };

  const scenarioName = scenario && typeof scenario === 'string' 
    ? scenarioNames[scenario as keyof typeof scenarioNames] || 'Prediction'
    : 'Prediction';

  const scenarioGradients = {
    estimated: ['rgba(135, 206, 250, 0.2)', 'rgba(100, 181, 246, 0.1)', 'rgba(65, 105, 225, 0.05)'],
    best_case: ['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.1)', 'rgba(255, 140, 0, 0.05)'],
    worst_case: ['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)', 'rgba(185, 28, 28, 0.05)'],
  };

  const scenarioColors = {
    estimated: '#87CEFA',
    best_case: '#FFD700',
    worst_case: '#EF4444',
  };

  const gradientColors = scenario && typeof scenario === 'string' 
    ? scenarioGradients[scenario as keyof typeof scenarioGradients] || scenarioGradients.estimated
    : scenarioGradients.estimated;

  const accentColor = scenario && typeof scenario === 'string'
    ? scenarioColors[scenario as keyof typeof scenarioColors] || scenarioColors.estimated
    : scenarioColors.estimated;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#050505', '#0A0A0A', '#050505']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
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
                    colors={gradientColors}
                    style={styles.orbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.orbInner}>
                  <Text style={styles.orbEmoji}>🔮</Text>
                </View>
              </View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Simulating your 2026...</Text>
                <View style={styles.statusContainer}>
                  <BlurView intensity={20} tint="dark" style={styles.statusBlur}>
                    <Text style={styles.statusText}>{status}</Text>
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
                        backgroundColor: accentColor,
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
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    minHeight: 400,
  },
  orbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  orbEmoji: {
    fontSize: 48,
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
});



