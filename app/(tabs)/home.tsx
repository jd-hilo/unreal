import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, Animated, Platform, Modal, Easing, Dimensions, Linking } from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, calculateOverallProgress, getTodayJournal, getAllYearPredictions, updateProfileFields } from '@/lib/storage';
import { Compass, Sparkles, X, Trash2, ChevronRight, HelpCircle, Book, User, Settings, Info, Layers, ArrowUpRight, CheckCircle, Star, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { formatDistanceToNow } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { ProductGuide } from '@/components/ProductGuide';
import { ProgressBar } from '@/components/ProgressBar';
import { setHasSeenDecisionGuide } from '@/lib/guideStorage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors, Fonts } from '@/constants/Theme';
import { useTypewriter } from '@/hooks/useTypewriter';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuth((state) => state.user);
  const { checkOnboardingStatus, isPremium } = useTwin();
  const [userName, setUserName] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [recentWhatIfs, setRecentWhatIfs] = useState<any[]>([]);
  const [profileProgress, setProfileProgress] = useState(100); 
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'decision' | 'whatif'; title: string } | null>(null);
  const [hasTodayJournal, setHasTodayJournal] = useState(false);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Animation refs for fade transitions
  const invitationOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Disable swipe-to-go-back gesture
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      });

      // Also disable on parent navigator if it exists
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        });
      }

      return () => {
        // Re-enable on cleanup
        navigation.setOptions({
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        });
        if (parent) {
          parent.setOptions({
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          });
        }
      };
    }, [navigation])
  );

  // Typewriter for invitation text
  const { displayedLines: invitationLines } = useTypewriter(
    showDiscordModal ? ["You've been invited"] : [],
    {
      speed: 50,
      onAllComplete: () => {
        // After typewriter completes, wait 1.5s then fade out invitation and fade in content
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(invitationOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
          setShowContent(true);
        }, 1500);
      },
    }
  );

  // Reset when modal opens/closes
  useEffect(() => {
    if (showDiscordModal) {
      setShowContent(false);
      invitationOpacity.setValue(1);
      contentOpacity.setValue(0);
    } else {
      setShowContent(false);
    }
  }, [showDiscordModal]);
  
  // Layout refs for ProductGuide
  const simulateRef = useRef<View>(null);
  const decideRef = useRef<View>(null);
  const trainRef = useRef<View>(null);
  
  const [simulateLayout, setSimulateLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [decideLayout, setDecideLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [trainLayout, setTrainLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  const measureLayouts = async () => {
    const measure = (ref: any) => {
      return new Promise<{x: number, y: number, width: number, height: number} | undefined>((resolve) => {
        if (!ref.current) return resolve(undefined);
        ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
          resolve({ x, y, width, height });
        });
      });
    };

    const [dec, sim, train] = await Promise.all([
      measure(decideRef),
      measure(simulateRef),
      measure(trainRef)
    ]);

    setDecideLayout(dec);
    setSimulateLayout(sim);
    setTrainLayout(train);
  };
  
  // Animation values - start with slight opacity to avoid white screen
  const fadeAnim = useRef(new Animated.Value(0.1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
        // Start fade animation immediately when we know we're showing content
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
        loadData();
        setIsInitialLoad(false);
      })
      .catch((error) => {
        console.warn('Failed to confirm onboarding status:', error);
      });
  }, [user, router, checkOnboardingStatus, fadeAnim, slideAnim]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [profile, decisions, whatifs, progress, journalToday] = await Promise.all([
        getProfile(user.id),
        getDecisions(user.id),
        getWhatIfs(user.id),
        calculateOverallProgress(user.id),
        getTodayJournal(user.id)
      ]);

      if (profile?.first_name) {
        setUserName(profile.first_name);
      }
      setProfileData(profile);
      setRecentDecisions(decisions || []);
      setRecentWhatIfs(whatifs || []);
      setProfileProgress(progress || 0);
      setHasTodayJournal(!!journalToday);

      // Auto-generate and save avatar for existing users who don't have one
      if (profile && !profile.avatar_variant) {
        try {
          const avatarVariant = 'beam';
          const avatarColors = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];
          const avatarReason = "This unique gradient signature is generated from your biometric data and decision patterns. It represents the core of your digital twin.";
          
          await updateProfileFields(user.id, {
            avatar_variant: avatarVariant,
            avatar_colors: avatarColors,
            avatar_reason: avatarReason,
          });
          
          // Reload profile to get updated avatar data
          const updatedProfile = await getProfile(user.id);
          setProfileData(updatedProfile);
        } catch (error) {
          console.error('Failed to auto-generate avatar:', error);
          // Don't block the UI if avatar generation fails
        }
      }


      // Only trigger animation if it hasn't started yet (for subsequent loads)
      if (isInitialLoad) {
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
        setIsInitialLoad(false);
      } else {
        // For subsequent loads, ensure content is visible
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
      }

      // Check for store review
      const lastReview = await AsyncStorage.getItem('last_review_request');
      const now = Date.now();
      if (!lastReview || now - parseInt(lastReview) > 1000 * 60 * 60 * 24 * 30) {
        if (decisions.length + whatifs.length >= 3) {
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            await StoreReview.requestReview();
            await AsyncStorage.setItem('last_review_request', now.toString());
          }
        }
      }

      // Check for Discord modal (Twin Society) - Show only once for new users
      const hasSeenDiscordModal = await AsyncStorage.getItem('has_seen_discord_modal');
      if (!hasSeenDiscordModal) {
        // Delay slightly to let animations finish or feel more natural
        setTimeout(() => {
          setShowDiscordModal(true);
          trackEvent(MixpanelEvents.TWIN_SOCIETY_MODAL_VIEWED, { source: 'auto' });
          AsyncStorage.setItem('has_seen_discord_modal', 'true');
        }, 1500);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      // Ensure content is visible when screen comes into focus
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      loadData();
    }, [loadData, fadeAnim, slideAnim])
  );

  const handleLongPressEcho = (echo: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItemToDelete({
      id: echo.id,
      type: echo.type,
      title: echo.title
    });
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !user) return;

    try {
      if (itemToDelete.type === 'decision') {
        await deleteDecision(itemToDelete.id);
      } else {
        await deleteWhatIf(itemToDelete.id);
      }
      loadData();
      setDeleteModalVisible(false);
      setItemToDelete(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const echoEntries = [
    ...recentDecisions.map((d) => ({
      id: d.id,
      type: 'decision' as const,
      title: d.question,
      subtitle: d.status === 'draft' ? 'Draft' : (d.prediction?.prediction || 'Analyzing...'),
      timestamp: new Date(d.created_at).getTime(),
      route: `/decision/${d.id}` as const,
    })),
    ...recentWhatIfs.map((whatIf) => ({
      id: whatIf.id,
      type: 'whatif' as const,
      title: whatIf.payload?.question || 'What-if',
      subtitle: 'Explore alternate reality',
      route: `/whatif/${whatIf.id}` as const,
      timestamp: new Date(whatIf.created_at).getTime(),
    }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);

  // Display actual profile progress
  const displayedProgress = profileProgress;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Image 
                source={require('@/assets/images/unreallogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.topBarIcons}>
              <TouchableOpacity
                style={styles.moraTag}
                onPress={() => {
                  if (!isPremium) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/premium');
                  }
                }}
                activeOpacity={!isPremium ? 0.7 : 1}
                disabled={isPremium}
              >
                <LinearGradient
                  colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.moraTagGradient}
                >
                  {isPremium ? (
                    <View style={styles.moraTagTextContainer}>
                      <Svg height="16" width="55">
                        <Defs>
                          <SvgLinearGradient id="moraGradHome" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#00BCA6" stopOpacity="1" />
                            <Stop offset="1" stopColor="#908CF1" stopOpacity="1" />
                          </SvgLinearGradient>
                        </Defs>
                        <SvgText
                          fill="url(#moraGradHome)"
                          fontSize="12"
                          fontWeight="500"
                          fontFamily={Fonts.secondary.bold}
                          x="0"
                          y="12"
                        >
                          mora+
                        </SvgText>
                      </Svg>
                    </View>
                  ) : (
                    <Text style={styles.moraTagText}>unlock mora+</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  await measureLayouts();
                  setShowDecisionGuide(true);
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

          <Animated.ScrollView 
            style={[styles.content, { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Compatibility Test Banner */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                trackEvent(MixpanelEvents.COMPATIBILITY_ADD_CLICKED);
                router.push('/compatibility/add-twin');
              }}
              activeOpacity={0.9}
              style={styles.compatibilityBanner}
            >
              <LinearGradient
                colors={['#A78BFA', '#F472B6']} // Softer Purple to Pink gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compatibilityBannerGradient}
              />
              <View style={styles.compatibilityBannerContent}>
                <View style={styles.compatibilityBannerTextContainer}>
                  <View style={styles.newTag}>
                    <Text style={styles.newTagText}>NEW</Text>
                  </View>
                  <Text style={styles.compatibilityBannerTitle}>Check Compatibility</Text>
                  <Text style={styles.compatibilityBannerSubtitle}>See how your twin vibes with others 🔮</Text>
                </View>
                <View style={styles.compatibilityAvatars}>
                  <Image 
                    source={require('@/assets/images/manwhite.png')} 
                    style={styles.compatibilityAvatar}
                    resizeMode="contain"
                  />
                  <View style={styles.compatibilityConnector}>
                    <Zap size={14} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                  <Image 
                    source={require('@/assets/images/manwhite.png')} 
                    style={[styles.compatibilityAvatar, styles.compatibilityAvatarFlipped]}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Main Header */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>
                  <Text style={styles.greetingName}>Hi {userName || 'Friend'},{'\n'}</Text>
                  <Text style={styles.greetingRest}>What do you want to{'\n'}explore right now?</Text>
                </Text>
              </View>
            </View>

            {/* Action Rectangles */}
            <View style={styles.actionsContainer}>
              <View 
                ref={decideRef}
                style={styles.actionRectangleWrapper}
                collapsable={false}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/decision/new');
                  }}
                  style={({ pressed }) => [
                    styles.actionRectangle,
                    {
                      shadowColor: '#fe8c9c',
                      transform: [{ translateY: pressed ? 4 : 0 }],
                      shadowOffset: { width: 0, height: pressed ? 0 : 4 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: pressed ? 2 : 8,
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#fe8c9c', '#fdcca7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.cardGradient, { opacity: 0.5 }]}
                  />
                  <View style={styles.actionIconContainer}>
                    <CheckCircle size={24} color={Colors.textPrimary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Decide</Text>
                    <Text style={styles.actionSubtitle}>
                      Get recommendations and compare outcomes
                    </Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>

              <View 
                ref={simulateRef}
                style={styles.actionRectangleWrapper}
                collapsable={false}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/simulate');
                  }}
                  style={({ pressed }) => [
                    styles.actionRectangle,
                    {
                      shadowColor: Colors.gradients.purple[0],
                      transform: [{ translateY: pressed ? 4 : 0 }],
                      shadowOffset: { width: 0, height: pressed ? 0 : 4 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: pressed ? 2 : 8,
                    }
                  ]}
                >
                  <LinearGradient
                    colors={Colors.gradients.purple}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.cardGradient, { opacity: 0.5 }]}
                  />
                  <View style={styles.actionIconContainer}>
                    <Compass size={24} color={Colors.textPrimary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Simulate</Text>
                    <Text style={styles.actionSubtitle}>Experience emotional narratives and possible futures</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>

              {/* Train Section */}
              <TouchableOpacity
                ref={trainRef}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await AsyncStorage.setItem('previous_route_before_profile', '/(tabs)/home');
                  router.push('/(tabs)/profile');
                }}
                activeOpacity={0.8}
                style={styles.teachCard}
              >
                <View style={styles.teachCardHeader}>
                  <View style={styles.teachTextContainer}>
                    <View style={styles.teachTitleRow}>
                      <Text style={styles.teachTitle}>Train</Text>
                      <View style={styles.teachPercentageContainer}>
                        <View style={styles.teachPercentageBadge}>
                          <Text style={styles.teachPercentage}>{displayedProgress}%</Text>
                        </View>
                        {!hasTodayJournal && <View style={styles.journalDot} />}
                      </View>
                    </View>
                    <Text style={styles.teachSubtitle}>Train your twin for more accurate answers</Text>
                  </View>
                  <View style={styles.teachArrowContainer}>
                    <LinearGradient
                      colors={['#25729f', '#62edb9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.teachArrowGradient}
                    >
                      <ArrowUpRight size={16} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                </View>
                <View style={styles.teachProgressContainer}>
                  <ProgressBar 
                    progress={displayedProgress / 100} 
                    showLabel={false} 
                    height={6}
                    gradientColors={['#25729f', '#62edb9']}
                    trackColor="rgba(0,0,0,0.05)"
                  />
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
        </SafeAreaView>
      </View>

      {/* Product Guide */}
      {showDecisionGuide && (
        <ProductGuide
          visible={showDecisionGuide}
          onDismiss={async () => {
            setShowDecisionGuide(false);
            await setHasSeenDecisionGuide();
          }}
          onComplete={async () => {
            setShowDecisionGuide(false);
            await setHasSeenDecisionGuide();
          }}
          userId={user?.id}
          simulateLayout={simulateLayout}
          decideLayout={decideLayout}
          trainLayout={trainLayout}
        />
      )}

      {/* Twin Society Modal */}
      <Modal
        visible={showDiscordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscordModal(false)}
      >
        <View style={styles.discordModalOverlay}>
          <View style={styles.discordModalContent}>
            {/* Invitation Text - Typewriter Effect */}
            <Animated.View 
              style={{ 
                opacity: invitationOpacity,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                padding: 24,
              }}
              pointerEvents={showContent ? 'none' : 'auto'}
            >
              <Text style={styles.invitationText}>
                {invitationLines[0] || ''}
              </Text>
            </Animated.View>

            {/* Content - Fades in after invitation */}
            {showContent && (
              <Animated.View style={[styles.discordContentContainer, { opacity: contentOpacity }]}>
                <View style={styles.discordAvatarsContainer}>
                  {[0, 1, 2, 3].map((index) => (
                    <Image 
                      key={index}
                      source={require('@/assets/images/manwhite.png')} 
                      style={[
                        styles.discordAvatarImage,
                        index > 0 && { marginLeft: -20 }
                      ]}
                      resizeMode="contain"
                    />
                  ))}
                </View>

                <Text style={styles.discordTitle}>Twin Society</Text>
                <Text style={styles.discordSubtitle}>
                  A discord community of other people looking to better their lives with better decisions
                </Text>

                <Pressable
                  onPress={() => {
                    trackEvent(MixpanelEvents.TWIN_SOCIETY_JOIN_CLICKED);
                    Linking.openURL('https://discord.gg/yYKYZNfQ');
                    setShowDiscordModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.discordButton,
                    {
                      shadowColor: '#25729f',
                      transform: [{ translateY: pressed ? 2 : 0 }],
                      shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                      shadowOpacity: pressed ? 0.3 : 0.5,
                      shadowRadius: pressed ? 8 : 20,
                      elevation: pressed ? 4 : 12,
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#25729f', '#62edb9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.discordButtonGradient}
                  >
                    <Text style={styles.discordButtonText}>Join Now</Text>
                    <ArrowUpRight size={20} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>

                <TouchableOpacity 
                  onPress={() => {
                    trackEvent(MixpanelEvents.TWIN_SOCIETY_MODAL_CLOSED);
                    setShowDiscordModal(false);
                  }}
                  style={styles.discordCloseButton}
                >
                  <Text style={styles.discordCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>

      {/* Accuracy Info Modal */}
      <Modal
        visible={showAccuracyInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccuracyInfo(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccuracyInfo(false)}
        >
          <View style={styles.accuracyModalContent}>
            <View style={styles.accuracyHeaderRow}>
              <View style={styles.accuracyIconContainer}>
                <Layers size={24} color="#84FAB0" />
              </View>
              <TouchableOpacity onPress={() => setShowAccuracyInfo(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.accuracyModalTitle}>Twin Accuracy</Text>
            <Text style={styles.accuracyModalDescription}>
              The more data your twin has, the more accurately it can simulate your life.
            </Text>

            <View style={styles.accuracyStatsContainer}>
              <View style={styles.accuracyStatItem}>
                <Text style={styles.accuracyStatValue}>{displayedProgress}%</Text>
                <Text style={styles.accuracyStatLabel}>Accuracy</Text>
              </View>
              <View style={styles.accuracyStatDivider} />
              <View style={styles.accuracyStatItem}>
                <Text style={styles.accuracyStatValue}>
                  {recentDecisions.length + recentWhatIfs.length}
                </Text>
                <Text style={styles.accuracyStatLabel}>Data Points</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.accuracyActionButton}
              onPress={() => {
                setShowAccuracyInfo(false);
                router.push('/(tabs)/profile');
              }}
            >
              <Text style={styles.accuracyActionText}>Train My Mora</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete {itemToDelete?.type === 'decision' ? 'Decision' : 'What-if'}?</Text>
            <Text style={styles.deleteModalDescription}>
              "{itemToDelete?.title}"{'\n\n'}This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalCancel]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalConfirm]}
                onPress={confirmDelete}
              >
                <Trash2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  topBarLeft: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 40,
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  moraTag: {
    borderRadius: 56,
    overflow: 'hidden',
  },
  moraTagGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
  },
  moraTagTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  moraTagText: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 15,
    color: '#696969',
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  compatibilityBanner: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 100,
  },
  compatibilityBannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compatibilityBannerContent: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    zIndex: 1,
    minHeight: 110,
  },
  compatibilityBannerTextContainer: {
    maxWidth: '65%',
    gap: 4,
  },
  compatibilityBannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.primary.semibold,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  compatibilityBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
  },
  compatibilityAvatars: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
  },
  compatibilityAvatar: {
    width: 64,
    height: 64,
  },
  compatibilityAvatarFlipped: {
    transform: [{ scaleX: -1 }],
  },
  compatibilityConnector: {
    marginBottom: 32,
    marginHorizontal: -4,
    zIndex: 10,
  },
  newTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EC4899',
    fontFamily: Fonts.secondary.bold,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    width: 80,
    height: 80,
    transform: [{ scale: 1 }],
  },
  greeting: {
    fontSize: 22,
    lineHeight: 24,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
  },
  greetingName: {
    color: Colors.textSecondary,
    fontSize: 20,
    fontFamily: Fonts.primary.regular,
  },
  greetingRest: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: Fonts.secondary.bold,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  actionRectangleWrapper: {
    // Shadow moved to button itself for 3D effect
  },
  actionRectangle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  actionIconContainer: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400',
    lineHeight: 18,
  },
  teachCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginTop: 8,
  },
  teachCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teachTextContainer: {
    flex: 1,
    gap: 2,
  },
  teachProgressContainer: {
    width: '100%',
  },
  teachTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teachTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textSecondary,
  },
  teachPercentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teachPercentageBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teachPercentage: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textSecondary,
  },
  journalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B6B',
  },
  teachSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '400',
  },
  journalBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  journalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  teachArrowContainer: {
    marginLeft: 8,
  },
  teachArrowGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  echoSection: {
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 2,
  },
  echoMeta: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accuracyModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  accuracyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  accuracyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(132, 250, 176, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
  },
  accuracyModalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: Fonts.secondary.bold,
  },
  accuracyStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  accuracyStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  accuracyStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 4,
  },
  accuracyStatLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accuracyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  accuracyActionButton: {
    backgroundColor: '#84FAB0',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  accuracyActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Fonts.secondary.bold,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteModalCancel: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  deleteModalConfirm: {
    backgroundColor: '#FF453A',
  },
  deleteModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  deleteModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  discordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  discordModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 56,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  invitationText: {
    fontSize: 32,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
    fontStyle: 'italic',
    fontWeight: 'normal',
    textAlign: 'center',
  },
  discordContentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  discordAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  discordAvatarImage: {
    width: 56,
    height: 56,
  },
  discordTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
    textAlign: 'center',
  },
  discordSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  discordButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'visible',
  },
  discordButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    borderRadius: 24,
  },
  discordButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  discordCloseButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  discordCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
});
