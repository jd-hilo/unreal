import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, AlertTriangle, Save, RefreshCw, Sparkles, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { MOCK_SIMULATIONS } from '@/lib/career-sim/mockData';
import { useAuth } from '@/store/useAuth';
import { saveCareerSimulation } from '@/lib/storage';
import { CareerOutcomeCard } from '@/components/career-sim/CareerOutcomeCard';
import { CareerTimeline } from '@/components/career-sim/CareerTimeline';
import { GlobalComparison } from '@/components/career-sim/GlobalComparison';
import { RegretMoments } from '@/components/career-sim/RegretMoments';
import { ZoomInCard } from '@/components/career-sim/ZoomInCard';
import { SocietalImpact } from '@/components/career-sim/SocietalImpact';
import { ComparePathsSection } from '@/components/career-sim/ComparePathsSection';
import { TheEmailModal } from '@/modals/career-sim/TheEmailModal';
import { RandomTuesdayModal } from '@/modals/career-sim/RandomTuesdayModal';
import { CalendarEvolutionModal } from '@/modals/career-sim/CalendarEvolutionModal';
import { TeamFeedbackModal } from '@/modals/career-sim/TeamFeedbackModal';
import { InboxEvolutionModal } from '@/modals/career-sim/InboxEvolutionModal';

type ModalType = 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox' | null;

export default function CareerSimResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    timeHorizon: string;
    currentRole: string;
    company: string;
    salary: string;
    pathType: string;
  }>();

  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get simulation data based on path type
  const pathType = (params.pathType || 'stay') as 'stay' | 'switch' | 'startup';
  const simulationKey = pathType === 'stay' ? 'stay-current-10y' : 
                       pathType === 'switch' ? 'switch-faang-10y' : 
                       'startup-cto-10y';
  const simulation = MOCK_SIMULATIONS[simulationKey] || MOCK_SIMULATIONS['stay-current-10y'];

  if (!simulation) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Simulation data not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const handleZoomInPress = useCallback((type: 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox') => {
    setActiveModal(type);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleAlternatePathPress = useCallback((pathId: string) => {
    // Map path IDs to path types
    const pathMap: Record<string, 'stay' | 'switch' | 'startup'> = {
      'stay-current': 'stay',
      'switch-faang': 'switch',
      'startup-cto': 'startup',
      'ic-track': 'stay',
      'consulting': 'switch',
      'freelance': 'startup',
    };

    const newPathType = pathMap[pathId] || 'stay';
    
    router.replace({
      pathname: '/career-sim/result',
      params: {
        ...params,
        pathType: newPathType,
      },
    });
  }, [params, router]);

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      alert('Please sign in to save your career path');
      return;
    }

    setIsSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await saveCareerSimulation(user.id, {
        timeHorizon: parseInt(params.timeHorizon || '10', 10),
        pathType: pathType,
        currentRole: params.currentRole || undefined,
        company: params.company || undefined,
        salary: params.salary || undefined,
        simulationData: simulation as any,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert('Career path saved! You can review it anytime.');
    } catch (error) {
      console.error('Error saving career simulation:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Failed to save career path. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user, params, pathType, simulation]);

  const handleNewSimulation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/career-sim/setup');
  }, [router]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return '#10B981';
    if (confidence >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 75) return 'HIGH CONFIDENCE';
    if (confidence >= 60) return 'MEDIUM CONFIDENCE';
    return 'LOW CONFIDENCE';
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace('/(tabs)/simulate');
            }} 
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>CAREER PROJECTION</Text>
            <View style={styles.horizonBadge}>
              <Text style={styles.horizonText}>{params.timeHorizon} YEAR HORIZON</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Save size={20} color={Colors.textPrimary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Sections Container */}
          <View style={styles.sectionsContainer}>
            {/* SECTION 1: Career Outcome Card */}
            <View style={styles.section}>
              <CareerOutcomeCard outcome={simulation.outcome} />
            </View>

            {/* SECTION 2: Zoom-Ins */}
            <View style={styles.section}>
              <ZoomInCard 
                cards={simulation.zoomIns.cards}
                onZoomInPress={handleZoomInPress} 
              />
            </View>

            {/* SECTION 3: Timeline */}
            <View style={styles.section}>
              <CareerTimeline timeline={simulation.timeline} />
            </View>

            {/* SECTION 4: Global Comparison */}
            <View style={styles.section}>
              <GlobalComparison globalComparison={simulation.globalComparison} />
            </View>

            {/* SECTION 5: Regret Moments */}
            <View style={styles.section}>
              <RegretMoments 
                regretMoments={simulation.zoomIns.regretMoments}
                reflection={simulation.zoomIns.reflection}
              />
            </View>

            {/* SECTION 6: Societal Impact */}
            <View style={styles.section}>
              <SocietalImpact societalImpact={simulation.societalImpact} />
            </View>

            {/* Alternate Paths */}
            <View style={styles.section}>
              <ComparePathsSection 
                alternatePaths={simulation.alternatePaths}
                onPathPress={handleAlternatePathPress}
              />
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={styles.ctaButtonWrapper}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradients.purple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={styles.ctaText}>
                {isSaving ? 'Saving...' : 'Save This Path'}
              </Text>
              {!isSaving && (
                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Modals */}
      <TheEmailModal
        visible={activeModal === 'email'}
        onClose={handleCloseModal}
        emailData={simulation.zoomIns.theEmail}
      />
      <RandomTuesdayModal
        visible={activeModal === 'tuesday'}
        onClose={handleCloseModal}
        tuesdayData={simulation.zoomIns.randomTuesday}
      />
      <CalendarEvolutionModal
        visible={activeModal === 'calendar'}
        onClose={handleCloseModal}
        calendarData={simulation.zoomIns.calendar}
      />
      <TeamFeedbackModal
        visible={activeModal === 'feedback'}
        onClose={handleCloseModal}
        feedbackData={simulation.zoomIns.teamFeedback}
      />
      <InboxEvolutionModal
        visible={activeModal === 'inbox'}
        onClose={handleCloseModal}
        inboxData={simulation.zoomIns.inbox}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1.5,
  },
  horizonBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  horizonText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  sectionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  ctaButtonWrapper: {
    borderRadius: 28,
    overflow: 'visible',
    shadowColor: Colors.gradients.purple[1],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 28,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.semibold,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: Colors.gradients.purple[1],
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
