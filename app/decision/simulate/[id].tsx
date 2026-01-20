import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image, Animated, Easing } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getDecision, getDecisionParticipants } from '@/lib/storage';
import { generateTimelineSimulation } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { ArrowLeft, Sparkles, Zap, Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TimelineSimulation } from '@/types/database';
import {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function SimulationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const [decision, setDecision] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineSimulation | null>(null);
  const [simulations, setSimulations] = useState<Record<string, TimelineSimulation>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [simulatedPaths, setSimulatedPaths] = useState(0);
  const [probabilitiesCalculated, setProbabilitiesCalculated] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [progressStatus, setProgressStatus] = useState('Initializing simulation...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [generatingOptions, setGeneratingOptions] = useState<Set<string>>(new Set());
  const [completedSimulations, setCompletedSimulations] = useState(0);
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [variantsCount, setVariantsCount] = useState(0);
  const [percentageCount, setPercentageCount] = useState(0);
  const progressAnim = useSharedValue(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loadingStepIndex = useRef(0);

  const LOADING_STEPS = [
    "Analyzing your profile...",
    "Building context...",
    "Simulating life trajectories...",
    "Calculating probabilities...",
    "Finalizing simulations..."
  ];

  // Loading animation and steps
  useEffect(() => {
    if (generating && Object.keys(simulations).length === 0) {
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
      const stepInterval = setInterval(() => {
        loadingStepIndex.current = (loadingStepIndex.current + 1) % LOADING_STEPS.length;
        setProgressStatus(LOADING_STEPS[loadingStepIndex.current]);
      }, 2000);

      // Update elapsed time
      const timeInterval = setInterval(() => {
        if (startTime) {
          setElapsedTime(Math.floor((performance.now() - startTime) / 1000));
        }
      }, 1000);

      // Animate variants count quickly - keep increasing continuously
      setVariantsCount(0);
      const variantsInterval = setInterval(() => {
        setVariantsCount(prev => {
          // Continuous growth that starts fast and gradually slows but never stops
          // Base increment decreases over time but always adds something
          const baseIncrement = Math.max(50, 500 - Math.floor(prev / 100));
          const randomIncrement = Math.floor(Math.random() * 300);
          return prev + baseIncrement + randomIncrement;
        });
      }, 50); // Update every 50ms for smooth animation

      // Animate percentage counter - starts at 0 and increments by 1%
      setPercentageCount(0);
      const percentageInterval = setInterval(() => {
        setPercentageCount(prev => {
          // Increment by 1% up to 99% (never show 100%)
          if (prev >= 99) return 99;
          return prev + 1;
        });
      }, 800); // Update every 800ms to slow down the counter
      
      return () => {
        clearInterval(stepInterval);
        clearInterval(timeInterval);
        clearInterval(variantsInterval);
        clearInterval(percentageInterval);
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
      };
    } else {
      // Reset variants and percentage when not generating
      setVariantsCount(0);
      setPercentageCount(0);
    }
  }, [generating, simulations, startTime]);

  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [id, user]);

  async function loadData() {
    if (!id || typeof id !== 'string' || !user) return;

    const startTime = performance.now();
    console.log('[Simulation] Starting loadData at', new Date().toISOString());

    try {
      const dbStartTime = performance.now();
      const [decisionData, participantsData] = await Promise.all([
        getDecision(id),
        getDecisionParticipants(id as string),
      ]);
      const dbEndTime = performance.now();
      console.log(`[Simulation] Database calls completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`);
      
      setDecision(decisionData);
      setParticipants(participantsData || []);
      
      const uiLoadTime = performance.now();
      console.log(`[Simulation] UI loaded in ${(uiLoadTime - startTime).toFixed(2)}ms`);
      
      // Set initial selected option to the predicted choice
      const options = Array.isArray(decisionData.options) 
        ? decisionData.options 
        : JSON.parse(decisionData.options || '[]');
      const initialOption = decisionData.prediction?.prediction || options[0] || '';
      setSelectedOption(initialOption);
      
      // Generate simulations for ALL options simultaneously
      if (options.length > 0) {
        console.log(`[Simulation] Starting simultaneous simulations for all ${options.length} options`);
        generateAllSimulations(decisionData, options, participantsData || []);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('[Simulation] Failed to load data:', error);
      setLoading(false);
    }
  }

  async function generateAllSimulations(decisionData: any, options: string[], participantsList: any[] = []) {
    if (!user || !decisionData || options.length === 0) {
      setLoading(false);
      return;
    }

    setGenerating(true);
    setLoading(true);
    setProgressPercent(100);
    setProgressStatus('Initializing simulations...');
    setTotalSimulations(options.length);
    setCompletedSimulations(0);
    setStartTime(performance.now());
    setVariantsCount(0);
    setPercentageCount(0);
    progressAnim.value = 100;

    // Mark all options as generating
    setGeneratingOptions(new Set(options));

    try {
      // Step 1: Building core pack (shared for all options)
      setProgressStatus('Analyzing your profile...');
      setProgressPercent(80);
      progressAnim.value = withTiming(80, { duration: 500 });
      
      const allUserIds = [user.id, ...participantsList.map(p => p.participant_user_id)];
      console.log('[Simulation] Building core pack for', allUserIds.length, 'user(s)');
      
      const corePackStartTime = performance.now();
      const corePack = await buildCorePack(user.id, allUserIds);
      const corePackEndTime = performance.now();
      console.log(`[Simulation] Core pack built in ${(corePackEndTime - corePackStartTime).toFixed(2)}ms`);

      // Step 2: Generate all simulations simultaneously
      setProgressStatus('Simulating all life trajectories...');
      setProgressPercent(70);
      progressAnim.value = withTiming(70, { duration: 500 });

      console.log('[Simulation] Starting simultaneous AI timeline generation for all options...');
      
      // Start all simulations in parallel with progress tracking
      const simulationPromises = options.map(async (option) => {
        try {
          const simulationStartTime = performance.now();
          console.log(`[Simulation] Starting simulation for option: "${option}"`);
          
          const timelineData = await generateTimelineSimulation(
            corePack,
            decisionData.question,
            option,
            allUserIds.length
          );
          
          const simulationEndTime = performance.now();
          console.log(`[Simulation] Completed simulation for "${option}" in ${((simulationEndTime - simulationStartTime) / 1000).toFixed(2)}s`);
          
          // Update completed count
          setCompletedSimulations(prev => prev + 1);
          
          return { option, timelineData };
        } catch (error) {
          console.error(`[Simulation] Error generating simulation for "${option}":`, error);
          setCompletedSimulations(prev => prev + 1);
          return { option, timelineData: null, error };
        }
      });

      // Wait for all simulations to complete
      const results = await Promise.all(simulationPromises);
      
      // Store all simulations
      const newSimulations: Record<string, TimelineSimulation> = {};
      results.forEach(({ option, timelineData }) => {
        if (timelineData) {
          newSimulations[option] = timelineData;
        }
      });
      
      setSimulations(newSimulations);
      
      // Set timeline for the selected option
      const initialOption = decisionData.prediction?.prediction || options[0] || '';
      if (newSimulations[initialOption]) {
        setTimeline(newSimulations[initialOption]);
      }

      // Update progress
      setProgressStatus('Complete!');
      setProgressPercent(0);
      progressAnim.value = withTiming(0, { duration: 300 });
      
      console.log(`[Simulation] All ${results.length} simulations completed`);
    } catch (error) {
      console.error('[Simulation] Error generating simulations:', error);
      setProgressStatus('Error generating simulations');
      setProgressPercent(100);
      progressAnim.value = 100;
      alert('Failed to generate timeline simulations');
    } finally {
      setGenerating(false);
      setLoading(false);
      setGeneratingOptions(new Set());
    }
  }

  async function generateSimulationForOption(decisionData: any, option: string) {
    if (!user || !decisionData) {
      setLoading(false);
      return;
    }

    const simulationStartTime = performance.now();
    console.log('[Simulation] Starting generateSimulationForOption at', new Date().toISOString());
    console.log('[Simulation] Option:', option);
    console.log('[Simulation] Participants count:', participants.length);

    setGenerating(true);
    setProgressPercent(100); // Start at 100% and count down
    setProgressStatus('Initializing simulation...');
    progressAnim.value = 100;

    let aiProgressInterval: number | null = null;

    try {
      // Step 1: Building core pack
      setProgressStatus('Analyzing your profile...');
      setProgressPercent(80);
      progressAnim.value = withTiming(80, { duration: 500 });
      
      const allUserIds = [user.id, ...participants.map(p => p.participant_user_id)];
      console.log('[Simulation] Building core pack for', allUserIds.length, 'user(s)');
      
      const corePackStartTime = performance.now();
      const corePack = await buildCorePack(user.id, allUserIds);
      const corePackEndTime = performance.now();
      console.log(`[Simulation] Core pack built in ${(corePackEndTime - corePackStartTime).toFixed(2)}ms`);
      console.log(`[Simulation] Core pack length: ${corePack.length} characters`);

      // Step 2: Generating timeline
      setProgressStatus('Simulating life trajectories...');
      setProgressPercent(70);
      progressAnim.value = withTiming(70, { duration: 500 });

      const aiStartTime = performance.now();
      console.log('[Simulation] Starting AI timeline generation...');
      
      // Animate progress bar counting down during AI call
      aiProgressInterval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev <= 5) {
            if (aiProgressInterval) clearInterval(aiProgressInterval);
            return prev;
          }
          const newValue = Math.max(5, prev - 0.5);
          progressAnim.value = withTiming(newValue, { duration: 100 });
          return newValue;
        });
      }, 200);
      
      const timelineData = await generateTimelineSimulation(
        corePack,
        decisionData.question,
        option,
        allUserIds.length
      );
      
      if (aiProgressInterval) {
        clearInterval(aiProgressInterval);
        aiProgressInterval = null;
      }
      const aiEndTime = performance.now();
      console.log(`[Simulation] AI timeline generation completed in ${(aiEndTime - aiStartTime).toFixed(2)}ms`);

      // Step 3: Finalizing
      setProgressStatus('Finalizing timeline...');
      setProgressPercent(5);
      progressAnim.value = withTiming(5, { duration: 300 });

      const totalTime = performance.now() - simulationStartTime;
      console.log(`[Simulation] Total simulation time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log('[Simulation] Timeline data received:', {
        one_year: timelineData.one_year?.length || 0,
        three_year: timelineData.three_year?.length || 0,
        five_year: timelineData.five_year?.length || 0,
        ten_year: timelineData.ten_year?.length || 0,
      });

      // Complete - count down to 0%
      setProgressStatus('Complete!');
      setProgressPercent(0);
      progressAnim.value = withTiming(0, { duration: 300 });
      
      // Set timeline immediately after showing complete
      setTimeline(timelineData);
    } catch (error) {
      if (aiProgressInterval) {
        clearInterval(aiProgressInterval);
      }
      const errorTime = performance.now() - simulationStartTime;
      console.error(`[Simulation] Timeline simulation error after ${(errorTime / 1000).toFixed(2)}s:`, error);
      setProgressStatus('Error generating simulation');
      setProgressPercent(100);
      progressAnim.value = 100;
      alert('Failed to generate timeline simulation');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  async function handleOptionSelect(option: string) {
    if (option === selectedOption || !decision) return;
    
    setSelectedOption(option);
    
    // Check if simulation already exists for this option
    if (simulations[option]) {
      // Just toggle to the existing simulation
      setTimeline(simulations[option]);
      console.log(`[Simulation] Toggling to existing simulation for "${option}"`);
    } else {
      // If simulation doesn't exist (shouldn't happen, but handle gracefully)
      console.warn(`[Simulation] No existing simulation found for "${option}", generating now...`);
      setTimeline(null);
      await generateSimulationForOption(decision, option);
    }
  }


  if (loading || (generating && Object.keys(simulations).length === 0)) {
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
                  <View style={styles.cubeShadowWrapper}>
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.loadingCubeIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Running different lifelines...</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusBlur}>
                    <Text style={styles.statusText}>
                      {progressStatus || LOADING_STEPS[0]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Statistics */}
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, styles.variantsCard]}>
                  <Text style={styles.statValue}>{variantsCount.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Variants</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{percentageCount}%</Text>
                  <Text style={styles.statLabel}>Complete</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{elapsedTime}s</Text>
                  <Text style={styles.statLabel}>Elapsed</Text>
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

  if (!decision) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Life Trajectory</Text>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: Colors.textSecondary }]}>Decision not found</Text>
        </View>
      </View>
    );
  }

  const options = Array.isArray(decision.options) 
    ? decision.options 
    : JSON.parse(decision.options || '[]');

  const timelineData = timeline ? [
    { period: '1 Year', events: timeline.one_year, color: 'rgba(135, 206, 250, 0.9)' },
    { period: '3 Years', events: timeline.three_year, color: '#0EA5E9' },
    { period: '5 Years', events: timeline.five_year, color: 'rgba(100, 181, 246, 0.8)' },
    { period: '10 Years', events: timeline.ten_year, color: '#14B8A6' },
  ] : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Life Trajectory</Text>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Decision Context */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.question}>{decision.question}</Text>
          </View>
        </View>

        {/* Option Selector */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Explore Each Option</Text>
            <View style={styles.optionsGrid}>
              {options.map((option: string) => {
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      selectedOption === option && styles.optionButtonSelected,
                      generating && Object.keys(simulations).length === 0 && styles.optionButtonDisabled,
                      !simulations[option] && generating && styles.optionButtonGenerating,
                    ]}
                    onPress={() => handleOptionSelect(option)}
                    activeOpacity={0.7}
                    disabled={generating && Object.keys(simulations).length === 0}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      selectedOption === option && styles.optionButtonTextSelected
                    ]}>
                      {option}
                    </Text>
                    {generating && !simulations[option] && (
                      <ActivityIndicator size="small" color={Colors.textSecondary} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Loading State for Initial Generation */}
        {generating && Object.keys(simulations).length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.regeneratingContainer}>
                <ActivityIndicator size="small" color={Colors.textSecondary} />
                <Text style={styles.regeneratingText}>Generating simulations for all options...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Timeline */}
        {timeline && (
          <View style={styles.timelineContainer}>
            {timelineData.map(({ period, events }) => (
              <View key={period} style={styles.section}>
                <View style={styles.sectionCard}>
                  <Text style={styles.periodTitle}>{period}</Text>
                  <View style={styles.eventsContainer}>
                    {events.map((event, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.eventRow,
                          index === events.length - 1 && styles.eventRowLast
                        ]}
                      >
                        <Text style={styles.eventTime}>{event.time}</Text>
                        <View style={styles.eventContent}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          {event.people && event.people.length > 0 && (
                            <View style={styles.peopleTags}>
                              {event.people.map((person, pIndex) => (
                                <View key={pIndex} style={styles.personTag}>
                                  <Text style={styles.personTagText}>{person}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          <Text style={styles.eventDescription}>{event.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Generation Note */}
        {timeline && (
          <View style={styles.section}>
            <View style={[styles.sectionCard, styles.generationNoteCard]}>
              <Text style={styles.generationNote}>
                This trajectory is generated through simulations based on your unique profile. Use it as a thought experiment, not a prediction.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Loading screen styles
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
  cubeShadowWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
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
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 32,
    marginBottom: 16,
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    width: 90,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  variantsCard: {
    width: 110, // Wider to fit 6 figures (e.g., 123,456)
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'center',
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
    backgroundColor: Colors.textTertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 20,
    gap: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: Fonts.primary.regular,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 18,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 28,
    fontFamily: Fonts.secondary.bold,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonGenerating: {
    opacity: 0.7,
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  optionButtonTextSelected: {
    color: Colors.textPrimary,
  },
  regeneratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  regeneratingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  timelineContainer: {
    gap: 0,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
  },
  eventsContainer: {
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  eventRowLast: {
    borderBottomWidth: 0,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
    width: 70,
    paddingTop: 2,
    fontFamily: Fonts.secondary.bold,
  },
  eventContent: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  eventDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: Fonts.secondary.bold,
  },
  peopleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  personTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  personTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  generationNote: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 20,
    textAlign: 'left',
    fontStyle: 'italic',
    fontFamily: Fonts.secondary.bold,
  },
  generationNoteCard: {
    backgroundColor: 'rgba(255, 235, 59, 0.08)', // Subtle yellow highlight
    borderColor: 'rgba(255, 235, 59, 0.15)',
  },
});

