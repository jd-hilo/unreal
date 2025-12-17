import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform, Modal, Easing, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, getInterestProgress, getTodayJournal, getAllYearPredictions } from '@/lib/storage';
import { Compass, Sparkles, Zap, X, Trash2, Lock, ChevronRight, HelpCircle, Book, User, History, LayoutGrid, ScanLine, Settings, Info, Layers } from 'lucide-react-native';
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
import { trackEvent, MixpanelEvents, trackScreenView } from '@/lib/mixpanel';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText, TSpan, Path } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/Theme';

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
  const [hasYearPrediction, setHasYearPrediction] = useState(false);
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);
  const [abTestGroup, setAbTestGroup] = useState<'A' | 'B' | null>(null);
  const whatIfHoverAnim = useRef(new Animated.Value(0)).current;
  const decisionCardRef = useRef<View>(null);
  const whatIfCardRef = useRef<View>(null);
  const journalCardRef = useRef<View>(null);
  const twinCardRef = useRef<View>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bannerHoverAnim = useRef(new Animated.Value(0)).current;
  const bannerContinuousHover = useRef(new Animated.Value(0)).current;
  const twinFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Preload images
    Asset.fromModule(require('@/assets/images/compass.png')).downloadAsync();
    Asset.fromModule(require('@/assets/images/star.png')).downloadAsync();

    // Continuous subtle hover animation (floating effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(twinFloatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(twinFloatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

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
    // Product guide is no longer shown automatically
    // Users can still access it manually via the help button
    return;
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

      const [decisions, whatIfs, relationships, progress, todayJournal, yearPredictions] = await Promise.all([
        getDecisions(user.id, 5),
        getWhatIfs(user.id, 5),
        getRelationships(user.id),
        getInterestProgress(user.id).catch(() => 0),
        getTodayJournal(user.id).catch(() => null),
        getAllYearPredictions(user.id).catch(() => [])
      ]);
      setRecentDecisions(decisions);
      setRecentWhatIfs(whatIfs);
      setInterestProgress(progress);
      setHasTodayJournal(!!todayJournal);
      setHasYearPrediction(yearPredictions.length > 0);

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
        
        // Set AB Test Group
        setAbTestGroup(profile?.ab_test_group || null);
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
        <StatusBar style="dark" />
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
              <View style={styles.logoContainer}>
                 <Image 
                   source={require('@/assets/images/unreallogo.png')}
                   style={styles.logoImage}
                   resizeMode="contain"
                 />
              </View>
              <View style={styles.topBarIcons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowDecisionGuide(true);
                    setGuideStep(0);
                  }}
                >
                  <HelpCircle size={24} color={Colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    await AsyncStorage.setItem('previous_route_before_profile', '/(tabs)/home');
                    router.push('/(tabs)/profile');
                  }}
                >
                  <Settings size={24} color={Colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>
                <Text style={styles.greetingName}>Hi {userName || 'Friend'},{'\n'}</Text>
                <Text style={styles.greetingRest}>How can I help{'\n'}you today?</Text>
              </Text>
            </View>

            {/* Center: Twin Avatar with Progress Bar */}
            <View style={styles.twinSection}>
              {/* Training Card */}
              <View style={styles.trainingCard}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarLabel}>
                    <View style={styles.accuracyHeader}>
                      <Text style={styles.progressBarLabelText}>Training Accuracy</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowAccuracyInfo(true);
                        }}
                        style={styles.infoButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Info size={14} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.progressBarPercent}>{profileProgress}%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <Animated.View 
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${profileProgress}%`,
                        }
                      ]}
                    >
                      <LinearGradient
                        colors={Colors.gradients.turquoise}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  </View>
                </View>
              </View>

              {/* Twin Area Wrapper */}
              <View style={styles.twinAreaWrapper}>
                {/* Floating Twin Emoji */}
                <Animated.View
                  style={[
                    styles.twinAvatarContainer,
                    {
                      transform: [
                        {
                          translateY: twinFloatAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.twinAvatar}>
                    <Text style={styles.twinEmoji}>🤖</Text>
                  </View>
                </Animated.View>

                {/* Suggestions Bubbles (Static) */}
                <TouchableOpacity 
                  style={[styles.suggestionBubble, { position: 'absolute', top: -60, left: 100, transform: [{ rotate: '-5deg' }] }]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/whatif/new')}
                >
                  <Text style={styles.suggestionText}>What if I moved to London?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.suggestionBubble, { position: 'absolute', top: 100, right: 100, transform: [{ rotate: '3deg' }] }]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/decision/new')}
                >
                  <Text style={styles.suggestionText}>Should I buy a house?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.suggestionBubble, { position: 'absolute', bottom: -60, left: 120, transform: [{ rotate: '-2deg' }] }]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/whatif/new')}
                >
                  <Text style={styles.suggestionText}>Quit my job?</Text>
                </TouchableOpacity>
              </View>
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
                    <View style={styles.echoCard}>
                      <View style={styles.echoIcon}>
                        {echo.type === 'whatif' ? (
                          <Sparkles size={16} color={Colors.textTertiary} />
                        ) : (
                          <Compass size={16} color={Colors.textTertiary} />
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
                      <ChevronRight size={16} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Animated.ScrollView>

          {/* Actions Carousel at Bottom - Fixed */}
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              style={styles.carouselScrollView}
              decelerationRate="fast"
              snapToAlignment="start"
            >
              {/* Card 1: Decide */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/decision/new');
                }}
                activeOpacity={0.8}
                style={styles.carouselCardWrapper}
              >
                <View style={styles.carouselCard}>
                  <LinearGradient
                    colors={Colors.gradients.peach}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  />
                  <View style={styles.gridCardContent}>
                    <View style={styles.gridIconContainer}>
                      <Image 
                        source={require('@/assets/images/compass.png')}
                        style={[styles.gridIconImage, { tintColor: Colors.textPrimary }]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.gridCardTitle}>Decide</Text>
                    <Text style={styles.gridCardSubtitle} numberOfLines={2}>Make a choice</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card 2: Explore */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/whatif/new');
                }}
                activeOpacity={0.8}
                style={styles.carouselCardWrapper}
              >
                <View style={styles.carouselCard}>
                  <LinearGradient
                    colors={Colors.gradients.purple}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  />
                  <View style={styles.gridCardContent}>
                    <View style={styles.gridIconContainer}>
                      <Image 
                        source={require('@/assets/images/star.png')}
                        style={[styles.gridIconImage, { tintColor: Colors.textPrimary }]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.gridCardTitle}>Explore</Text>
                    <Text style={styles.gridCardSubtitle} numberOfLines={2}>Alternate reality</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card 3: Journal */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/journal' as any);
                }}
                activeOpacity={0.8}
                style={styles.carouselCardWrapper}
              >
                <View style={styles.carouselCard}>
                  <LinearGradient
                    colors={Colors.gradients.turquoise}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  />
                  {!hasTodayJournal && (
                    <View style={styles.notificationDot} />
                  )}
                  <View style={styles.gridCardContent}>
                    <View style={styles.gridIconContainer}>
                       <Book size={32} color={Colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.gridCardTitle}>Journal</Text>
                    <Text style={styles.gridCardSubtitle} numberOfLines={2}>Daily reflection</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card 4: Simulations */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/simulations');
                }}
                activeOpacity={0.8}
                style={styles.carouselCardWrapper}
              >
                <View style={styles.carouselCard}>
                  <LinearGradient
                    colors={['#F3F4F6', '#E5E7EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  />
                  <View style={styles.gridCardContent}>
                    <View style={styles.gridIconContainer}>
                       <Layers size={32} color={Colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.gridCardTitle}>History</Text>
                    <Text style={styles.gridCardSubtitle} numberOfLines={2}>Past timelines</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card 5: Simulate 2026 */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  trackEvent(MixpanelEvents.YEAR_PREDICTION_BANNER_CLICKED);
                  router.push('/prediction/2026/intro' as any);
                }}
                activeOpacity={0.8}
                style={styles.carouselCardWrapper}
              >
                <View style={styles.carouselCard}>
                  <LinearGradient
                    colors={['#E0F2FE', '#F0F9FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  />
                  <View style={styles.gridCardContent}>
                    <View style={styles.gridIconContainer}>
                       <Sparkles size={32} color={Colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.gridCardTitle}>2026</Text>
                    <Text style={styles.gridCardSubtitle} numberOfLines={2}>Simulate Future</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
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

      {/* Accuracy Info Modal */}
      <Modal
        visible={showAccuracyInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccuracyInfo(false)}
      >
        <View style={styles.accuracyModalOverlay}>
          <View style={styles.accuracyModalContent}>
            <View style={styles.accuracyModalHeader}>
              <Text style={styles.accuracyModalTitle}>Improve Accuracy</Text>
              <TouchableOpacity 
                onPress={() => setShowAccuracyInfo(false)}
                style={styles.accuracyModalCloseButton}
              >
                <X size={24} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.accuracyModalDescription}>
              Your twin's accuracy increases as you interact with the app. Here's how to improve it:
            </Text>
            
            <View style={styles.accuracyList}>
              <View style={styles.accuracyItem}>
                <View style={[styles.accuracyIcon, { backgroundColor: 'rgba(132, 250, 176, 0.1)' }]}>
                  <User size={18} color="#4ADE80" />
                </View>
                <Text style={styles.accuracyItemText}>Complete your profile</Text>
              </View>
              
              <View style={styles.accuracyItem}>
                <View style={[styles.accuracyIcon, { backgroundColor: 'rgba(135, 206, 250, 0.1)' }]}>
                  <Book size={18} color="#87CEFA" />
                </View>
                <Text style={styles.accuracyItemText}>Add daily journal entries</Text>
              </View>
              
              <View style={styles.accuracyItem}>
                <View style={[styles.accuracyIcon, { backgroundColor: 'rgba(255, 154, 158, 0.1)' }]}>
                  <Compass size={18} color="#FF9A9E" />
                </View>
                <Text style={styles.accuracyItemText}>Make decisions with AI</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowAccuracyInfo(false);
                router.push('/(tabs)/profile');
              }}
              style={styles.accuracyActionButton}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={Colors.gradients.turquoise}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accuracyActionGradient}
              >
                <Text style={styles.accuracyActionText}>Go to Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 220, // Extra padding for fixed carousel at bottom
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoContainer: {
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
  },
  greetingName: {
    color: Colors.textTertiary,
    fontWeight: '400',
    fontFamily: Fonts.secondary.bold,
  },
  greetingRest: {
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  twinSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 0,
    minHeight: 300,
  },
  twinAreaWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
  },
  trainingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '60%',
    marginBottom: 16,
    marginTop: 8,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoButton: {
    padding: 2,
  },
  progressBarLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  progressBarPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  twinAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  twinAvatar: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  twinEmoji: {
    fontSize: 140,
    lineHeight: 160,
  },
  suggestionBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: 140,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    zIndex: 5,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    paddingBottom: Platform.OS === 'ios' ? 48 : 40,
    paddingLeft: 20,
  },
  carouselScrollView: {
    flex: 1,
    overflow: 'visible',
  },
  carouselContent: {
    paddingHorizontal: 4, // Align with screen padding logic
    gap: 16,
    paddingRight: 24,
  },
  carouselCardWrapper: {
    width: 140,
    height: 180,
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
    backgroundColor: 'transparent',
  },
  carouselCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  gridCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gridIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  gridIconImage: {
    width: 40,
    height: 40,
  },
  gridCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 22,
  },
  gridCardSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
    lineHeight: 18,
  },
  notificationDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
    zIndex: 10,
  },
  progressBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  echoSection: {
    marginBottom: 20,
    marginTop: 10,
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
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 12,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  echoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  echoContent: {
    flex: 1,
  },
  echoTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  echoMeta: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  // Accuracy Modal Styles
  accuracyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accuracyModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  accuracyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accuracyModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  accuracyModalCloseButton: {
    padding: 4,
  },
  accuracyModalDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
  },
  accuracyList: {
    gap: 16,
    marginBottom: 24,
  },
  accuracyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accuracyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  accuracyActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  accuracyActionGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Retain Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCloseButton: {
    padding: 4,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
  },
  deleteModalDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
  },
  deleteModalWarning: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  predictionBanner: {
    marginBottom: 24,
    marginVertical: 4,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'visible',
  },
  predictionBannerContent: {
    position: 'relative',
    borderRadius: 999,
    overflow: 'visible',
  },
  predictionBannerBlur: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    margin: 1,
    paddingVertical: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    // Matches app's light card style with gradient border wrapper
  },
  predictionBannerBorderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    overflow: 'hidden',
  },
  predictionBannerBorderGradient: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
  },
  predictionBannerYellowWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  predictionBannerGrayBackground: {
    borderRadius: 24,
    paddingVertical: 2,
    paddingHorizontal: 2,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  predictionBannerYellowGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 24,
    backgroundColor: '#2DD4BF',
    opacity: 0.1,
  },
  gradientTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 18,
  },
  sparklesIconWrapper: {
    marginTop: 2,
  },
  predictionBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 6,
    position: 'relative',
    zIndex: 1,
  },
  predictionBannerText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  predictionBannerYellowText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  predictionBannerSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  predictionBannerChevron: {
    marginLeft: 'auto',
  },
});
