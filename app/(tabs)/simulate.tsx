import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Image, NativeSyntheticEvent, NativeScrollEvent, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { Briefcase, ChevronRight, Heart, Brain, Zap, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { getCareerSimulations } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CareerSimulation } from '@/lib/career-sim/types';
import { trackEvent } from '@/lib/mixpanel';
import { useCareerSimCooldown } from '@/hooks/useCareerSimCooldown';
import { useTwin } from '@/store/useTwin';


const { width } = Dimensions.get('window');

const CARDS = [
  {
    id: 'career',
    title: 'Simulate Your\nCareer',
    subtitle: 'Clone your digital twin millions of times to find the highest probable lifeline.',
    icon: Briefcase,
    gradient: ['rgba(255, 20, 147, 0.1)', 'rgba(139, 92, 246, 0.1)'],
    iconColor: '#8B5CF6',
    action: '/career-sim/setup',
    type: 'active',
    buttonText: 'Start Simulation'
  },
  {
    id: 'relationships',
    title: 'Simulate your Relationship',
    subtitle: 'Clone your digital twin millions of times to find the highest probable lifeline.',
    icon: Heart,
    gradient: ['rgba(239, 68, 68, 0.1)', 'rgba(236, 72, 153, 0.1)'],
    iconColor: '#EC4899',
    type: 'coming_soon',
    buttonText: 'Coming Soon'
  },
  {
    id: 'decisions',
    title: 'Simulate your\nSocial Life',
    subtitle: 'Clone your digital twin millions of times to find the highest probable lifeline.',
    icon: Brain,
    gradient: ['rgba(59, 130, 246, 0.1)', 'rgba(147, 51, 234, 0.1)'],
    iconColor: '#3B82F6',
    type: 'coming_soon',
    buttonText: 'Coming Soon'
  }
];

export default function SimulateTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const { isOnCooldown, formattedTime } = useCareerSimCooldown();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSims, setRecentSims] = useState<any[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [loadingSims, setLoadingSims] = useState(false);

  // Load recent simulations
  useEffect(() => {
    const loadRecentSims = async () => {
      if (!user?.id) return;
      setLoadingSims(true);
      try {
        const sims = await getCareerSimulations(user.id);
        setRecentSims(sims.slice(0, 10)); // Get last 10
      } catch (error) {
        console.error('Error loading recent simulations:', error);
      } finally {
        setLoadingSims(false);
      }
    };
    loadRecentSims();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      // Fade in animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }).start();
      
      // Reload recent sims when tab is focused
      if (user?.id) {
        getCareerSimulations(user.id).then(sims => {
          setRecentSims(sims.slice(0, 10));
        }).catch(console.error);
      }
    }, [fadeAnim, user?.id])
  );

  const handleCardPress = useCallback((card: typeof CARDS[0]) => {
    if (card.id === 'career' && !isPremium && isOnCooldown) {
      // Don't allow navigation if on cooldown
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (card.type === 'active' && card.action) {
      // Track which card was clicked
      if (card.id === 'career') {
        trackEvent('Simulate - career-clicked');
      } else if (card.id === 'relationships') {
        trackEvent('Simulate - relationships-clicked');
      } else if (card.id === 'decisions') {
        trackEvent('Simulate - decisions-clicked');
      }
      // Redirect to the first step of the multi-page flow
      router.push('/career-sim/01-time-horizon');
    } else {
      // Track clicks on coming soon items
      if (card.id === 'relationships') {
        trackEvent('Simulate - relationships-clicked');
      } else if (card.id === 'decisions') {
        trackEvent('Simulate - decisions-clicked');
      }
    }
  }, [router, isPremium, isOnCooldown]);

  const handleLoadSimulation = useCallback(async (sim: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowRecentDropdown(false);
      
      // Track when user loads a recent simulation
      trackEvent('Simulate - recent-simulation-loaded', {
        simulation_id: sim.id,
        path_type: sim.path_type || sim.pathType,
        time_horizon: sim.time_horizon || sim.timeHorizon,
      });
      
      // Get simulation data (handle both database field names)
      const simulationData = sim.simulation_data || sim.simulationData;
      if (!simulationData) {
        console.error('No simulation data found for sim:', sim);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      
      // Store the simulation data temporarily for loading
      const storageKey = `career_sim_${user?.id}_saved_${sim.id}`;
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(simulationData)
      );
      
      // Navigate to result screen with the saved simulation
      router.push({
        pathname: '/career-sim/result',
        params: {
          timeHorizon: (sim.time_horizon || sim.timeHorizon || 10).toString(),
          currentRole: sim.role_title || sim.roleTitle || '',
          company: sim.company || '',
          salary: sim.salary || '',
          pathType: sim.path_type || sim.pathType || 'stay',
          generated: 'true',
          simulationKey: storageKey, // Use the full storage key
        },
      });
    } catch (error) {
      console.error('Error loading simulation:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [router, user?.id]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const getSimulationName = useCallback((sim: any) => {
    const simData = sim.simulation_data || sim.simulationData;
    
    // Check if this is a branch (alternate path) - look for alternate path metadata
    // This could be stored in simulation_data metadata or as a separate field
    if (simData?.alternatePathLabel || sim.alternate_path_label) {
      const branchName = simData?.alternatePathLabel || sim.alternate_path_label;
      return branchName;
    }
    
    // Regular simulation - return "Career Sim"
    return 'Career Sim';
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
      Haptics.selectionAsync();
    }
  };

  const renderCard = (card: typeof CARDS[0], index: number) => {
    const Icon = card.icon;
    const isCareerCard = card.id === 'career';
    const isDisabled = card.type === 'coming_soon' || (isCareerCard && !isPremium && isOnCooldown);
    
    return (
      <View key={card.id} style={styles.cardWrapper}>
        <TouchableOpacity
          onPress={() => handleCardPress(card)}
          activeOpacity={0.9}
          style={styles.cardContainer}
          disabled={isDisabled}
        >
          {/* 3D Edge Effect - Top */}
          <View style={styles.cardEdgeTop} />
          {/* 3D Edge Effect - Left */}
          <View style={styles.cardEdgeLeft} />
          {/* 3D Edge Effect - Right */}
          <View style={styles.cardEdgeRight} />
          {/* 3D Edge Effect - Bottom */}
          <View style={styles.cardEdgeBottom} />
          
          <View style={styles.cardInner}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F7FF']}
              style={styles.cardBackground}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={card.gradient}
                  style={styles.iconGradient}
                >
                  <Icon size={28} color={card.iconColor} strokeWidth={2.5} />
                </LinearGradient>
              </View>
              
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>

              <View style={styles.actionRow}>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionText, isDisabled && styles.disabledText]}>
                    {isCareerCard && !isPremium && isOnCooldown && formattedTime 
                      ? formattedTime 
                      : card.buttonText}
                  </Text>
                  {isCareerCard && !isPremium && isOnCooldown && formattedTime && (
                    <TouchableOpacity 
                      onPress={() => router.push('/premium')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cooldownSubtext}>
                        until next sim. Upgrade to mora+ for unlimited sims.
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.actionButton, isDisabled && styles.disabledButton]}>
                  <ChevronRight size={20} color={isDisabled ? Colors.textTertiary : "#FFFFFF"} strokeWidth={3} />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View 
          style={[styles.container, { opacity: fadeAnim }]} 
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                <Zap size={32} color={Colors.textPrimary} strokeWidth={2} />
                <Text style={styles.title}>Simulate</Text>
              </View>
              <Text style={styles.subtitle}>Experience possible futures</Text>
            </View>
            {user?.id && (
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowRecentDropdown(!showRecentDropdown);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.recentSimsButton}
                  >
                    {loadingSims ? (
                      <ActivityIndicator size="small" color="#696969" />
                    ) : (
                      <>
                        <Text style={styles.recentSimsText}>Recent</Text>
                        <ChevronDown 
                          size={12} 
                          color="#696969" 
                          strokeWidth={2}
                          style={[styles.dropdownIcon, showRecentDropdown && styles.dropdownIconRotated]}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                {showRecentDropdown && (
                  <>
                    <TouchableWithoutFeedback onPress={() => setShowRecentDropdown(false)}>
                      <View style={styles.dropdownOverlay} />
                    </TouchableWithoutFeedback>
                    <View style={styles.dropdown}>
                      {recentSims.length === 0 ? (
                        <View style={styles.dropdownEmpty}>
                          <Text style={styles.dropdownEmptyText}>No recent simulations</Text>
                        </View>
                      ) : (
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {recentSims.map((sim) => (
                            <TouchableOpacity
                              key={sim.id}
                              style={styles.dropdownItem}
                              onPress={() => handleLoadSimulation(sim)}
                            >
                              <View style={styles.dropdownItemContent}>
                                <Text style={styles.dropdownItemTitle}>
                                  {getSimulationName(sim)} - {sim.time_horizon || sim.timeHorizon}yr
                                </Text>
                                <Text style={styles.dropdownItemSubtitle}>
                                  {sim.role_title || 'No role'} {sim.company ? `@ ${sim.company}` : ''}
                                </Text>
                                <Text style={styles.dropdownItemDate}>
                                  {formatDate(sim.created_at)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Carousel */}
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.carouselContent}
            >
              {CARDS.map((card, index) => renderCard(card, index))}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {CARDS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeIndex ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          </View>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  safeArea: { 
    flex: 1 
  },
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: { 
    marginBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    position: 'relative',
    marginTop: 8,
  },
  recentSimsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
    gap: 6,
    overflow: 'hidden',
  },
  recentSimsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#696969',
    fontFamily: Fonts.secondary.bold,
    lineHeight: 16,
  },
  dropdownIcon: {
    transform: [{ rotate: '0deg' }],
  },
  dropdownIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: -200,
    right: -200,
    bottom: -1000,
    zIndex: 998,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 280,
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  dropdownEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemContent: {
    gap: 4,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  dropdownItemSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  dropdownItemDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    opacity: 0.7,
    marginTop: 2,
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    marginBottom: 4,
  },
  title: { 
    fontSize: 32, 
    fontFamily: Fonts.primary.semibold, 
    color: Colors.textPrimary 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    fontFamily: Fonts.secondary.regular,
    marginTop: 8,
  },
  carouselContainer: {
    flex: 1,
    paddingBottom: 100,
    marginTop: -20,
  },
  carouselContent: {
    alignItems: 'center',
  },
  cardWrapper: {
    width: width,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    position: 'relative',
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    height: 360,
  },
  // 3D Edge Effects
  cardEdgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    zIndex: 10,
  },
  cardEdgeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 40,
    borderBottomLeftRadius: 40,
    zIndex: 10,
  },
  cardEdgeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 10,
  },
  cardEdgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 10,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    padding: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: Fonts.secondary.regular,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  actionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  cooldownSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.regular,
    marginTop: 2,
    lineHeight: 14,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledText: {
    color: Colors.textSecondary,
    opacity: 0.6,
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
    shadowOpacity: 0,
    elevation: 0,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#1a1a1a',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#E5E5EA',
  },
});
