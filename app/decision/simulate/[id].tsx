import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getDecision } from '@/lib/storage';
import { generateTimelineSimulation } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { ArrowLeft, Sparkles, Zap, Brain } from 'lucide-react-native';
import type { TimelineSimulation } from '@/types/database';

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

  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [id, user]);

  async function loadData() {
    if (!id || typeof id !== 'string' || !user) return;

    try {
      const decisionData = await getDecision(id);
      setDecision(decisionData);
      
      // Set initial selected option to the predicted choice
      const initialOption = decisionData.prediction?.prediction || '';
      setSelectedOption(initialOption);
      
      // Generate timeline for predicted choice
      if (initialOption) {
        await generateSimulationForOption(decisionData, initialOption);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  }

  async function generateSimulationForOption(decisionData: any, option: string) {
    if (!user || !decisionData) {
      setLoading(false);
      return;
    }

    setGenerating(true);
    
    // Start loading animation sequence
    setLoadingPhase(0);
    setSimulatedPaths(1000000);
    setProbabilitiesCalculated(1000000);
    
    // Animate loading phases - show 1 message every 2 seconds
    const phaseInterval = setInterval(() => {
      setLoadingPhase(prev => (prev + 1) % 4);
    }, 2000);
    
    // Animate counters - increment by 1 every 2 milliseconds, up to 5 million
    const counterInterval = setInterval(() => {
      setSimulatedPaths(prev => Math.min(prev + 1, 5000000));
      setProbabilitiesCalculated(prev => Math.min(prev + 1, 5000000));
    }, 2);

    try {
      const corePack = await buildCorePack(user.id);

      const timelineData = await generateTimelineSimulation(
        corePack,
        decisionData.question,
        option
      );

      setTimeline(timelineData);
    } catch (error) {
      console.error('Timeline simulation error:', error);
      alert('Failed to generate timeline simulation');
    } finally {
      clearInterval(phaseInterval);
      clearInterval(counterInterval);
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

  if (loading || generating) {
    const loadingMessages = [
      { text: 'Constructing timeline matrix', icon: Brain },
      { text: 'Simulating parallel futures', icon: Sparkles },
      { text: 'Calculating probability waves', icon: Zap },
      { text: 'Weaving reality threads', icon: Sparkles },
    ];
    
    const currentMessage = loadingMessages[loadingPhase];
    const Icon = currentMessage.icon;
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Life Trajectory</Text>
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            {/* Animated icon */}
            <View style={styles.loadingIconContainer}>
              <View style={styles.loadingIconGlow} />
              <Icon size={48} color="#B795FF" />
            </View>
            
            {/* Main loading message */}
            <Text style={styles.loadingMainText}>{currentMessage.text}</Text>
            
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {simulatedPaths.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Paths Simulated</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {probabilitiesCalculated.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Probabilities Calculated</Text>
              </View>
            </View>
            
            {/* Progress dots */}
            <View style={styles.progressDots}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    loadingPhase === i && styles.progressDotActive
                  ]}
                />
              ))}
            </View>
            
          </View>
        </View>
      </View>
    );
  }

  if (!decision) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Life Trajectory</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Decision not found</Text>
        </View>
      </View>
    );
  }

  const options = Array.isArray(decision.options) 
    ? decision.options 
    : JSON.parse(decision.options || '[]');

  const timelineData = timeline ? [
    { period: '1 Year', events: timeline.one_year, color: '#C4B5FD' },
    { period: '3 Years', events: timeline.three_year, color: '#A78BFA' },
    { period: '5 Years', events: timeline.five_year, color: '#8B5CF6' },
    { period: '10 Years', events: timeline.ten_year, color: '#6D28D9' },
  ] : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Life Trajectory</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Decision Context */}
        <View style={styles.contextSection}>
          <Text style={styles.question}>{decision.question}</Text>
        </View>

        {/* Option Selector */}
        <View style={styles.optionsSection}>
          <Text style={styles.optionsLabel}>Explore Each Option:</Text>
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

        {/* Loading State for Regeneration */}
        {generating && (
          <View style={styles.regeneratingContainer}>
            <ActivityIndicator size="small" color="#B795FF" />
            <Text style={styles.regeneratingText}>Generating timeline for "{selectedOption}"...</Text>
          </View>
        )}

        {/* Timeline */}
        {timeline && (
          <View style={styles.timelineContainer}>
            {timelineData.map(({ period, events, color }) => (
              <View key={period} style={styles.periodSection}>
                {/* Period Header */}
                <View style={[styles.periodHeader, { backgroundColor: color }]}>
                  <Text style={styles.periodTitle}>{period}</Text>
                </View>

                {/* Events */}
                {events.map((event, index) => (
                  <View key={index} style={styles.eventRow}>
                    <Text style={styles.eventTime}>{event.time}</Text>
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Generation Note */}
        {timeline && (
          <Text style={styles.generationNote}>
            This trajectory is AI-generated based on your unique profile. Use it as a thought experiment, not a prediction.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#0C0C10',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
    overflow: 'visible',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContent: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
  },
  loadingIconContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#B795FF',
    opacity: 0.2,
  },
  loadingMainText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 150,
    flex: 1,
    maxWidth: 180,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B795FF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(183, 149, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#B795FF',
    width: 24,
  },
  animatedBarsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 4,
    opacity: 0.3,
  },
  animatedBar: {
    flex: 1,
    backgroundColor: '#B795FF',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  contextSection: {
    marginBottom: 16,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  optionsSection: {
    marginBottom: 24,
    marginTop: 8,
    overflow: 'visible',
  },
  optionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 16,
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    overflow: 'visible',
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
  },
  optionButtonSelected: {
    borderColor: '#B795FF',
    backgroundColor: 'rgba(59, 37, 109, 0.3)',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.85)',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  regeneratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 12,
    marginBottom: 16,
  },
  regeneratingText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  timelineContainer: {
    gap: 32,
  },
  periodSection: {
    gap: 2,
  },
  periodHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 8,
    marginBottom: 8,
    gap: 16,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    width: 70,
    paddingTop: 2,
  },
  eventContent: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  eventDescription: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 19,
  },
  generationNote: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});

