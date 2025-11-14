import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf } from '@/lib/storage';
import { Compass, Sparkles, Zap, X, Trash2 } from 'lucide-react-native';
import { CompassGradientIcon, StarGradientIcon } from '@/components/GradientIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { formatDistanceToNow } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { checkOnboardingStatus } = useTwin();
  const [userName, setUserName] = useState('there');
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [recentWhatIfs, setRecentWhatIfs] = useState<any[]>([]);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(true);
  const [profileProgress, setProfileProgress] = useState(100); // Default to 100 to hide initially
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'decision' | 'whatif'; title: string } | null>(null);
  
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
      }
    }, [user])
  );

  async function loadData() {
    if (!user) return;

    try {
      const profile = await getProfile(user.id);
      
      console.log('Home screen - loaded profile:', profile);
      console.log('Home screen - first_name from profile:', profile?.first_name);
      
      // Priority: profile.first_name, then metadata name, then email
      if (profile?.first_name) {
        console.log('Setting userName to first_name:', profile.first_name);
        setUserName(profile.first_name);
      } else {
        console.log('first_name not found, checking fallbacks');
        const metadataName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name;
        if (metadataName) {
          console.log('Using metadata name:', metadataName);
          setUserName(String(metadataName).split(' ')[0]);
        } else if (user.email) {
          console.log('Using email fallback:', user.email);
          setUserName(user.email.split('@')[0]);
        }
      }

      const [decisions, whatIfs, relationships] = await Promise.all([
        getDecisions(user.id, 5),
        getWhatIfs(user.id, 5),
        getRelationships(user.id)
      ]);
      setRecentDecisions(decisions);
      setRecentWhatIfs(whatIfs);
      
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
      
      // Check if we should show rating prompt
      await checkAndShowRatingPrompt();
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

      // Check if this is first visit after onboarding
      const isFirstVisit = await AsyncStorage.getItem('isFirstHomeVisit');
      if (isFirstVisit !== null) return; // Not first visit

      // Mark as first visit completed
      await AsyncStorage.setItem('isFirstHomeVisit', 'true');

      // Wait 3 seconds before showing rating prompt
      setTimeout(async () => {
        const isAvailable = await StoreReview.hasAction();
        if (isAvailable) {
          await StoreReview.requestReview();
          await AsyncStorage.setItem('hasRequestedRating', 'true');
        }
      }, 3000);
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
        {/* Mannequin head in background */}
        <Image 
          source={require('@/app/man.png')}
          style={styles.mannequinImage}
          resizeMode="contain"
        />
        
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
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>

            {/* Twin's Understanding Progress Bar - Only show if not complete */}
            {profileProgress < 100 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.85}
                style={styles.progressBarContainer}
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
                    colors={['rgba(20, 10, 35, 0.95)', '#312550']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.thinProgressFill, { width: `${profileProgress}%` }]}
                  />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              {/* What Should I Choose Card */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/decision/new');
                }}
                activeOpacity={0.85}
              >
                <View style={styles.cardWrapperPrimary}>
                  {/* Gradient border - reversed from What If (dark purple top-left to neon purple bottom-right) */}
                  <LinearGradient
                    colors={['#1A0F2E', '#4A2870', '#3B256D']}
                    start={{ x: 1, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.cardBorder}
                  >
                    <LinearGradient
                      colors={['rgba(20, 10, 35, 0.95)', '#312550']}
                      start={{ x: 1, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={styles.actionCard}
                    >
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
                            Simulate outcomes,
                            {"\n"}compare options.
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </LinearGradient>
                </View>
              </TouchableOpacity>

              {/* What If Card */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/whatif/new');
                }}
                activeOpacity={0.85}
              >
                <View style={styles.cardWrapperSecondary}>
                  {/* Gradient border - dark purple top-left to neon purple bottom-right */}
                  <LinearGradient
                    colors={['#1A0F2E', '#4A2870', '#3B256D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBorder}
                  >
                    <LinearGradient
                      colors={['rgba(20, 10, 35, 0.95)', '#312550']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionCard}
                    >
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
                    </LinearGradient>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
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
                            <Sparkles size={12} color="#B795FF" />
                          ) : (
                            <Compass size={12} color="#B795FF" />
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
  mannequinImage: {
    position: 'absolute',
    right: -50,
    bottom: 0,
    width: 300,
    height: 300,
    opacity: 0.35,
    zIndex: 0,
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
  cardWrapperPrimary: {},
  cardWrapperSecondary: {},
  cardBorder: {
    borderRadius: 24,
    padding: 1,
    overflow: 'hidden',
  },
  actionCard: {
    borderRadius: 22,
    padding: 22,
    minHeight: 130,
    justifyContent: 'center',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
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
    width: 80,
    height: 80,
  },
  starImage: {
    width: 80,
    height: 80,
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
    color: '#F1EEFF',
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
    color: 'rgba(168, 182, 216, 0.95)',
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
    backgroundColor: 'rgba(183, 149, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.3)',
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
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
    color: '#B795FF',
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
});