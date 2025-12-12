import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Share, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ArrowLeft, RefreshCw, Share as ShareIcon, Home, TrendingUp, TrendingDown, Calendar, ArrowUpRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getYearPredictionById, updateYearPrediction, getProfile } from '@/lib/storage';
import { generateYearPrediction } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import type { YearPredictionData } from '@/types/database';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

const { width } = Dimensions.get('window');

export default function PredictionResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Animated values for each card section
  const estimatedCardAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const timelineAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const insightsAnim = useRef(new Animated.Value(0)).current;

  const LOADING_STEPS = [
    "Analyzing your profile...",
    "Reviewing past decisions...",
    "Identifying key patterns...",
    "Simulating 2026 scenarios...",
    "Calculating probabilities...",
    "Generating personalized insights...",
    "Finalizing your prediction..."
  ];

  useEffect(() => {
    if (loading || regenerating) {
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
  }, [loading, regenerating]);

  useEffect(() => {
    if (user && id) {
      loadPrediction();
    }
  }, [id, user]);

  // Animate cards based on scroll position
  useEffect(() => {
    if (!prediction) return;

    // Initialize animations - start header, estimated card, stats and actions at 0 for slide-up animation
    estimatedCardAnim.setValue(0);
    actionsAnim.setValue(0);
    statsAnim.setValue(0);
    timelineAnim.setValue(0.2); // Start partially visible
    focusAnim.setValue(0.2); // Start partially visible
    insightsAnim.setValue(0.2); // Start partially visible

    // Animate top sections in on load with slide-up effect
    const animations: Animated.CompositeAnimation[] = [];
    
    // Animate header card for all scenarios
    if ((scenarioType === 'estimated' && prediction.probability_percentage) || 
        scenarioType === 'best_case' || 
        scenarioType === 'worst_case') {
      animations.push(
        Animated.timing(estimatedCardAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      );
    }
    
    animations.push(
      Animated.timing(actionsAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();

    const listener = scrollY.addListener(({ value }) => {
      const windowHeight = Dimensions.get('window').height;
      
      // Header card - keep visible once animated (for all scenarios)
      if ((scenarioType === 'estimated' && prediction.probability_percentage) || 
          scenarioType === 'best_case' || 
          scenarioType === 'worst_case') {
        estimatedCardAnim.setValue(1);
      }
      
      // Actions - keep visible once animated
      actionsAnim.setValue(1);
      
      // Stats - keep visible once animated
      statsAnim.setValue(1);
      
      // Timeline (starts around 500px)
      const timelineProgress = Math.min(1, Math.max(0, (value - 400 + windowHeight * 0.3) / (windowHeight * 0.5)));
      timelineAnim.setValue(timelineProgress);
      
      // Focus areas (starts around 800px)
      const focusProgress = Math.min(1, Math.max(0, (value - 700 + windowHeight * 0.3) / (windowHeight * 0.5)));
      focusAnim.setValue(focusProgress);
      
      // Insights (starts around 1000px)
      const insightsProgress = Math.min(1, Math.max(0, (value - 900 + windowHeight * 0.3) / (windowHeight * 0.5)));
      insightsAnim.setValue(insightsProgress);
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [prediction, scrollY]);

  async function loadPrediction() {
    if (!id || typeof id !== 'string' || !user) return;

    try {
      const data = await getYearPredictionById(id);
      if (data) {
        // Check premium status for best_case and worst_case scenarios
        if ((data.scenario_type === 'best_case' || data.scenario_type === 'worst_case') && !isPremium) {
          trackEvent(MixpanelEvents.YEAR_PREDICTION_PREMIUM_BLOCKED, {
            prediction_id: id,
            scenario_type: data.scenario_type,
            feature: 'year_prediction_view'
          });
          router.replace('/premium' as any);
          return;
        }
        setPrediction(data);
        
        // Track prediction viewed
        trackEvent(MixpanelEvents.YEAR_PREDICTION_VIEWED, {
          prediction_id: id,
          scenario_type: data.scenario_type,
          probability: data.probability_percentage
        });
      }
    } catch (error) {
      console.error('Failed to load prediction:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!user || !prediction || regenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRegenerating(true);

    try {
      // Build core pack
      const corePack = await buildCorePack(user.id, [user.id]);
      const userProfile = await getProfile(user.id);

      // Generate completely new prediction (AI will return both data and probability)
      const { data: newPredictionData, probability } = await generateYearPrediction({
        corePack,
        scenarioType: prediction.scenario_type,
        userProfile: userProfile || undefined,
      });

      // Update with new data and new probability
      const updated = await updateYearPrediction(
        prediction.id,
        newPredictionData,
        probability
      );

      setPrediction(updated);
      
      // Track regeneration
      trackEvent(MixpanelEvents.YEAR_PREDICTION_REGENERATED, {
        prediction_id: prediction.id,
        scenario_type: prediction.scenario_type,
        new_probability: probability
      });
    } catch (error) {
      console.error('Failed to regenerate prediction:', error);
      alert('Failed to regenerate prediction. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleShare() {
    if (!prediction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const data = prediction.prediction_data as YearPredictionData;
      
      // Get timeline events for January, March, November
      const timelineMonths = ['January', 'March', 'November'];
      const selectedTimelineEvents = data.timeline
        ?.filter(event => timelineMonths.includes(event.time))
        .slice(0, 3) || [];
      
      // Get key highlights (stats)
      const keyHighlights = data.stats?.slice(0, 2).map(stat => 
        `${stat.label}: ${stat.value}`
      ) || [];
      
      // Create one sentence summary from insights or hero
      const summary = data.insights && Array.isArray(data.insights) && data.insights.length > 0
        ? data.insights[0].split('.')[0] + '.'
        : data.hero.keyStat || data.hero.title;
      
      // Build shareable message
      let shareMessage = `My 2026 Prediction 🔮\n\n`;
      
      // Timeline
      if (selectedTimelineEvents.length > 0) {
        shareMessage += `Timeline:\n`;
        selectedTimelineEvents.forEach(event => {
          shareMessage += `• ${event.time}: ${event.title}\n`;
        });
        shareMessage += `\n`;
      }
      
      // Key Highlights
      if (keyHighlights.length > 0) {
        shareMessage += `Key Highlights:\n`;
        keyHighlights.forEach(highlight => {
          shareMessage += `• ${highlight}\n`;
        });
        shareMessage += `\n`;
      }
      
      // Summary
      shareMessage += `${summary}\n\n`;
      
      // Footer
      shareMessage += `Powered by Unreal\n`;
      shareMessage += `https://apps.apple.com/us/app/unreal-simulate-your-life/id6754901842`;
      
      await Share.share({
        message: shareMessage,
      });
      
      // Track share
      trackEvent(MixpanelEvents.YEAR_PREDICTION_SHARED, {
        prediction_id: prediction.id,
        scenario_type: prediction.scenario_type
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  function handleHome() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/home');
  }

  if (loading || regenerating) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButtonHeader}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <View style={styles.loadingOrbContainer}>
                <View style={styles.loadingOrb}>
                  <Text style={styles.loadingOrbEmoji}>🔮</Text>
                </View>
              </View>
              <Text style={styles.loadingTitle}>
                Simulating your 2026...
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
        </SafeAreaView>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={styles.screen}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prediction not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const predictionData = prediction.prediction_data as YearPredictionData;
  const scenarioType = prediction.scenario_type;
  
  const scenarioColors = {
    estimated: {
      primary: '#D4F238', // Neon Green/Yellow
      bg: 'rgba(212, 242, 56, 0.15)',
      text: '#D4F238',
      chartGradient: ['rgba(212, 242, 56, 0.4)', 'rgba(212, 242, 56, 0)'],
      label: 'Estimated Probability',
      badgeText: 'High Confidence',
    },
    best_case: {
      primary: '#8B5CF6', // Purple
      bg: 'rgba(139, 92, 246, 0.15)',
      text: '#A78BFA',
      chartGradient: ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0)'],
      label: 'Estimated Probability',
      badgeText: 'Optimistic',
    },
    worst_case: {
      primary: '#EF4444', // Red - only for worst case
      bg: 'rgba(239, 68, 68, 0.15)',
      text: '#F87171',
      chartGradient: ['rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0)'],
      label: 'Estimated Probability',
      badgeText: 'Pessimistic',
    },
  };

  const colors = scenarioColors[scenarioType];
  const isWorstCase = scenarioType === 'worst_case';
  
  // Helper function to remove em dashes and en dashes from any text
  const removeDashes = (text: string | undefined | null): string => {
    if (!text) return '';
    return text
      .replace(/—/g, '-') // Replace em dash with hyphen
      .replace(/–/g, '-') // Replace en dash with hyphen
      .trim();
  };

  // Normalize insights to always be an array (handle legacy string format)
  // Also remove em dashes and en dashes, replacing with regular hyphens or commas
  const normalizeInsights = (insights: any): string[] => {
    if (!insights) return [];
    const array = Array.isArray(insights) ? insights : typeof insights === 'string' ? [insights] : [];
    return array.map((text: string) => removeDashes(text));
  };
  const insightsArray = normalizeInsights(predictionData.insights);

  // Process all text fields to remove dashes
  const processedData = {
    hero: {
      title: removeDashes(predictionData.hero?.title),
      keyStat: removeDashes(predictionData.hero?.keyStat),
    },
    stats: predictionData.stats?.map(stat => ({
      label: removeDashes(stat.label),
      value: stat.value, // Keep value as-is (may contain - for negative numbers)
      description: removeDashes(stat.description),
    })) || [],
    timeline: predictionData.timeline?.map(event => ({
      time: event.time,
      title: removeDashes(event.title),
      description: removeDashes(event.description),
    })) || [],
    highlights: predictionData.highlights?.map(highlight => ({
      title: removeDashes(highlight.title),
      description: removeDashes(highlight.description),
      emoji: highlight.emoji,
    })) || [],
    focusAreas: predictionData.focusAreas?.map(area => removeDashes(area)) || [],
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Smaller Estimated Probability Card (only show if estimated) */}
          {scenarioType === 'estimated' && prediction.probability_percentage && (
            <Animated.View
              style={{
                opacity: estimatedCardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: estimatedCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                    extrapolate: 'clamp',
                  }),
                }],
              }}
            >
              {/* Page Header - Above Estimated Probability */}
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Your 2026 Prediction</Text>
              </View>
              <Text style={styles.cardLabel}>{colors.label}</Text>
              <View style={styles.smallMainCard}>
                <View style={styles.smallMainCardContent}>
                  <Text style={styles.smallMainValue}>
                    {prediction.probability_percentage ?? 75}%
                  </Text>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    <TrendingUp size={12} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{colors.badgeText}</Text>
                  </View>
                </View>
                
                {/* Smaller Chart */}
                <View style={styles.smallChartContainer}>
                  <Svg height="50" width="100%" preserveAspectRatio="none">
                    <Defs>
                      <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
                        <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
                      </SvgLinearGradient>
                    </Defs>
                    <Path
                      d="M0,30 C60,25 120,35 180,28 C240,20 300,32 360,25 V50 H0 Z"
                      fill="url(#grad)"
                    />
                    <Path
                      d="M0,30 C60,25 120,35 180,28 C240,20 300,32 360,25"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="2"
                    />
                  </Svg>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Header Card for Best Case and Worst Case */}
          {(scenarioType === 'best_case' || scenarioType === 'worst_case') && (
            <Animated.View
              style={{
                opacity: estimatedCardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: estimatedCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                    extrapolate: 'clamp',
                  }),
                }],
              }}
            >
              {/* Page Header */}
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>
                  {scenarioType === 'best_case' ? 'Your Best Case Scenario' : 'Your Worst Case Scenario'}
                </Text>
              </View>
              <Text style={styles.cardLabel}>{colors.label}</Text>
              <View style={styles.smallMainCard}>
                <View style={styles.smallMainCardContent}>
                  <Text style={styles.smallMainValue}>
                    {prediction.probability_percentage ? `${prediction.probability_percentage}%` : 'Analysis'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    {scenarioType === 'best_case' ? (
                      <TrendingUp size={12} color={colors.primary} />
                    ) : (
                      <TrendingDown size={12} color={colors.primary} />
                    )}
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{colors.badgeText}</Text>
                  </View>
                </View>
                
                {/* Smaller Chart */}
                <View style={styles.smallChartContainer}>
                  <Svg height="50" width="100%" preserveAspectRatio="none">
                    <Defs>
                      <SvgLinearGradient id={`grad-${scenarioType}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
                        <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
                      </SvgLinearGradient>
                    </Defs>
                    <Path
                      d="M0,30 C60,25 120,35 180,28 C240,20 300,32 360,25 V50 H0 Z"
                      fill={`url(#grad-${scenarioType})`}
                    />
                    <Path
                      d="M0,30 C60,25 120,35 180,28 C240,20 300,32 360,25"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="2"
                    />
                  </Svg>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Action Buttons Row (without Insights) */}
          <Animated.View
            style={{
              opacity: actionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              transform: [{
                translateY: actionsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                  extrapolate: 'clamp',
                }),
              }],
            }}
          >
            <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionItem} onPress={handleRegenerate} disabled={regenerating}>
              <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                {regenerating ? (
                  <RefreshCw size={24} color="#000000" />
                ) : (
                  <RefreshCw size={24} color="#000000" />
                )}
              </View>
              <Text style={styles.actionLabel}>Regenerate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
              <View style={styles.actionButtonSecondary}>
                <ShareIcon size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleHome}>
              <View style={styles.actionButtonSecondary}>
                <Home size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.actionLabel}>Home</Text>
            </TouchableOpacity>
          </View>
          </Animated.View>

          {/* Stats Grid (only show red for worst case) */}
          {processedData.stats && processedData.stats.length > 0 && (
            <Animated.View
              style={{
                opacity: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: statsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                    extrapolate: 'clamp',
                  }),
                }],
              }}
            >
              <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Key Highlights</Text>
              <View style={styles.statsContainer}>
              {processedData.stats.slice(0, 2).map((stat, index) => {
                // Format value
                let displayValue = stat.value;
                const isNegative = stat.value.includes('-') || stat.description.toLowerCase().includes('decrease') || stat.description.toLowerCase().includes('loss') || stat.description.toLowerCase().includes('decline');
                // For worst case: second card (index 1) is always red, or if it's negative
                const shouldBeRed = isWorstCase && (index === 1 || isNegative);
                
                return (
                  <View key={index} style={styles.statCard}>
                    <View style={styles.statIconHeader}>
                      <View style={[styles.statIconCircle, { 
                        backgroundColor: shouldBeRed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(46, 204, 113, 0.15)' 
                      }]}>
                        {shouldBeRed ? (
                          <TrendingDown size={20} color="#EF4444" />
                        ) : (
                          <ArrowUpRight size={20} color="#2ECC71" />
                        )}
                      </View>
                    </View>
                    <Text style={styles.statCardLabel}>{stat.label}</Text>
                    <Text style={[styles.statCardValue, shouldBeRed && { color: '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit>
                      {displayValue}
                    </Text>
                    <Text style={[styles.statCardTrend, { color: shouldBeRed ? '#EF4444' : '#2ECC71' }]}>
                      {stat.description}
                    </Text>
                  </View>
                );
              })}
              </View>
            </View>
            </Animated.View>
          )}

          {/* Expanded Timeline with Visual UI Elements */}
          {processedData.timeline && processedData.timeline.length > 0 && (
            <Animated.View
              style={{
                opacity: timelineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: timelineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                    extrapolate: 'clamp',
                  }),
                }],
              }}
            >
              <View style={styles.timelineSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Year Timeline</Text>
              </View>
              
              <View style={styles.timelineContainer}>
                {processedData.timeline.map((event, index) => {
                  const isLast = index === processedData.timeline.length - 1;
                  return (
                    <View key={index} style={styles.timelineItem}>
                      {/* Timeline Line and Dot */}
                      <View style={styles.timelineLineContainer}>
                        <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                        {!isLast && (
                          <View style={[styles.timelineConnector, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                      
                      {/* Timeline Content */}
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineCard}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={styles.timelineTime}>{event.time}</Text>
                          </View>
                          <Text style={styles.timelineTitle}>{event.title}</Text>
                          <Text style={styles.timelineDescription}>{event.description}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            </Animated.View>
          )}

          {/* Focus Areas - Only show for estimated scenario */}
          {scenarioType === 'estimated' && processedData.focusAreas && processedData.focusAreas.length > 0 && (
            <Animated.View
              style={{
                opacity: focusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: focusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                    extrapolate: 'clamp',
                  }),
                }],
              }}
            >
              <View style={styles.focusSection}>
              <Text style={styles.sectionTitle}>How to make the year better</Text>
              <View style={styles.focusCard}>
                {processedData.focusAreas.map((area, index) => (
                  <View key={index} style={[
                    styles.focusItem,
                    index === processedData.focusAreas.length - 1 && { marginBottom: 0 }
                  ]}>
                    <View style={styles.focusStepNumber}>
                      <Text style={styles.focusStepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.focusText}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
            </Animated.View>
          )}

          {/* In-Depth AI Insights */}
          {insightsArray.length > 0 && (
            <Animated.View
              style={{
                opacity: insightsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: insightsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                    extrapolate: 'clamp',
                  }),
                }],
              }}
            >
              <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Deep Analysis</Text>
              <View style={styles.insightCard}>
                {insightsArray.map((paragraph, index) => (
                  <Text key={index} style={styles.insightText}>
                    {paragraph}
                    {index < insightsArray.length - 1 && '\n\n'}
                  </Text>
                ))}
              </View>
            </View>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      </SafeAreaView>
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
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
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
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 0,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  smallMainCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    height: 160,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  smallMainCardContent: {
    padding: 20,
  },
  smallMainValue: {
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
  smallChartContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  
  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4F238',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonSecondary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 20,
  },
  statIconHeader: {
    marginBottom: 16,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    minHeight: 32,
  },
  statCardTrend: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 0,
  },

  // Timeline with Visual Elements
  timelineSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timelineContainer: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLineContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#000000',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    opacity: 0.3,
    minHeight: 40,
  },
  timelineContent: {
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timelineCardHeader: {
    marginBottom: 8,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  timelineDescription: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
  },
  
  // Insights
  insightsSection: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  insightText: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 26,
    flexWrap: 'wrap',
    flexShrink: 1,
    width: '100%',
  },
  
  // Focus Areas
  focusSection: {
    marginBottom: 20,
  },
  focusCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  focusStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4F238',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  focusStepNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  focusText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    flexShrink: 1,
  },
  
  // Loading/Error
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
    backgroundColor: 'rgba(212, 242, 56, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(212, 242, 56, 0.3)',
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
    backgroundColor: '#D4F238',
    shadowColor: '#D4F238',
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
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  backButton: {
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});



