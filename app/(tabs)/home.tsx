import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform, Modal, Easing, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, getInterestProgress, getTodayJournal } from '@/lib/storage';
import { Compass, Sparkles, Zap, X, Trash2, Lock, ChevronRight, HelpCircle, Book, User, History, LayoutGrid, ScanLine, Settings } from 'lucide-react-native';
import { CompassGradientIcon, StarGradientIcon } from '@/components/GradientIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { formatDistanceToNow } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { ProductGuide } from '@/components/ProductGuide';
import { getHasSeenDecisionGuide, setHasSeenDecisionGuide } from '@/lib/guideStorage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

const { width } = Dimensions.get('window');
const CARD_GAP = 16;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { checkOnboardingStatus, isPremium } = useTwin();
  const [userName, setUserName] = useState('');
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [recentWhatIfs, setRecentWhatIfs] = useState<any[]>([]);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(true);
  const [profileProgress, setProfileProgress] = useState(100); // Default to 100 to hide initially
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'decision' | 'whatif'; title: string } | null>(null);
  const [interestProgress, setInterestProgress] = useState(0);
  const [hasTodayJournal, setHasTodayJournal] = useState(false);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const [hasCheckedGuide, setHasCheckedGuide] = useState(false);
  const [decisionCardLayout, setDecisionCardLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [whatIfCardLayout, setWhatIfCardLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [journalCardLayout, setJournalCardLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [twinCardLayout, setTwinCardLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [guideStep, setGuideStep] = useState(0);
  const whatIfHoverAnim = useRef(new Animated.Value(0)).current;
  const decisionCardRef = useRef<View>(null);
  const whatIfCardRef = useRef<View>(null);
  const journalCardRef = useRef<View>(null);
  const twinCardRef = useRef<View>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Preload images
    Asset.fromModule(require('@/assets/images/compass.png')).downloadAsync();
    Asset.fromModule(require('@/assets/images/star.png')).downloadAsync();
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    // Check onboarding status from database
    checkOnboardingStatus(user.id)
      .then(() => {
        const isComplete = useTwin.getState().onboardingComplete;
        if (!isComplete) {
          router.replace('/onboarding/00-name');
          return;
        }
        loadData();
      })
      .catch((error) => {
        console.warn('Failed to confirm onboarding status:', error);
        setIsLoadingDecisions(false);
      });
  }, [user, router, checkOnboardingStatus]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && useTwin.getState().onboardingComplete) {
        console.log('Home screen focused - reloading data');
        loadData();
        // Check if guide should be shown when navigating to home
        // Check if guide was reset (user might have clicked "Show Product Guide" from profile)
        checkGuideStatus();
      }
    }, [user])
  );

  async function checkGuideStatus() {
    if (!user) return;
    try {
      const hasSeenGuide = await getHasSeenDecisionGuide();
      // If guide hasn't been seen (either first time or manually reset from profile), show it
      if (!hasSeenGuide) {
        const decisions = await getDecisions(user.id, 1);
        // Always show guide if it hasn't been seen (either first time or manually reset)
        setGuideStep(0);
        setShowDecisionGuide(true);
        trackEvent(decisions.length === 0 ? 'Product Guide Viewed' : 'Product Guide Replayed');
        setHasCheckedGuide(true);
      }
    } catch (error) {
      console.error('Failed to check guide status:', error);
    }
  }

  async function loadData() {
    if (!user) return;

    try {
      const profile = await getProfile(user.id);
      
      if (profile?.first_name) {
        setUserName(profile.first_name);
      } else {
        setUserName('');
      }

      const [decisions, whatIfs, relationships, progress, todayJournal] = await Promise.all([
        getDecisions(user.id, 5),
        getWhatIfs(user.id, 5),
        getRelationships(user.id),
        getInterestProgress(user.id).catch(() => 0),
        getTodayJournal(user.id).catch(() => null)
      ]);
      setRecentDecisions(decisions);
      setRecentWhatIfs(whatIfs);
      setInterestProgress(progress);
      setHasTodayJournal(!!todayJournal);

      // Check if we should show the decision guide
      await checkGuideStatus();
      
      // Calculate profile progress
      if (profile) {
        const onboardingResponses = profile?.core_json?.onboarding_responses || {};
        const university = profile?.university || onboardingResponses.university;
        const hometown = profile?.hometown || onboardingResponses.hometown;
        const hasRelationships = relationships && relationships.length > 0;
        
        // Count completed sections (same logic as profile page)
        const completedSections = [
          onboardingResponses['01-now'],
          onboardingResponses['02-path'],
          onboardingResponses['03-values'],
          onboardingResponses['04-style'],
          onboardingResponses['05-day'],
          onboardingResponses['06-stress'],
          university,
          hometown,
          profile?.current_location,
          profile?.net_worth,
          profile?.political_views,
          hasRelationships
        ].filter(Boolean).length;
        
        const totalSections = 12;
        const progress = Math.round((completedSections / totalSections) * 100);
        setProfileProgress(progress);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoadingDecisions(false);
      
      // Trigger fade-in animation after data loads
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }

  async function checkAndShowRatingPrompt() {
    if (Platform.OS !== 'ios') return;

    try {
      // Check if rating has been requested before
      const hasRequestedRating = await AsyncStorage.getItem('hasRequestedRating');
      if (hasRequestedRating) return;

      const isAvailable = await StoreReview.hasAction();
      if (isAvailable) {
        await StoreReview.requestReview();
        await AsyncStorage.setItem('hasRequestedRating', 'true');
        
        // Track review prompt requested
        trackEvent(MixpanelEvents.REVIEW_PROMPT_REQUESTED);
      }
    } catch (error) {
      console.warn('Failed to show rating prompt:', error);
    }
  }

  function getRelativeUpdate(dateInput?: string | null) {
    if (!dateInput) return 'Tap to revisit';

    try {
      const parsed = new Date(dateInput);
      if (Number.isNaN(parsed.getTime())) {
        return 'Tap to revisit';
      }

      return `Updated ${formatDistanceToNow(parsed, { addSuffix: true })}`;
    } catch (error) {
      console.warn('Failed to format decision timestamp:', error);
      return 'Tap to revisit';
    }
  }

  function handleLongPressEcho(echo: any) {
    if (echo.isPlaceholder) return;
    
    setItemToDelete({
      id: echo.id,
      type: echo.type,
      title: echo.title
    });
    setDeleteModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'decision') {
        await deleteDecision(itemToDelete.id);
      } else if (itemToDelete.type === 'whatif') {
        await deleteWhatIf(itemToDelete.id);
      }

      // Reload data
      await loadData();
      
      setDeleteModalVisible(false);
      setItemToDelete(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete item. Please try again.');
    }
  }

  // Merge decisions and what-ifs, sort by date
  const echoEntries = [
    ...recentDecisions.map((decision) => ({
        id: decision.id,
        type: 'decision' as const,
        title: decision.question || 'Untitled Decision',
        subtitle: getRelativeUpdate(decision.updated_at || decision.created_at),
        detail: decision?.prediction?.prediction || 'Revisit this path.',
        route: `/decision/${decision.id}` as const,
        isPlaceholder: false,
        timestamp: new Date(decision.updated_at || decision.created_at).getTime(),
    })),
    ...recentWhatIfs.map((whatIf) => ({
      id: whatIf.id,
      type: 'whatif' as const,
      title: whatIf.payload?.question || 'What If Scenario',
      subtitle: getRelativeUpdate(whatIf.created_at),
      detail: 'Explore alternate reality',
      route: `/whatif/${whatIf.id}` as const,
      isPlaceholder: false,
      timestamp: new Date(whatIf.created_at).getTime(),
    }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Animated.ScrollView
            style={[styles.scrollView, { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <View style={styles.topBarIcons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowDecisionGuide(true);
                    setGuideStep(0);
                  }}
                >
                  <HelpCircle size={24} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/(tabs)/profile');
                  }}
                >
                  <Settings size={24} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
              
              {(!isPremium || isPremium === undefined) && (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/premium');
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.upgradeButtonGradient}
                  >
                    <View style={styles.iconWrapper}>
                      <Image 
                        source={require('@/assets/images/premium.png')} 
                        style={styles.premiumIcon} 
                        resizeMode="contain" 
                      />
                    </View>
                    <Text style={styles.upgradeButtonText}>unlock unreal+</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>
                <Text style={styles.greetingName}>Hi {userName || 'Friend'},{'\n'}</Text>
                <Text style={styles.greetingRest}>How can I help{'\n'}you today?</Text>
              </Text>
            </View>

            {/* Grid Actions */}
            <View style={styles.gridContainer}>
              {/* Card 1: Decision */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/decision/new');
                }}
                activeOpacity={0.8}
                style={styles.gridCardWrapper}
              >
                <Animated.View 
                  ref={decisionCardRef}
                  style={styles.gridCard}
                  onLayout={() => {
                    decisionCardRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
                      setDecisionCardLayout({ x, y, width, height });
                    });
                  }}
                >
                  <BlurView intensity={40} tint="dark" style={styles.gridCardBlur}>
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconContainer}>
                        <Image 
                          source={require('@/assets/images/compass.png')}
                          style={styles.gridIconImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.gridCardTitle}>Decide</Text>
                      <Text style={styles.gridCardSubtitle}>Make a choice, simulate the outcomes</Text>
                    </View>
                  </BlurView>
                </Animated.View>
              </TouchableOpacity>

              {/* Card 2: What If */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/whatif/new');
                }}
                activeOpacity={0.8}
                style={styles.gridCardWrapper}
              >
                <Animated.View 
                  ref={whatIfCardRef}
                  style={styles.gridCard}
                  onLayout={() => {
                    whatIfCardRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
                      setWhatIfCardLayout({ x, y, width, height });
                    });
                  }}
                >
                  <BlurView intensity={40} tint="dark" style={styles.gridCardBlur}>
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconContainer}>
                        <Image 
                          source={require('@/assets/images/star.png')}
                          style={styles.gridIconImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.gridCardTitle}>Explore</Text>
                      <Text style={styles.gridCardSubtitle}>See your alternate life</Text>
                    </View>
                  </BlurView>
                </Animated.View>
              </TouchableOpacity>

              {/* Card 3: Journal */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/journal' as any);
                }}
                activeOpacity={0.8}
                style={styles.gridCardWrapper}
              >
                <View 
                  ref={journalCardRef}
                  style={styles.gridCard}
                  onLayout={() => {
                    journalCardRef.current?.measureInWindow((x, y, width, height) => {
                      setJournalCardLayout({ x, y, width, height });
                    });
                  }}
                >
                  <BlurView intensity={40} tint="dark" style={styles.gridCardBlur}>
                    {!hasTodayJournal && (
                      <View style={styles.notificationDot} />
                    )}
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconContainer}>
                         <Book size={32} color="#FFFFFF" strokeWidth={1.5} />
                      </View>
                      <Text style={styles.gridCardTitle}>Journal</Text>
                      <Text style={styles.gridCardSubtitle}>
                        {hasTodayJournal ? 'Entry complete' : 'Daily reflection'}
                      </Text>
                    </View>
                  </BlurView>
                </View>
              </TouchableOpacity>

              {/* Card 4: Twin Status */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/profile');
                }}
                activeOpacity={0.8}
                style={styles.gridCardWrapper}
              >
                <View 
                  ref={twinCardRef}
                  style={[styles.gridCard, profileProgress === 100 && styles.fullyTrainedCard]}
                  onLayout={() => {
                    twinCardRef.current?.measureInWindow((x, y, width, height) => {
                      setTwinCardLayout({ x, y, width, height });
                    });
                  }}
                >
                  {profileProgress === 100 && (
                    <LinearGradient
                      colors={['rgba(135, 206, 250, 0.3)', 'rgba(100, 149, 237, 0.2)', 'rgba(65, 105, 225, 0.15)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.twinGlowOverlay}
                      pointerEvents="none"
                    />
                  )}
                  <BlurView intensity={40} tint="dark" style={styles.gridCardBlur}>
                    {profileProgress < 100 && (
                       <View style={styles.progressBadge}>
                         <Text style={styles.progressBadgeText}>{profileProgress}%</Text>
                       </View>
                    )}
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconContainer}>
                        <Image 
                          source={isPremium ? require('@/assets/images/premium.png') : require('@/assets/images/cube.png')}
                          style={[styles.gridIconImage, { tintColor: undefined }]}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.gridCardTitle}>My Twin</Text>
                      <Text style={styles.gridCardSubtitle}>
                        {profileProgress === 100 ? 'Fully trained' : 'Training...'}
                      </Text>
                    </View>
                  </BlurView>
                </View>
              </TouchableOpacity>
            </View>

            {/* Recent Activity / Echoes */}
            {echoEntries.length > 0 && (
              <View style={styles.echoSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.echoScrollContent}
                  style={styles.echoScrollView}
                >
                  {echoEntries.map((echo) => (
                  <TouchableOpacity
                    key={echo.id}
                    style={styles.echoCardWrapper}
                    activeOpacity={echo.route ? 0.8 : 1}
                    onPress={() => {
                      if (echo.route) {
                        router.push(echo.route as any);
                      }
                    }}
                    onLongPress={() => handleLongPressEcho(echo)}
                    disabled={!echo.route}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.echoCard}>
                      <View style={styles.echoIcon}>
                        {echo.type === 'whatif' ? (
                          <Sparkles size={16} color="#B4B4B4" />
                        ) : (
                          <Compass size={16} color="#B4B4B4" />
                        )}
                      </View>
                      <View style={styles.echoContent}>
                        <Text style={styles.echoTitle} numberOfLines={1}>
                          {echo.title}
                        </Text>
                        <Text style={styles.echoMeta} numberOfLines={1}>
                          {echo.subtitle}
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#666" />
                    </BlurView>
                  </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Animated.ScrollView>
        </SafeAreaView>
      </View>

      {/* Product Guide */}
      {showDecisionGuide && (
        <ProductGuide
          visible={showDecisionGuide}
          onDismiss={async () => {
            await setHasSeenDecisionGuide();
            setShowDecisionGuide(false);
            setGuideStep(0);
            trackEvent('Product Guide Skipped');
            setTimeout(() => {
              checkAndShowRatingPrompt();
            }, 1000);
          }}
          onComplete={async () => {
            await setHasSeenDecisionGuide();
            setShowDecisionGuide(false);
            setGuideStep(0);
            trackEvent('Product Guide Completed');
            setTimeout(() => {
              checkAndShowRatingPrompt();
            }, 1000);
          }}
          targetCardLayout={decisionCardLayout}
          whatIfCardLayout={whatIfCardLayout}
          journalCardLayout={journalCardLayout}
          twinCardLayout={twinCardLayout}
          userId={user?.id}
          onStepChange={setGuideStep}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconContainer}>
                <Trash2 size={24} color="#EF4444" />
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setDeleteModalVisible(false);
                  setItemToDelete(null);
                }}
                style={styles.deleteModalCloseButton}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.deleteModalTitle}>Delete {itemToDelete?.type === 'decision' ? 'Decision' : 'What If'}?</Text>
            <Text style={styles.deleteModalDescription}>"{itemToDelete?.title}"</Text>
            <Text style={styles.deleteModalWarning}>This action cannot be undone.</Text>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setDeleteModalVisible(false);
                  setItemToDelete(null);
                }}
                style={styles.deleteCancelButton}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmDelete}
                style={styles.deleteConfirmButtonWrapper}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626', '#B91C1C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.deleteConfirmButton}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#050505',
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  upgradeButton: {
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 140,
  },
  upgradeButtonGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumIcon: {
    width: 18,
    height: 18,
  },
  upgradeButtonText: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
    letterSpacing: -0.5,
  },
  greetingName: {
    color: '#999999',
  },
  greetingRest: {
    color: '#FFFFFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 40,
  },
  gridCardWrapper: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.1, // Slightly taller than wide
    borderRadius: 32,
    overflow: 'hidden',
  },
  gridCard: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  fullyTrainedCard: {
    shadowColor: '#87CEFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 15,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  twinGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    zIndex: 0,
  },
  gridCardBlur: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  gridCardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 0,
  },
  gridIconContainer: {
    marginBottom: 16,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  gridIconImage: {
    width: 48,
    height: 48,
  },
  gridCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 24,
  },
  gridCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
  },
  progressBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#87CEFA',
  },
  echoSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  echoScrollView: {
    marginHorizontal: -20,
  },
  echoScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  echoCardWrapper: {
    width: width * 0.7,
  },
  echoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  echoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  echoContent: {
    flex: 1,
  },
  echoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  echoMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  // Retain Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  deleteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCloseButton: {
    padding: 4,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  deleteModalDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  deleteModalWarning: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteConfirmButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteConfirmButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
