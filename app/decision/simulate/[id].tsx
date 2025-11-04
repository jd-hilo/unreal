import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getDecision } from '@/lib/storage';
import { generateTimelineSimulation } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { ArrowLeft } from 'lucide-react-native';
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
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Life Trajectory</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>
            {generating ? 'Generating your life trajectory...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!decision) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
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
    { period: '1 Year', events: timeline.one_year, color: '#3B82F6' },
    { period: '3 Years', events: timeline.three_year, color: '#10B981' },
    { period: '5 Years', events: timeline.five_year, color: '#F59E0B' },
    { period: '10 Years', events: timeline.ten_year, color: '#8B5CF6' },
  ] : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
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
              const isRecommended = option === decision.prediction?.prediction;
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
                  {isRecommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>AI Pick</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Loading State for Regeneration */}
        {generating && (
          <View style={styles.regeneratingContainer}>
            <ActivityIndicator size="small" color="#000000" />
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
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    color: '#000000',
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
  },
  contextSection: {
    marginBottom: 16,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
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
    color: '#666666',
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
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
  },
  regeneratingText: {
    fontSize: 14,
    color: '#666666',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    gap: 16,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
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
    color: '#000000',
    lineHeight: 20,
  },
  eventDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
  },
  generationNote: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});

