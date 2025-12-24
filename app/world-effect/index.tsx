import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { fetchDailyStories } from '@/lib/perplexity';
import { scoreStoryImpact } from '@/lib/ai';
import { ArrowLeft, Info, TrendingUp, TrendingDown, Globe, Minus } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { DailyStory } from '@/types/database';
import { WorldEffectInfoModal } from '@/components/WorldEffectInfoModal';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const metricIcons = {
  money: '💰',
  happiness: '😊',
  freedom: '⚡',
  growth: '📈',
  relationships: '❤️',
};

const metricLabels = {
  money: 'Money',
  happiness: 'Happiness',
  freedom: 'Freedom',
  growth: 'Growth',
  relationships: 'Relationships',
};

const LOADING_STEPS = [
  "Fetching today's news...",
  "Analyzing your profile...",
  "Scoring story impacts...",
  "Calculating aggregate effects...",
  "Finalizing analysis...",
];

export default function WorldEffectScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [stories, setStories] = useState<DailyStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [selectedStory, setSelectedStory] = useState<DailyStory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) {
      setLoadingStepIndex(0);
      const interval = setInterval(() => {
        setLoadingStepIndex((prev) => {
          if (prev < LOADING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [user])
  );

  async function loadStories() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user profile
      const profile = await getProfile(user.id);
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Fetch daily stories
      const storyData = await fetchDailyStories(profile.current_location || profile.core_json?.city);
      
      // Score each story
      const scoredStories: DailyStory[] = await Promise.all(
        storyData.map(async (story, index) => {
          try {
            const impact = await scoreStoryImpact(
              {
                core_json: profile.core_json,
                values_json: profile.values_json,
                narrative_summary: profile.narrative_summary,
                current_location: profile.current_location,
                first_name: profile.first_name,
              },
              story
            );

            return {
              id: `story-${index}`,
              title: story.title,
              summary: story.summary,
              url: story.url,
              publishedAt: story.publishedAt,
              impactScore: impact.overallScore,
              affectedMetrics: impact.affectedMetrics,
              explanation: impact.explanation,
            };
          } catch (error) {
            console.error(`Failed to score story ${index}:`, error);
            // Return story with neutral score on error
            return {
              id: `story-${index}`,
              title: story.title,
              summary: story.summary,
              url: story.url,
              publishedAt: story.publishedAt,
              impactScore: 0,
              affectedMetrics: {},
              explanation: 'Unable to analyze impact.',
            };
          }
        })
      );

      setStories(scoredStories);
    } catch (err: any) {
      console.error('Failed to load stories:', err);
      setError(err.message || 'Failed to load stories. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleStoryPress(story: DailyStory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedStory(story);
    setModalVisible(true);
  }

  function handleInfoPress(story: DailyStory, event: any) {
    event.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStory(story);
    setModalVisible(true);
  }

  const getScoreColor = (score: number) => {
    if (score > 0) return '#10B981'; // Green for positive
    if (score < 0) return '#EF4444'; // Red for negative
    return '#666666'; // Gray for neutral
  };

  const getScoreBackground = (score: number) => {
    if (score > 0) return 'rgba(16, 185, 129, 0.2)';
    if (score < 0) return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(255, 255, 255, 0.1)';
  };

  const getDomain = (url: string) => {
    try {
      // Simple regex to extract domain since URL object might be inconsistent in some RN environments
      const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
      return match ? match[1] : 'Source';
    } catch (e) {
      return 'Source';
    }
  };

  const aggregateScore = useMemo(() => {
    if (stories.length === 0) return 0;
    return stories.reduce((acc, story) => acc + story.impactScore, 0);
  }, [stories]);

  const impactColor = aggregateScore > 0 ? '#10B981' : aggregateScore < 0 ? '#EF4444' : '#666666';
  const impactBg = aggregateScore > 0 ? 'rgba(16, 185, 129, 0.15)' : aggregateScore < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.1)';
  const impactLabel = aggregateScore > 0 ? 'Positive Impact' : aggregateScore < 0 ? 'Negative Impact' : 'Neutral';

  // Generate simple chart path from stories
  const chartPath = useMemo(() => {
    if (stories.length < 2) return '';
    const width = 360; // approximate width
    const height = 50;
    const maxScore = Math.max(...stories.map(s => Math.abs(s.impactScore)), 50);
    const points = stories.map((s, i) => {
      const x = (i / (stories.length - 1)) * width;
      // Normalize y: 0 is center (25), +max is top (0), -max is bottom (50)
      const normalizedScore = s.impactScore / maxScore; // -1 to 1
      const y = 25 - (normalizedScore * 25);
      return `${x},${y}`;
    });
    
    // Create smooth path
    let d = `M${points[0]}`;
    for (let i = 1; i < points.length; i++) {
        // Simple line for now, or bezier if we want to be fancy
        d += ` L${points[i]}`; 
    }
    return d;
  }, [stories]);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#000000', '#000000']}
        style={styles.backgroundGradient}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Top Bar - Simplified */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.back();
              }} 
              style={styles.backButtonHeader}
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingCard}>
                <View style={styles.loadingOrbContainer}>
                  <View style={styles.loadingOrb}>
                    <Text style={styles.loadingOrbEmoji}>🌍</Text>
                  </View>
                </View>
                <Text style={styles.loadingTitle}>
                  Analyzing world effects...
                </Text>
                
                <View style={styles.loadingStepsContainer}>
                  {LOADING_STEPS.map((step, index) => {
                    if (index > loadingStepIndex) return null;
                    const isCurrent = index === loadingStepIndex;
                    return (
                      <View key={index} style={styles.loadingStepRow}>
                        <View style={[styles.loadingStepDot, isCurrent && styles.loadingStepDotActive]} />
                        <Text style={[styles.loadingStepText, isCurrent && styles.loadingStepTextActive]}>
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={loadStories}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : stories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Globe size={48} color="#666666" />
              <Text style={styles.emptyText}>No stories available</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header Section */}
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit>World Effect</Text>
              </View>
              
              <Text style={styles.cardLabel}>Daily Aggregate</Text>
              <View style={styles.aggregateCard}>
                <View style={styles.aggregateCardContent}>
                  <Text style={styles.aggregateValue}>
                    {aggregateScore > 0 ? '+' : ''}{aggregateScore.toFixed(0)}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: impactBg }]}>
                    {aggregateScore > 0 ? (
                      <TrendingUp size={12} color={impactColor} />
                    ) : aggregateScore < 0 ? (
                      <TrendingDown size={12} color={impactColor} />
                    ) : (
                      <Minus size={12} color={impactColor} />
                    )}
                    <Text style={[styles.badgeText, { color: impactColor }]}>{impactLabel}</Text>
                  </View>
                </View>
                
                {/* Chart */}
                {chartPath && (
                  <View style={styles.chartContainer}>
                    <Svg height="50" width="100%" preserveAspectRatio="none">
                      <Defs>
                        <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={impactColor} stopOpacity="0.3" />
                          <Stop offset="1" stopColor={impactColor} stopOpacity="0" />
                        </SvgLinearGradient>
                      </Defs>
                      <Path
                        d={`${chartPath} V50 H0 Z`}
                        fill="url(#grad)"
                      />
                      <Path
                        d={chartPath}
                        fill="none"
                        stroke={impactColor}
                        strokeWidth="2"
                      />
                    </Svg>
                  </View>
                )}
              </View>

              <Text style={styles.sectionTitle}>Today's Stories</Text>

              {stories.map((story) => {
                const affectedMetrics = Object.entries(story.affectedMetrics).filter(
                  ([_, score]) => score !== undefined && score !== 0
                );

                return (
                  <TouchableOpacity
                    key={story.id}
                    style={styles.storyCard}
                    activeOpacity={0.8}
                    onPress={() => handleStoryPress(story)}
                  >
                    <View style={styles.storyHeader}>
                      <View style={styles.storyHeaderLeft}>
                        <View style={[
                          styles.scoreBadge,
                          { backgroundColor: getScoreBackground(story.impactScore) }
                        ]}>
                          {story.impactScore > 0 ? (
                            <TrendingUp size={16} color={getScoreColor(story.impactScore)} />
                          ) : story.impactScore < 0 ? (
                            <TrendingDown size={16} color={getScoreColor(story.impactScore)} />
                          ) : null}
                          <Text style={[
                            styles.scoreText,
                            { color: getScoreColor(story.impactScore) }
                          ]}>
                            {story.impactScore > 0 ? '+' : ''}{story.impactScore.toFixed(0)}
                          </Text>
                        </View>
                        <Text style={styles.sourceText}>{getDomain(story.url)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => handleInfoPress(story, e)}
                        style={styles.infoButton}
                      >
                        <Info size={18} color="#999999" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.storyTitle}>{story.title}</Text>
                    <Text style={styles.storySummary} numberOfLines={3}>
                      {story.summary}
                    </Text>

                    {affectedMetrics.length > 0 && (
                      <View style={styles.metricsContainer}>
                        {affectedMetrics.slice(0, 3).map(([metric, score]) => {
                          const isPositive = (score as number) > 0;
                          return (
                            <View
                              key={metric}
                              style={[
                                styles.metricChip,
                                isPositive ? styles.positiveChip : styles.negativeChip
                              ]}
                            >
                              <Text style={styles.metricEmoji}>
                                {metricIcons[metric as keyof typeof metricIcons]}
                              </Text>
                              <Text style={[
                                styles.metricText,
                                isPositive ? styles.positiveMetricText : styles.negativeMetricText
                              ]}>
                                {isPositive ? 'Supports ' : 'Hurts '}
                                {metricLabels[metric as keyof typeof metricLabels]}
                              </Text>
                            </View>
                          );
                        })}
                        {affectedMetrics.length > 3 && (
                          <Text style={styles.moreMetricsText}>
                            +{affectedMetrics.length - 3} more
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </LinearGradient>

      <WorldEffectInfoModal
        visible={modalVisible}
        story={selectedStory}
        onClose={() => {
          setModalVisible(false);
          setSelectedStory(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeader: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 0,
    letterSpacing: -0.3,
    fontFamily: 'Recoleta-Regular',
  },
  cardLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  aggregateCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    height: 160,
    marginBottom: 32,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  aggregateCardContent: {
    padding: 20,
  },
  aggregateValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadingOrbContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(45, 212, 191, 0.3)',
  },
  loadingOrbEmoji: {
    fontSize: 40,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  loadingStepsContainer: {
    width: '100%',
    gap: 12,
  },
  loadingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C2C2E',
  },
  loadingStepDotActive: {
    backgroundColor: '#2DD4BF',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  loadingStepText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingStepTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
  storyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoButton: {
    padding: 4,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  storySummary: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
    marginBottom: 12,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  positiveChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  negativeChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  metricEmoji: {
    fontSize: 14,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  positiveMetricText: {
    color: '#10B981',
  },
  negativeMetricText: {
    color: '#EF4444',
  },
  moreMetricsText: {
    fontSize: 12,
    color: '#666666',
    alignSelf: 'center',
    paddingVertical: 6,
  },
});

