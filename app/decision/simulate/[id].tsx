import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getDecision, getDecisionParticipants } from '@/lib/storage';
import { generateTimelineSimulation } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { ArrowLeft, Sparkles, Zap, Brain, Home } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import type { TimelineSimulation } from '@/types/database';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export default function SimulationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const [decision, setDecision] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineSimulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [simulatedPaths, setSimulatedPaths] = useState(0);
  const [probabilitiesCalculated, setProbabilitiesCalculated] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [progressStatus, setProgressStatus] = useState('Initializing simulation...');
  const [progressPercent, setProgressPercent] = useState(0);
  const progressAnim = useSharedValue(0);

  // Matrix background columns - simplified for performance
  const numColumns = 12;
  const matrixColumns = useRef(
    Array.from({ length: numColumns }, (_, i) => ({
      id: i,
      y: useSharedValue(Math.random() * -1500),
      speed: 3000 + Math.random() * 2000, // Duration in ms (3-5 seconds)
    }))
  ).current;

  // Animate matrix columns
  useEffect(() => {
    if (!loading && !generating) return;

    matrixColumns.forEach((col) => {
      // Start smooth continuous looping animation
      col.y.value = withRepeat(
        withSequence(
          withTiming(1200, {
            duration: col.speed,
            easing: Easing.linear,
          }),
          withTiming(-1500, {
            duration: 0,
            easing: Easing.linear,
          })
        ),
        -1,
        false
      );
    });

    return () => {
      matrixColumns.forEach((col) => {
        col.y.value = -1500;
      });
    };
  }, [loading, generating]);

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
      setLoading(false); // Show UI immediately after data loads
      
      const uiLoadTime = performance.now();
      console.log(`[Simulation] UI loaded in ${(uiLoadTime - startTime).toFixed(2)}ms`);
      
      // Set initial selected option to the predicted choice
      const initialOption = decisionData.prediction?.prediction || '';
      setSelectedOption(initialOption);
      
      // Generate timeline for predicted choice in background
      if (initialOption) {
        console.log(`[Simulation] Starting background simulation for option: "${initialOption}"`);
        generateSimulationForOption(decisionData, initialOption);
      }
    } catch (error) {
      console.error('[Simulation] Failed to load data:', error);
      setLoading(false);
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
    setTimeline(null); // Clear current timeline
    await generateSimulationForOption(decision, option);
  }

  // Create matrix number styles - simplified for performance
  const numbersPerColumn = 20;
  const matrixNumberStyles = matrixColumns.map((column, colIdx) =>
    Array.from({ length: numbersPerColumn }, (_, idx) =>
      useAnimatedStyle(() => {
        const opacity = idx < 3 ? idx * 0.3 : Math.max(0.2, 1 - (idx - 3) * 0.1);
        return {
          opacity,
          transform: [{ translateY: column.y.value + idx * 40 }],
        };
      })
    )
  );

  if (loading || generating) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <StatusBar style="dark" />
        {/* Matrix Background - Updated for Light Theme */}
        <View style={styles.matrixContainer} pointerEvents="none">
          {matrixColumns.map((column, colIdx) => {
            const numbers = Array.from({ length: numbersPerColumn }, () => Math.floor(Math.random() * 10).toString());
            
            return (
              <Animated.View
                key={column.id}
                style={[
                  styles.matrixColumn,
                  { left: `${(column.id / numColumns) * 100}%` },
                ]}
              >
                {numbers.map((num, idx) => (
                  <Animated.Text
                    key={idx}
                    style={[
                      styles.matrixNumber, 
                      matrixNumberStyles[colIdx][idx],
                      { color: 'rgba(0, 0, 0, 0.05)' }
                    ]}
                  >
                    {num}
                  </Animated.Text>
                ))}
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: Colors.textPrimary }]}>running different lifelines...</Text>
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
        <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
          <Home size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
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
                      generating && styles.optionButtonDisabled,
                    ]}
                    onPress={() => handleOptionSelect(option)}
                    activeOpacity={0.7}
                    disabled={generating}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      selectedOption === option && styles.optionButtonTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Loading State for Regeneration */}
        {generating && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.regeneratingContainer}>
                <ActivityIndicator size="small" color={Colors.textSecondary} />
                <Text style={styles.regeneratingText}>Generating timeline for "{selectedOption}"...</Text>
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
            <View style={styles.sectionCard}>
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
  matrixContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  matrixColumn: {
    position: 'absolute',
    top: 0,
    width: '5%',
    alignItems: 'center',
  },
  matrixNumber: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.05)',
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    lineHeight: 18,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    textAlign: 'center',
    opacity: 1,
    fontFamily: Fonts.primary.regular,
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
});

