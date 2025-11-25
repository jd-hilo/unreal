import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform, Modal, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, getInterestProgress, getTodayJournal } from '@/lib/storage';
import { Compass, Sparkles, Zap, X, Trash2, Lock, ChevronRight } from 'lucide-react-native';
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
  const [guideStep, setGuideStep] = useState(0);
  const whatIfHoverAnim = useRef(new Animated.Value(0)).current;
  const decisionCardRef = useRef<Animated.View>(null);
  const whatIfCardRef = useRef<Animated.View>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardHoverAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Preload images
    Asset.fromModule(require('@/assets/images/compass.png')).downloadAsync();
    Asset.fromModule(require('@/assets/images/star.png')).downloadAsync();
  }, []);

  // Hover animation for decision card - only when guide is visible and on step 0
  useEffect(() => {
    if (showDecisionGuide && guideStep === 0) {
      cardHoverAnim.setValue(0);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(cardHoverAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(cardHoverAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => {
        animation.stop();
        cardHoverAnim.setValue(0);
      };
    } else {
      cardHoverAnim.setValue(0);
    }
  }, [showDecisionGuide, guideStep]);

  // Hover animation for what-if card - only when guide is on step 1
  useEffect(() => {
    if (showDecisionGuide && guideStep === 1) {
      whatIfHoverAnim.setValue(0);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(whatIfHoverAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(whatIfHoverAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => {
        animation.stop();
        whatIfHoverAnim.setValue(0);
      };
    } else {
      whatIfHoverAnim.setValue(0);
    }
  }, [showDecisionGuide, guideStep]);

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
      
      console.log('Home screen - loaded profile:', profile);
      console.log('Home screen - first_name from profile:', profile?.first_name);
      
      // Only use first_name from profile, don't use fallbacks
      if (profile?.first_name) {
        console.log('Setting userName to first_name:', profile.first_name);
        setUserName(profile.first_name);
      } else {
        // Set to empty string if no first_name, so we don't show "there"
        console.log('first_name not found, setting userName to empty');
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
      // Show if: onboarding complete, hasn't seen guide, and has 0 decisions
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
            <View style={styles.header}>
              <Text style={styles.greeting}>Welcome back{userName && userName !== 'there' ? ',' : ''}</Text>
              {userName && userName !== 'there' && (
                <Text style={styles.userName}>{userName}</Text>
              )}
            </View>

            {/* Twin's Understanding Progress Bar - Only show if not complete */}
            {profileProgress < 100 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.85}
                style={styles.progressBarContainer}
              >
                <LinearGradient
                  colors={['rgba(135, 206, 250, 0.2)', 'rgba(100, 181, 246, 0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.progressBarGradient}
                >
                  <View style={styles.progressBarHeader}>
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.progressCubeIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.progressBarText}>Twin's Understanding</Text>
                    <Text style={styles.progressPercentage}>{profileProgress}%</Text>
                  </View>
                  <View style={styles.thinProgressBar}>
                    <LinearGradient
                      colors={['rgba(173, 216, 230, 0.95)', 'rgba(100, 149, 237, 0.9)', 'rgba(65, 105, 225, 0.85)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.thinProgressFill, { width: `${profileProgress}%` }]}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Journal Reminder Banner */}
            {!hasTodayJournal && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/journal' as any);
                }}
                activeOpacity={0.85}
                style={styles.journalBannerContainer}
              >
                <BlurView intensity={80} tint="dark" style={styles.journalBanner}>
                  <View style={styles.journalBannerBorder} />
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.journalBannerHighlight}
                    pointerEvents="none"
                  />
                  <View style={styles.journalBannerContent}>
                    <View style={styles.journalBannerTextRow}>
                      <Text style={styles.journalBannerText}>📖 Complete your daily journal</Text>
                    </View>
                    <ChevronRight size={18} color="rgba(255, 255, 255, 0.7)" />
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              {/* What Should I Choose Card */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/decision/new');
                }}
                activeOpacity={0.9}
              >
                <Animated.View 
                  style={[
                    styles.cardWrapperPrimary,
                    {
                      transform: [{
                        translateY: cardHoverAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      }],
                    },
                  ]}
                >
                  <BlurView intensity={80} tint="dark" style={styles.actionCard}>
                    {/* Classic glass border */}
                    <View style={styles.glassBorder} />
                    {/* Subtle inner highlight */}
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.glassHighlight}
                      pointerEvents="none"
                    />
                    <View style={styles.cardContentRow}>
                      <View style={styles.iconCircleContainer}>
                        {/* Icon without background container */}
                        <View style={styles.iconRotate}>
                          <Image 
                            source={require('@/assets/images/compass.png')}
                            style={styles.compassImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      <View style={styles.cardTextContainer}>
                        <Text style={[styles.actionTitlePrimary, styles.actionTitlePrimaryTight]}>What Should{"\n"}I Choose?</Text>
                        <Text style={styles.actionSubtitlePrimary}>
                          Compare options
                          {"\n"}simulate outcomes
                        </Text>
                      </View>
                    </View>
                  </BlurView>
                </Animated.View>
              </TouchableOpacity>

              {/* What If Card */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/whatif/new');
                }}
                activeOpacity={0.9}
              >
                <Animated.View 
                  ref={whatIfCardRef}
                  style={[
                    styles.cardWrapperSecondary,
                    {
                      transform: [{
                        translateY: whatIfHoverAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      }],
                    },
                  ]}
                  onLayout={() => {
                    whatIfCardRef.current?.measureInWindow((x, y, width, height) => {
                      setWhatIfCardLayout({ x, y, width, height });
                    });
                  }}
                >
                  <BlurView intensity={80} tint="dark" style={styles.actionCard}>
                    {/* Classic glass border */}
                    <View style={styles.glassBorder} />
                    {/* Subtle inner highlight */}
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.glassHighlight}
                      pointerEvents="none"
                    />
                    <View style={styles.cardContentRow}>
                      <View style={styles.iconCircleContainer}>
                        <Image 
                          source={require('@/assets/images/star.png')}
                          style={styles.starImage}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.cardTextContainer}>
                        <Text style={styles.actionTitlePrimary}>What If?</Text>
                        <Text style={styles.actionSubtitlePrimary}>
                          Explore alternate realities
                        </Text>
                      </View>
                    </View>
                  </BlurView>
                </Animated.View>
              </TouchableOpacity>

              {/* Unreal Recommendations Banner - Commented out for now */}
              {false && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/recommendations' as any);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.recommendationsBannerWrapper}>
                    <BlurView intensity={100} tint="dark" style={styles.recommendationsBanner}>
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.05)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.recommendationsGlassOverlay}
                        pointerEvents="none"
                      />
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.12)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.5 }}
                        style={styles.recommendationsGlassHighlight}
                        pointerEvents="none"
                      />
                      <View style={styles.recommendationsGlassBorder} />
                      
                      <View style={styles.recommendationsBannerContent}>
                        <View style={styles.recommendationsBannerText}>
                          <View style={styles.recommendationsTitleRow}>
                            <View style={styles.recommendationsIconCircle}>
                              <Sparkles size={18} color="rgba(255, 255, 255, 0.9)" />
                            </View>
                            <Text style={styles.recommendationsTitle}>Unreal Recommendations</Text>
                          </View>
                          <Text style={styles.recommendationsSubtitle}>
                            Personalized picks just for you
                          </Text>
                        </View>
                        {isPremium && interestProgress >= 50 ? (
                          <View style={styles.recommendationsChevronContainer}>
                            <ChevronRight size={20} color="rgba(255, 255, 255, 0.8)" />
                          </View>
                        ) : !isPremium ? (
                          <View style={styles.recommendationsLockContainer}>
                            <Lock size={18} color="rgba(255, 255, 255, 0.7)" />
                          </View>
                        ) : null}
                      </View>
                    </BlurView>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {echoEntries.length > 0 && (
              <View style={styles.echoSection}>
                <Text style={styles.sectionTitle}>Your Echoes</Text>

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
                    <LinearGradient
                      colors={['#17161F', 'rgba(23, 22, 31, 0)']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.echoCard}
                    >
                      {!echo.isPlaceholder && (
                        <View style={styles.echoTypeBadge}>
                          {echo.type === 'whatif' ? (
                            <Sparkles size={12} color="rgba(135, 206, 250, 0.9)" />
                          ) : (
                            <Compass size={12} color="rgba(135, 206, 250, 0.9)" />
                          )}
                        </View>
                      )}
                      <Text style={styles.echoTitle} numberOfLines={3}>
                        {echo.title}
                      </Text>
                      <Text style={styles.echoMeta} numberOfLines={2}>
                        {echo.subtitle}
                      </Text>
                    </LinearGradient>
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
            // Show rating request after guide is dismissed
            setTimeout(() => {
              checkAndShowRatingPrompt();
            }, 1000);
          }}
          onComplete={async () => {
            await setHasSeenDecisionGuide();
            setShowDecisionGuide(false);
            setGuideStep(0);
            trackEvent('Product Guide Completed');
            // Show rating request after guide is completed
            setTimeout(() => {
              checkAndShowRatingPrompt();
            }, 1000);
          }}
          targetCardLayout={decisionCardLayout}
          whatIfCardLayout={whatIfCardLayout}
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
            
            <Text style={styles.deleteModalDescription}>
              "{itemToDelete?.title}"
            </Text>

            <Text style={styles.deleteModalWarning}>
              This action cannot be undone.
            </Text>

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
    backgroundColor: '#0C0C10',
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowEffect: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 0,
    fontFamily: 'Inter-SemiBold',
  },
  userName: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 0,
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.8)',
    lineHeight: 20,
  },
  actions: {
    gap: 16,
  },
  cardWrapperPrimary: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardWrapperSecondary: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recommendationsBannerWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recommendationsBanner: {
    borderRadius: 20,
    backgroundColor: 'rgba(40, 40, 50, 0.4)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  recommendationsGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  recommendationsGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  recommendationsGlassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
  },
  recommendationsBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    zIndex: 1,
  },
  recommendationsBannerText: {
    flex: 1,
  },
  recommendationsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  recommendationsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
  },
  recommendationsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: -0.2,
  },
  recommendationsSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginLeft: 42, // Align with title text (icon width + gap)
  },
  recommendationsLockContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  recommendationsChevronContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    borderRadius: 24,
    padding: 22,
    minHeight: 130,
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    zIndex: 1,
  },
  cardTextContainer: {
    flex: 1,
  },
  iconCircleContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRotate: {
    transform: [{ rotate: '-30deg' }],
  },
  compassImage: {
    width: 64,
    height: 64,
    shadowColor: 'rgba(135, 206, 250, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  starImage: {
    width: 64,
    height: 64,
    shadowColor: 'rgba(135, 206, 250, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9D5CFF',
    shadowColor: '#9D5CFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 16,
    opacity: 0.4,
  },
  iconGlowPrimary: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B77CFF',
    shadowColor: '#B77CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 18,
    opacity: 0.45,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2.2,
    overflow: 'hidden',
  },
  iconCirclePrimary: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  actionTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    marginBottom: 6,
    lineHeight: 24,
    fontFamily: 'Inter-SemiBold',
  },
  actionTitlePrimary: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(240, 248, 255, 0.95)',
    letterSpacing: 0.2,
    lineHeight: 28,
    fontFamily: 'Inter-SemiBold',
  },
  actionTitlePrimaryTight: {
    lineHeight: 24,
  },
  actionSubtitle: {
    fontSize: 13.5,
    color: 'rgba(180, 180, 180, 0.85)',
    lineHeight: 18,
  },
  actionSubtitlePrimary: {
    fontSize: 15,
    color: 'rgba(200, 220, 240, 0.85)',
    lineHeight: 18,
  },
  echoSection: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: 'Inter-SemiBold',
  },
  echoScrollView: {
    marginHorizontal: -20,
  },
  echoScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  echoCardWrapper: {
    width: 220,
  },
  echoCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
    position: 'relative',
  },
  echoTypeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(65, 105, 225, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(65, 105, 225, 0.3)',
  },
  echoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 22,
    paddingRight: 36,
  },
  echoMeta: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.6)',
    lineHeight: 16,
  },
  echoDetail: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(220, 220, 220, 0.7)',
    lineHeight: 16,
  },
  progressBarContainer: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(65, 105, 225, 0.3)',
  },
  progressBarGradient: {
    padding: 16,
  },
  progressBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressCubeIcon: {
    width: 20,
    height: 20,
  },
  progressBarText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  thinProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  thinProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
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
    backgroundColor: 'rgba(20, 18, 30, 0.98)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
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
    color: 'rgba(200, 200, 200, 0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },
  deleteModalWarning: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.6)',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
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
  journalBannerContainer: {
    marginBottom: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  journalBanner: {
    borderRadius: 14,
    backgroundColor: 'rgba(20, 30, 50, 0.4)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.25)',
  },
  journalBannerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    pointerEvents: 'none',
  },
  journalBannerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  journalBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1,
  },
  journalBannerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journalBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: -0.2,
  },
});