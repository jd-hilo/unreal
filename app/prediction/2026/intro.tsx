import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getYearPrediction } from '@/lib/storage';
import { BlurView } from 'expo-blur';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function PredictionIntroScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [hasEstimated, setHasEstimated] = useState(false);
  const [hasBestCase, setHasBestCase] = useState(false);
  const [hasWorstCase, setHasWorstCase] = useState(false);
  
  const [probability, setProbability] = useState<number | null>(null);
  const [bestCaseStat, setBestCaseStat] = useState<string | null>(null);
  const [worstCaseStat, setWorstCaseStat] = useState<string | null>(null);
  
  const [estimatedId, setEstimatedId] = useState<string | null>(null);
  const [bestCaseId, setBestCaseId] = useState<string | null>(null);
  const [worstCaseId, setWorstCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadExistingPredictions();
      trackEvent(MixpanelEvents.YEAR_PREDICTION_INTRO_VIEWED);
    }
  }, [user]);

  async function loadExistingPredictions() {
    if (!user) return;

    try {
      const [estimated, bestCase, worstCase] = await Promise.all([
        getYearPrediction(user.id, 'estimated'),
        getYearPrediction(user.id, 'best_case'),
        getYearPrediction(user.id, 'worst_case'),
      ]);

      setHasEstimated(!!estimated);
      setHasBestCase(!!bestCase);
      setHasWorstCase(!!worstCase);

      if (estimated) {
        setEstimatedId(estimated.id);
        if (estimated.probability_percentage) {
          setProbability(estimated.probability_percentage);
        }
      }
      if (bestCase) {
        setBestCaseId(bestCase.id);
        if (bestCase.prediction_data?.hero?.keyStat) {
          setBestCaseStat(bestCase.prediction_data.hero.keyStat);
        }
      }
      if (worstCase) {
        setWorstCaseId(worstCase.id);
        if (worstCase.prediction_data?.hero?.keyStat) {
          setWorstCaseStat(worstCase.prediction_data.hero.keyStat);
        }
      }
    } catch (error) {
      console.error('Failed to load existing predictions:', error);
    }
  }

  function handleSelectScenario(scenario: 'estimated' | 'best_case' | 'worst_case') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check premium status for best_case and worst_case scenarios
    if ((scenario === 'best_case' || scenario === 'worst_case') && !isPremium) {
      trackEvent(MixpanelEvents.YEAR_PREDICTION_PREMIUM_BLOCKED, {
        scenario_type: scenario,
        feature: 'year_prediction_scenario'
      });
      router.push('/premium' as any);
      return;
    }
    
    // Track scenario selection
    const existingId = 
      scenario === 'estimated' ? estimatedId :
      scenario === 'best_case' ? bestCaseId :
      worstCaseId;
    
    trackEvent(MixpanelEvents.YEAR_PREDICTION_SCENARIO_SELECTED, {
      scenario_type: scenario,
      has_existing: !!existingId
    });
    
    if (existingId) {
      router.push(`/prediction/2026/${existingId}`);
    } else {
      router.push(`/prediction/2026/generate?scenario=${scenario}`);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Your 2026 Simulations</Text>
              <Text style={styles.subtitle}>Explore your future scenarios</Text>
            </View>
          </View>

          {/* Main Card: Most Likely / Estimated */}
          <TouchableOpacity
            onPress={() => handleSelectScenario('estimated')}
            activeOpacity={0.9}
            style={styles.mainCard}
          >
            <View style={styles.mainCardContent}>
              <Text style={styles.mainCardLabel}>Your 2026 Prediction</Text>
              <Text style={styles.mainCardTitle}>Most Likely</Text>
              <View style={styles.buttonContainer}>
                <Text style={styles.actionButton}>
                  {hasEstimated ? 'View Results' : 'Simulate'}
                </Text>
              </View>
              <Sparkles size={64} color="#D4F238" strokeWidth={2.5} style={styles.mainCardIcon} />
            </View>
          </TouchableOpacity>

          {/* Side Options */}
          <View style={styles.sideOptions}>
            {/* Best Case Scenario */}
            <TouchableOpacity
              onPress={() => handleSelectScenario('best_case')}
              activeOpacity={0.8}
              style={[styles.sideCard, !isPremium && styles.sideCardLocked]}
              disabled={false}
            >
              <View style={styles.sideCardContent}>
                {!isPremium && (
                  <View style={styles.lockOverlay}>
                    <BlurView intensity={20} tint="dark" style={styles.lockBlur}>
                      <Lock size={20} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.lockText}>unreal+</Text>
                    </BlurView>
                  </View>
                )}
                <Text style={styles.sideCardLabel}>Your 2026 Prediction</Text>
                <Text style={[styles.sideCardTitle, !isPremium && styles.sideCardTitleLocked]} numberOfLines={1}>Best Case</Text>
                <View style={styles.buttonContainer}>
                  <Text style={[styles.actionButton, !isPremium && styles.actionButtonLocked]}>
                    {hasBestCase ? 'View Results' : 'Simulate'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Worst Case Scenario */}
            <TouchableOpacity
              onPress={() => handleSelectScenario('worst_case')}
              activeOpacity={0.8}
              style={[styles.sideCard, !isPremium && styles.sideCardLocked]}
              disabled={false}
            >
              <View style={styles.sideCardContent}>
                {!isPremium && (
                  <View style={styles.lockOverlay}>
                    <BlurView intensity={20} tint="dark" style={styles.lockBlur}>
                      <Lock size={20} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.lockText}>unreal+</Text>
                    </BlurView>
                  </View>
                )}
                <Text style={styles.sideCardLabel}>Your 2026 Prediction</Text>
                <Text style={[styles.sideCardTitle, !isPremium && styles.sideCardTitleLocked]} numberOfLines={1}>Worst Case</Text>
                <View style={styles.buttonContainer}>
                  <Text style={[styles.actionButton, !isPremium && styles.actionButtonLocked]}>
                    {hasWorstCase ? 'View Results' : 'Simulate'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
    gap: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  
  // Main Card Styles
  mainCard: {
    borderRadius: 32,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
    minHeight: 180,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mainCardContent: {
    padding: 24,
    flex: 1,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  mainCardIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    opacity: .6,
  },
  mainCardLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  mainCardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  actionButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4F238',
  },
  actionButtonLocked: {
    color: '#6B7280',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  lockBlur: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Side Options
  sideOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  sideCard: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sideCardLocked: {
    opacity: 0.6,
  },
  sideCardContent: {
    padding: 20,
    flex: 1,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  sideCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  sideCardTitleLocked: {
    color: '#6B7280',
  },
  sideCardLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 6,
  },
});



