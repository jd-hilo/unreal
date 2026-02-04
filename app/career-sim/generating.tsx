import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { useAuth } from '@/store/useAuth';
import { buildCorePack } from '@/lib/relevance';
import { generateCareerSimulation } from '@/lib/ai';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DinoGame, DinoGameRef } from '@/components/DinoGame';

const LOADING_STEPS = [
  'Analyzing your profile...',
  'Building career trajectory model...',
  'Simulating industry trends...',
  'Calculating compensation progression...',
  'Generating timeline milestones...',
  'Analyzing global comparisons...',
  'Finalizing simulation...',
];

export default function GeneratingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    timeHorizon: string;
    currentRole: string;
    company: string;
    salary: string;
    pathType: string;
    baseSimulationKey?: string;
    alternatePathLabel?: string;
    alternatePathYear?: string;
    alternatePathDecision?: string;
  }>();
  const { user } = useAuth();
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dinoGameRef = useRef<DinoGameRef>(null);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 60000, // 60 seconds total (2x slower)
      useNativeDriver: false,
    }).start();

    // Cycle through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 4000);

    // Generate simulation
    generateSimulation();

    return () => {
      clearInterval(stepInterval);
    };
  }, []);

  const generateSimulation = async () => {
    if (!user?.id) {
      setError('Please sign in to generate simulation');
      return;
    }

    try {
      // Step 1: Build core pack
      const corePack = await buildCorePack(user.id, [user.id]);

      // Step 2: Generate career simulation
      let baseSimulation: any = null;
      if (params.baseSimulationKey) {
        try {
          const stored = await AsyncStorage.getItem(params.baseSimulationKey);
          if (stored) {
            baseSimulation = JSON.parse(stored);
          }
        } catch (storageError) {
          console.warn('Failed to load base simulation for alternate path:', storageError);
        }
      }

      const simulation = await generateCareerSimulation(corePack, {
        timeHorizon: parseInt(params.timeHorizon || '10', 10) as 5 | 10 | 15,
        pathType: (params.pathType || 'stay') as 'stay' | 'switch' | 'startup',
        currentRole: params.currentRole || '',
        company: params.company || '',
        salary: params.salary || '',
        alternateFrom: params.alternatePathLabel && params.alternatePathYear ? {
          decisionLabel: params.alternatePathLabel,
          decisionYear: parseInt(params.alternatePathYear, 10),
          decisionKey: params.alternatePathDecision,
          baseSimulation,
        } : undefined,
      });

      // Store generated simulation temporarily in AsyncStorage
      const storageKey = `career_sim_${user.id}_${Date.now()}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(simulation));

      // Navigate to result screen with generated data
      router.replace({
        pathname: '/career-sim/result',
        params: {
          ...params,
          generated: 'true',
          simulationKey: storageKey,
        },
      });
    } catch (err) {
      console.error('Error generating simulation:', err);
      setError('Failed to generate simulation. Please try again.');
    }
  };

  if (error) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext} onPress={() => router.back()}>
              Go Back
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Pressable 
          style={styles.pressableContainer}
          onPress={() => dinoGameRef.current?.jump()}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={styles.content}>
              <View style={styles.gameContainer}>
                <DinoGame ref={dinoGameRef} />
              </View>

              <Text style={styles.title}>Generating Your Career Simulation</Text>
              <Text style={styles.subtitle}>{LOADING_STEPS[loadingStep]}</Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  pressableContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  gameContainer: {
    width: '100%',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    marginBottom: 48,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gradients.purple[0],
    borderRadius: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorSubtext: {
    fontSize: 16,
    color: Colors.gradients.purple[0],
    fontFamily: Fonts.secondary.regular,
    textDecorationLine: 'underline',
  },
});
