import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform, Modal, Easing, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, calculateOverallProgress, getTodayJournal, getAllYearPredictions } from '@/lib/storage';
import { Compass, Sparkles, X, Trash2, ChevronRight, HelpCircle, Book, User, Settings, Info, Layers, ArrowUpRight, CheckCircle } from 'lucide-react-native';
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

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { checkOnboardingStatus, isPremium } = useTwin();
  const [userName, setUserName] = useState('');
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [recentWhatIfs, setRecentWhatIfs] = useState<any[]>([]);
  const [profileProgress, setProfileProgress] = useState(100); 
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'decision' | 'whatif'; title: string } | null>(null);
  const [hasTodayJournal, setHasTodayJournal] = useState(false);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Preload images
    Asset.fromModule(require('@/assets/images/memoji.png')).downloadAsync();
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
      });
  }, [user, router, checkOnboardingStatus]);

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
      setRecentDecisions(decisions || []);
      setRecentWhatIfs(whatifs || []);
      setProfileProgress(progress || 0);
      setHasTodayJournal(!!journalToday);

      // Trigger entry animation
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
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
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

  // Display 99% if daily journal is incomplete, otherwise show actual progress
  const displayedProgress = hasTodayJournal ? profileProgress : 99;

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
                  colors={Colors.gradients.purple}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.moraTagGradient}
                />
                <View style={styles.moraTagInner}>
                  <Text style={styles.moraTagText}>{isPremium ? 'mora+' : 'unlock mora+'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            {/* Main Header with Emoji */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>
                  <Text style={styles.greetingName}>Hi {userName || 'Friend'},{'\n'}</Text>
                  <Text style={styles.greetingRest}>What do you want to{'\n'}explore right now?</Text>
                </Text>
              </View>
              <View style={styles.headerRight}>
                <Image 
                  source={require('@/assets/images/memoji.png')}
                  style={styles.headerEmoji}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Action Rectangles */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/simulations');
                }}
                activeOpacity={0.8}
                style={styles.actionRectangle}
              >
                <LinearGradient
                  colors={Colors.gradients.purple}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                />
                <View style={styles.actionIconContainer}>
                  <Compass size={24} color={Colors.textPrimary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Simulate</Text>
                  <Text style={styles.actionSubtitle}>Experience emotional narratives and possible futures</Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/decision/new');
                }}
                activeOpacity={0.8}
                style={styles.actionRectangle}
              >
                <View style={[styles.cardGradient, { backgroundColor: '#febda1' }]} />
                <View style={styles.actionIconContainer}>
                  <CheckCircle size={24} color={Colors.textPrimary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Decide</Text>
                  <Text style={styles.actionSubtitle}>Receive an authoritative recommendation for your path</Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </TouchableOpacity>

              {/* Train Section */}
              <TouchableOpacity
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
                      <View style={styles.teachPercentageBadge}>
                        <Text style={styles.teachPercentage}>{displayedProgress}%</Text>
                      </View>
                    </View>
                    <Text style={styles.teachSubtitle}>Build a compounding and smarter digital twin</Text>
                  </View>
                  <View style={styles.teachArrowContainer}>
                    <LinearGradient
                      colors={Colors.gradients.turquoise}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
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
                    gradientColors={Colors.gradients.turquoise}
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
        />
      )}

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
    borderRadius: 12,
    padding: 1.5,
    overflow: 'hidden',
  },
  moraTagGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  moraTagInner: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10.5,
  },
  moraTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    width: 120,
    height: 120,
    transform: [{ scale: 1.2 }],
  },
  greeting: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
  },
  greetingName: {
    color: Colors.textSecondary,
    fontSize: 24,
    fontFamily: Fonts.primary.regular,
  },
  greetingRest: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontFamily: Fonts.secondary.bold,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  actionRectangle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
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
  teachSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '400',
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
});
