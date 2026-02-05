import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, AlertTriangle, Save, RefreshCw, Sparkles, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { MOCK_SIMULATIONS } from '@/lib/career-sim/mockData';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CareerSimulation, AlternatePath } from '@/lib/career-sim/types';

type ModalType = 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox' | null;

export default function CareerSimResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    timeHorizon: string;
    currentRole: string;
    company: string;
    salary: string;
    pathType: string;
    generated?: string;
    simulationKey?: string;
    isStudent?: string;
    grade?: string;
    school?: string;
    studying?: string;
  }>();

  const { user } = useAuth();
  const { isPremium } = useTwin();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [simulation, setSimulation] = useState<CareerSimulation | null>(null);
  const [loading, setLoading] = useState(true);

  // Load simulation data (generated or mock)
  useEffect(() => {
    const loadSimulation = async () => {
      try {
        // If we have a generated simulation key, load it from storage
        if (params.generated === 'true' && params.simulationKey) {
          // Try loading from AsyncStorage first
          const storedData = await AsyncStorage.getItem(params.simulationKey);
          if (storedData) {
            try {
              const parsed = JSON.parse(storedData) as CareerSimulation;
              // Validate that we have the required simulation data
              if (parsed && (parsed.timeline || parsed.outcome || parsed.stats)) {
                setSimulation(parsed);
                
                // Automatically save newly generated simulation to database
                if (user?.id && !params.simulationKey.includes('saved_')) {
                  try {
                    // Determine currentRole and company based on whether user is a student
                    let currentRoleToSave = params.currentRole;
                    let companyToSave = params.company;
                    
                    if (params.isStudent === 'true') {
                      // For students, use studying as role and school as company
                      currentRoleToSave = params.studying || params.currentRole || `Student - ${params.grade || 'N/A'}`;
                      companyToSave = params.school || params.company;
                    }
                    
                    await saveCareerSimulation(user.id, {
                      timeHorizon: parseInt(params.timeHorizon || '10', 10),
                      pathType: (params.pathType || 'stay') as 'stay' | 'switch' | 'startup',
                      currentRole: currentRoleToSave || undefined,
                      company: companyToSave || undefined,
                      salary: params.salary || undefined,
                      simulationData: parsed as any,
                    });
                    console.log('Career simulation automatically saved to database');
                  } catch (saveError) {
                    console.error('Error auto-saving career simulation:', saveError);
                    // Don't block the UI if auto-save fails
                  }
                }
                
                setLoading(false);
                return;
              } else {
                console.warn('Invalid simulation data structure from storage:', parsed);
              }
            } catch (parseError) {
              console.error('Error parsing simulation data from storage:', parseError);
            }
          }
          
          // If loading from storage failed, try fetching from database (for saved sims)
          if (params.simulationKey.includes('saved_')) {
            // Extract UUID from storage key format: career_sim_<userId>_saved_<simId>
            const parts = params.simulationKey.split('_saved_');
            const simId = parts.length > 1 ? parts[parts.length - 1] : null;
            if (simId && user?.id) {
              try {
                const { getCareerSimulation } = await import('@/lib/storage');
                const savedSim = await getCareerSimulation(simId);
                if (savedSim) {
                  const simData = savedSim.simulation_data || savedSim.simulationData;
                  if (simData && (simData.timeline || simData.outcome || simData.stats)) {
                    setSimulation(simData as CareerSimulation);
                    // Also store it in AsyncStorage for next time
                    await AsyncStorage.setItem(params.simulationKey, JSON.stringify(simData));
                    setLoading(false);
                    return;
                  } else {
                    console.warn('Invalid simulation data structure from database:', simData);
                  }
                }
              } catch (dbError) {
                console.error('Error fetching simulation from database:', dbError);
              }
            }
          }
        }

        // Otherwise, use mock data
        const pathType = (params.pathType || 'stay') as 'stay' | 'switch' | 'startup';
        const mockKey = pathType === 'stay' ? 'stay-current-10y' : 
                       pathType === 'switch' ? 'switch-faang-10y' : 
                       'startup-cto-10y';
        const mockSimulation = MOCK_SIMULATIONS[mockKey] || MOCK_SIMULATIONS['stay-current-10y'];
        setSimulation(mockSimulation);
      } catch (error) {
        console.error('Error loading simulation:', error);
        // Fallback to mock data
        const pathType = (params.pathType || 'stay') as 'stay' | 'switch' | 'startup';
        const mockKey = pathType === 'stay' ? 'stay-current-10y' : 
                       pathType === 'switch' ? 'switch-faang-10y' : 
                       'startup-cto-10y';
        setSimulation(MOCK_SIMULATIONS[mockKey] || MOCK_SIMULATIONS['stay-current-10y']);
      } finally {
        setLoading(false);
      }
    };

    loadSimulation();
  }, [params.generated, params.simulationKey, params.pathType]);

  const pathType = (params.pathType || 'stay') as 'stay' | 'switch' | 'startup';

  // All hooks must be called before any conditional returns
  const handleZoomInPress = useCallback((type: 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox') => {
    setActiveModal(type);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleAlternatePathPress = useCallback(async (path: AlternatePath) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const pathMap: Record<string, 'stay' | 'switch' | 'startup'> = {
      'stay-current': 'stay',
      'switch-faang': 'switch',
      'startup-cto': 'startup',
      'ic-track': 'stay',
      'consulting': 'switch',
      'freelance': 'startup',
    };

    const newPathType = pathMap[path.id] || (params.pathType as 'stay' | 'switch' | 'startup') || 'stay';

    let baseSimulationKey: string | undefined;
    if (simulation) {
      const storageOwner = user?.id || 'anon';
      baseSimulationKey = `career_sim_base_${storageOwner}_${Date.now()}`;
      try {
        await AsyncStorage.setItem(baseSimulationKey, JSON.stringify(simulation));
      } catch (storageError) {
        console.warn('Failed to store base simulation for alternate path:', storageError);
        baseSimulationKey = undefined;
      }
    }

    router.push({
      pathname: '/career-sim/generating',
      params: {
        timeHorizon: params.timeHorizon || '10',
        currentRole: params.currentRole || '',
        company: params.company || '',
        salary: params.salary || '',
        pathType: newPathType,
        isStudent: params.isStudent || 'false',
        ...(params.grade && { grade: params.grade }),
        ...(params.school && { school: params.school }),
        ...(params.studying && { studying: params.studying }),
        ...(baseSimulationKey && { baseSimulationKey }),
        ...(path.label && { alternatePathLabel: path.label }),
        ...(path.year && { alternatePathYear: String(path.year) }),
        ...(path.decision && { alternatePathDecision: path.decision }),
      },
    });
  }, [params, router, simulation, user]);

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      alert('Please sign in to save your career path');
      return;
    }

    if (!simulation) {
      alert('No simulation data to save');
      return;
    }

    setIsSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Determine currentRole and company based on whether user is a student
      let currentRoleToSave = params.currentRole;
      let companyToSave = params.company;
      
      if (params.isStudent === 'true') {
        // For students, use studying as role and school as company
        currentRoleToSave = params.studying || params.currentRole || `Student - ${params.grade || 'N/A'}`;
        companyToSave = params.school || params.company;
      }
      
      await saveCareerSimulation(user.id, {
        timeHorizon: parseInt(params.timeHorizon || '10', 10),
        pathType: pathType,
        currentRole: currentRoleToSave || undefined,
        company: companyToSave || undefined,
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

  // Conditional returns after all hooks
  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <ActivityIndicator size="large" color={Colors.gradients.purple[0]} />
            <Text style={styles.errorText}>Loading simulation...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
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
          <View style={styles.headerRight} />
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
              <CareerOutcomeCard outcome={simulation.outcome} isPremium={isPremium} router={router} />
            </View>

            {/* SECTION 2: Zoom-Ins */}
            <View style={styles.section}>
              <ZoomInCard 
                cards={simulation.zoomIns?.cards}
                onZoomInPress={handleZoomInPress}
                isPremium={isPremium}
                router={router}
              />
            </View>

            {/* SECTION 3: Timeline */}
            <View style={styles.section}>
              <CareerTimeline timeline={simulation.timeline} />
            </View>

            {/* SECTION 4: Global Comparison */}
            <View style={styles.section}>
              <GlobalComparison globalComparison={simulation.globalComparison} isPremium={isPremium} router={router} />
            </View>

            {/* SECTION 5: Regret Moments */}
            <View style={styles.section}>
              <RegretMoments 
                regretMoments={simulation.zoomIns?.regretMoments}
                reflection={simulation.zoomIns?.reflection}
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

      </SafeAreaView>

      {/* Modals */}
      <TheEmailModal
        visible={activeModal === 'email'}
        onClose={handleCloseModal}
        emailData={simulation.zoomIns?.theEmail}
      />
      <RandomTuesdayModal
        visible={activeModal === 'tuesday'}
        onClose={handleCloseModal}
        tuesdayData={simulation.zoomIns?.randomTuesday}
      />
      <CalendarEvolutionModal
        visible={activeModal === 'calendar'}
        onClose={handleCloseModal}
        calendarData={simulation.zoomIns?.calendar}
      />
      <TeamFeedbackModal
        visible={activeModal === 'feedback'}
        onClose={handleCloseModal}
        feedbackData={simulation.zoomIns?.teamFeedback}
      />
      <InboxEvolutionModal
        visible={activeModal === 'inbox'}
        onClose={handleCloseModal}
        inboxData={simulation.zoomIns?.inbox}
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
  headerRight: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  horizonBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'center',
  },
  horizonText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
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
