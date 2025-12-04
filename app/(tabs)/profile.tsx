import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, Clipboard, Linking, Modal, Animated, Dimensions } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CheckCircle2, Circle as CircleIcon, Edit3, ChevronRight, BookOpen, Copy, Info, X, ArrowLeft, Settings, Mail, LogOut, Sparkles, Trash2 } from 'lucide-react-native';
import { getProfile, getTodayJournal, getRelationships, deleteAccountData, ensureTwinCode, getInterestProgressNew, updateProfileFields } from '@/lib/storage';
import { resetDecisionGuide } from '@/lib/guideStorage';
import { trackEvent } from '@/lib/mixpanel';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTextScramble } from '@/hooks/useTextScramble';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const GRID_CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

interface ProfileCard {
  id: string;
  title: string;
  subtitle: string;
  onboardingStep?: string;
  route?: string;
  completed: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const { isPremium, setPremium } = useTwin();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [journalComplete, setJournalComplete] = useState(false);
  const [hasRelationships, setHasRelationships] = useState(false);
  const [twinCode, setTwinCode] = useState<string>('');
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [interestProgress, setInterestProgress] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [savingFirstName, setSavingFirstName] = useState(false);
  const animatedTwinCode = useTextScramble(twinCode, 1500);

  // Reload profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      // Also refresh premium status when profile loads
      if (user?.id) {
        const { checkPremiumStatus } = useTwin.getState();
        checkPremiumStatus(user.id);
      }
    }, [user])
  );

  useEffect(() => {
    loadProfileData();
  }, [user]);

  async function loadProfileData() {
    if (!user) return;
    
    try {
      const [profile, todayJournal, relationships, code, progress] = await Promise.all([
        getProfile(user.id),
        getTodayJournal(user.id),
        getRelationships(user.id),
        ensureTwinCode(user.id),
        getInterestProgressNew(user.id).catch(() => 0)
      ]);
      setProfileData(profile);
      setJournalComplete(!!todayJournal);
      setHasRelationships(relationships && relationships.length > 0);
      setTwinCode(code);
      setInterestProgress(progress);
      setFirstName(profile?.first_name || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyTwinCode() {
    if (!twinCode) return;
    
    try {
      Clipboard.setString(twinCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Your unreal# has been copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  async function handleSendFeedback() {
    try {
      const url = 'mailto:jd@hilo.media?subject=unreal App Feedback';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email app');
      }
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert('Error', 'Unable to open email app');
    }
  }

  async function handleShowProductGuide() {
    try {
      await resetDecisionGuide();
      trackEvent('Product Guide Replayed');
      // Use replace to ensure home screen reloads and shows guide
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to reset product guide:', error);
    }
  }

  const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
  // Handle migration: prefer new keys, but fall back to legacy keys so checkmarks show for existing users
  const lifeSituationResp =
    onboardingResponses['02-now'] ?? onboardingResponses['01-now'];
  const coreValuesResp =
    onboardingResponses['01-values'] ?? onboardingResponses['03-values'];
  const university = profileData?.university || onboardingResponses.university;
  const hometown = profileData?.hometown || onboardingResponses.hometown;
  const currentLocation = profileData?.current_location;
  const netWorth = profileData?.net_worth;
  const politicalViews = profileData?.political_views;

  const cards: ProfileCard[] = [
    {
      id: '02-now',
      title: 'Life Situation',
      subtitle: 'Where are you now?',
      route: '/profile/edit-lifesituation' as any,
      completed: !!lifeSituationResp,
    },
    {
      id: '02-path',
      title: 'Life Journey',
      subtitle: 'How did you get here?',
      route: '/profile/edit-lifejourney' as any,
      completed: !!onboardingResponses['02-path'],
    },
    {
      id: '01-values',
      title: 'Core Values',
      subtitle: 'What matters most?',
      route: '/profile/edit-values' as any,
      completed: !!coreValuesResp,
    },
    {
      id: '04-style',
      title: 'Decision Style',
      subtitle: 'How do you decide?',
      route: '/profile/edit-decisionstyle' as any,
      completed: !!onboardingResponses['04-style'],
    },
    {
      id: '05-day',
      title: 'Typical Day',
      subtitle: 'Walk through a day',
      route: '/profile/edit-typicalday' as any,
      completed: !!onboardingResponses['05-day'],
    },
    {
      id: '06-stress',
      title: 'Stress Response',
      subtitle: 'Reaction to stress',
      route: '/profile/edit-stress' as any,
      completed: !!onboardingResponses['06-stress'],
    },
    {
      id: 'university',
      title: 'Education',
      subtitle: 'University details',
      route: '/profile/edit-university' as any,
      completed: !!university,
    },
    {
      id: 'hometown',
      title: 'Hometown',
      subtitle: 'Where you grew up',
      route: '/profile/edit-hometown' as any,
      completed: !!hometown,
    },
    {
      id: 'current_location',
      title: 'Location',
      subtitle: 'Where you live',
      route: '/profile/edit-location' as any,
      completed: !!currentLocation,
    },
    {
      id: 'net_worth',
      title: 'Net Worth',
      subtitle: 'Financial status',
      route: '/profile/edit-networth' as any,
      completed: !!netWorth,
    },
    {
      id: 'political_views',
      title: 'Politics',
      subtitle: 'Your perspective',
      route: '/profile/edit-politics' as any,
      completed: !!politicalViews,
    },
    {
      id: 'relationships',
      title: 'Relationships',
      subtitle: 'Key people',
      route: '/relationships',
      completed: hasRelationships,
    },
  ];

  const completedCount = cards.filter(card => card.completed).length;
  const totalProgress = Math.round((completedCount / cards.length) * 100);

  function handleCardPress(card: ProfileCard) {
    if (card.onboardingStep) {
      router.push(card.onboardingStep as any);
    } else if (card.route) {
      router.push(card.route as any);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    Alert.alert(
      'Delete Account',
      'This will permanently remove your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountData(user.id);
              await signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Avatar Section */}
            <View style={styles.profileSection}>
              {totalProgress === 100 && (
                <LinearGradient
                  colors={['rgba(135, 206, 250, 0.3)', 'rgba(100, 149, 237, 0.2)', 'rgba(65, 105, 225, 0.15)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fullyTrainedGlow}
                  pointerEvents="none"
                />
              )}
              <View style={[styles.avatarWrapper, totalProgress === 100 && styles.fullyTrainedWrapper]}>
                {/* Circular Progress Ring */}
                <Svg width={140} height={140} style={styles.progressRing}>
                  <Defs>
                    <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="rgba(173, 216, 230, 0.95)" />
                      <Stop offset="50%" stopColor="rgba(100, 149, 237, 0.9)" />
                      <Stop offset="100%" stopColor="rgba(65, 105, 225, 0.85)" />
                    </SvgLinearGradient>
                  </Defs>
                  {/* Background circle */}
                  <Circle
                    cx={70}
                    cy={70}
                    r={64}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={6}
                    fill="none"
                  />
                  {/* Progress arc */}
                  {(() => {
                    const radius = 64;
                    const centerX = 70;
                    const centerY = 70;
                    const progress = totalProgress / 100;
                    
                    // If progress is 100%, draw a full circle
                    if (progress >= 1) {
                      return (
                        <Circle
                          cx={centerX}
                          cy={centerY}
                          r={radius}
                          stroke="url(#progressGradient)"
                          strokeWidth={6}
                          fill="none"
                          strokeLinecap="round"
                        />
                      );
                    }
                    
                    // Otherwise draw an arc
                    const angle = progress * 2 * Math.PI - Math.PI / 2; // Start from top
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    const largeArcFlag = progress > 0.5 ? 1 : 0;
                    
                    const pathData = `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`;
                    
                    return (
                      <Path
                        d={pathData}
                        stroke="url(#progressGradient)"
                        strokeWidth={6}
                        fill="none"
                        strokeLinecap="round"
                      />
                    );
                  })()}
                </Svg>
                
                <View style={styles.avatarContainer}>
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.avatarImage}
                    resizeMode="contain"
                  />
                </View>
                
                {/* Percentage Badge */}
                <View style={styles.percentageBadgeWrapper}>
                  <BlurView intensity={80} tint="dark" style={styles.percentageBadge}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.badgeGlassHighlight}
                      pointerEvents="none"
                    />
                    <View style={styles.percentageBadgeInner}>
                      <Text style={styles.percentageText}>{totalProgress}%</Text>
                    </View>
                  </BlurView>
                </View>
              </View>
              
              <View style={styles.usernameContainer}>
                <Text style={styles.username}>unreal#{animatedTwinCode || '------'}</Text>
                {twinCode && (
                  <>
                    <View style={styles.copyButtonWrapper}>
                      <BlurView intensity={60} tint="dark" style={styles.copyButton}>
                        <TouchableOpacity 
                          onPress={handleCopyTwinCode}
                          activeOpacity={0.7}
                          style={styles.copyButtonInner}
                        >
                          <Copy size={20} color="rgba(135, 206, 250, 0.9)" />
                        </TouchableOpacity>
                      </BlurView>
                    </View>
                    <View style={styles.infoButtonWrapper}>
                      <BlurView intensity={60} tint="dark" style={styles.infoButton}>
                        <TouchableOpacity 
                          onPress={() => setInfoModalVisible(true)}
                          activeOpacity={0.7}
                          style={styles.infoButtonInner}
                        >
                          <Info size={20} color="rgba(135, 206, 250, 0.9)" />
                        </TouchableOpacity>
                      </BlurView>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* First Name Input - Show if first_name is null */}
            {!profileData?.first_name && (
              <View style={styles.firstNameSection}>
                <BlurView intensity={80} tint="dark" style={styles.firstNameCard}>
                  <View style={styles.firstNameCardInner}>
                    <Text style={styles.firstNameTitle}>What's your first name?</Text>
                    <Input
                      placeholder="Enter your first name"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      style={styles.firstNameInput}
                      containerStyle={styles.firstNameInputContainer}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                    <Button
                      title={savingFirstName ? 'Saving...' : 'Save'}
                      onPress={async () => {
                        if (!firstName.trim() || !user) return;
                        setSavingFirstName(true);
                        try {
                          await updateProfileFields(user.id, { first_name: firstName.trim() });
                          await loadProfileData(); // Reload to refresh the UI
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                          console.error('Failed to save first name:', error);
                          Alert.alert('Error', 'Failed to save first name. Please try again.');
                        } finally {
                          setSavingFirstName(false);
                        }
                      }}
                      disabled={!firstName.trim() || savingFirstName}
                      style={styles.firstNameButton}
                    />
                  </View>
                </BlurView>
              </View>
            )}

            {/* Premium Section */}
            <TouchableOpacity
              style={styles.largeCardWrapper}
              onPress={() => !isPremium && router.push('/premium' as any)}
              activeOpacity={isPremium ? 1 : 0.85}
              disabled={isPremium}
            >
              <BlurView intensity={40} tint="dark" style={styles.largeCard}>
                <View style={styles.largeCardContent}>
                  <View style={styles.premiumRow}>
                    <View style={styles.premiumIconContainer}>
                      <Image 
                        source={require('@/assets/images/premium.png')}
                        style={styles.premiumImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.premiumContent}>
                      {isPremium ? (
                        <View style={styles.premiumTitleRow}>
                          <Text style={styles.premiumTitle}>unreal+</Text>
                          <View style={styles.activeTag}>
                            <Text style={styles.activeTagText}>Active</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.premiumTitle}>Upgrade to unreal+</Text>
                      )}
                      <Text style={styles.premiumSubtitle}>
                        {isPremium 
                          ? 'Full access enabled'
                          : 'Unlock biometrics & simulations'
                        }
                      </Text>
                    </View>
                    {!isPremium && <ChevronRight size={20} color="rgba(255,255,255,0.4)" />}
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Daily Section */}
            <TouchableOpacity
              style={styles.largeCardWrapper}
              onPress={() => router.push('/journal' as any)}
              activeOpacity={0.85}
            >
              <BlurView intensity={40} tint="dark" style={styles.largeCard}>
                <View style={styles.largeCardContent}>
                  <View style={styles.premiumRow}>
                    <View style={styles.journalIconContainer}>
                      {journalComplete ? (
                        <CheckCircle2 size={24} color="#87CEFA" strokeWidth={2.5} />
                      ) : (
                        <BookOpen size={24} color="#FFFFFF" strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.premiumContent}>
                      <Text style={styles.premiumTitle}>Daily Journal</Text>
                      <Text style={styles.premiumSubtitle}>
                        {journalComplete 
                          ? "Today's journal complete"
                          : 'Log your day to train twin'
                        }
                      </Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Incomplete Profile Cards - Show at top */}
            {cards.filter(card => !card.completed).length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>To Complete</Text>
                </View>
                <View style={styles.gridContainer}>
                {cards.filter(card => !card.completed).map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.gridCardWrapper}
                    onPress={() => handleCardPress(card)}
                    activeOpacity={0.85}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.gridCard}>
                      <View style={styles.gridCardContent}>
                        <View style={styles.cardIconContainer}>
                          <CircleIcon size={24} color="rgba(255, 255, 255, 0.3)" strokeWidth={2} />
                        </View>
                        <Text style={styles.gridCardTitle} numberOfLines={1}>{card.title}</Text>
                        <Text style={styles.gridCardSubtitle} numberOfLines={2}>
                          {card.subtitle}
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))}
                </View>
              </>
            )}

            {/* Completed Profile Cards */}
            {cards.filter(card => card.completed).length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Completed</Text>
                </View>
                <View style={styles.gridContainer}>
                {cards.filter(card => card.completed).map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.gridCardWrapper}
                    onPress={() => handleCardPress(card)}
                    activeOpacity={0.85}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.gridCard}>
                      <View style={styles.gridCardContent}>
                        <View style={styles.cardIconContainer}>
                          <CheckCircle2 size={24} color="#87CEFA" strokeWidth={2.5} />
                        </View>
                        <Text style={styles.gridCardTitle} numberOfLines={1}>{card.title}</Text>
                        <Text style={styles.gridCardSubtitle} numberOfLines={2}>
                          {card.subtitle}
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))}
                </View>
              </>
            )}

            {/* Account Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
            
            <View style={styles.accountButtons}>
              <TouchableOpacity
                onPress={handleSendFeedback}
                style={styles.accountButton}
              >
                <Mail size={20} color="#FFFFFF" />
                <Text style={styles.accountButtonText}>Send Feedback</Text>
                <ChevronRight size={20} color="#666" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShowProductGuide}
                style={styles.accountButton}
              >
                <Sparkles size={20} color="#FFFFFF" />
                <Text style={styles.accountButtonText}>Show Product Guide</Text>
                <ChevronRight size={20} color="#666" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.accountButton}
              >
                <LogOut size={20} color="#FFFFFF" />
                <Text style={styles.accountButtonText}>Sign Out</Text>
                <ChevronRight size={20} color="#666" style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteAccount}
                style={[styles.accountButton, styles.deleteButton]}
              >
                <Trash2 size={20} color="#EF4444" />
                <Text style={[styles.accountButtonText, styles.deleteText]}>Delete Account</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>

        {/* Info Modal */}
        <Modal
          visible={infoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View style={styles.infoModalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.infoModalBlur}>
              <View style={styles.infoModalContent}>
                <TouchableOpacity 
                  onPress={() => setInfoModalVisible(false)}
                  style={styles.infoModalCloseButton}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.infoModalLogoContainer}>
                  <Image
                    source={require('@/assets/images/unrealnum.png')}
                    style={styles.infoModalLogo}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.infoModalHeaderCard}>
                  <BlurView intensity={40} tint="dark" style={styles.infoModalHeaderCardBlur}>
                    <Text style={styles.infoModalHeaderLabel}>Your unreal#</Text>
                    <View style={styles.infoModalCodeRow}>
                      <Text style={styles.infoModalHeaderText}>{twinCode}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          Clipboard.setString(twinCode);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                        style={styles.infoModalCopyButton}
                        activeOpacity={0.7}
                      >
                        <Copy size={18} color="rgba(135, 206, 250, 0.9)" />
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoPoint}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.infoText}>
                      Your <Text style={styles.highlightText}>unreal#</Text> is a unique 6-digit code that identifies your AI twin
                    </Text>
                  </View>
                  
                  <View style={styles.infoPoint}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.infoText}>
                      Share it with others to add your twin to their decision-making process
                    </Text>
                  </View>
                  
                  <View style={styles.infoPoint}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.infoText}>
                      Your twin code is <Text style={styles.highlightText}>permanent</Text> and cannot be changed
                    </Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>
      </View>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
    position: 'relative',
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  fullyTrainedWrapper: {
    shadowColor: '#87CEFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  fullyTrainedGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -20,
    left: '50%',
    marginLeft: -90,
    zIndex: 0,
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'visible',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(183, 149, 255, 0.3)',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '80%',
    height: '80%',
  },
  percentageBadgeWrapper: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 3,
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  percentageBadge: {
    borderRadius: 16,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  badgeGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  percentageBadgeInner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  copyButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  copyButton: {
    borderRadius: 12,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  copyButtonInner: {
    padding: 6,
    borderRadius: 11,
    zIndex: 1,
  },
  infoButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoButton: {
    borderRadius: 12,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  infoButtonInner: {
    padding: 6,
    borderRadius: 11,
    zIndex: 1,
  },
  largeCardWrapper: {
    marginBottom: 16,
    borderRadius: 32,
    overflow: 'hidden',
  },
  largeCard: {
    borderRadius: 32,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  largeCardContent: {
    padding: 20,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  premiumIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumImage: {
    width: 48,
    height: 48,
  },
  journalIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeTag: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridCardWrapper: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_WIDTH * 0.8,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
  },
  gridCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  cardIconContainer: {
    marginBottom: 12,
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gridCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  accountButtons: {
    gap: 8,
    marginBottom: 40,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  accountButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chevron: {
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteText: {
    color: '#EF4444',
  },
  firstNameSection: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  firstNameCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  firstNameCardInner: {
    padding: 20,
    zIndex: 1,
  },
  firstNameTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  firstNameInputContainer: {
    marginBottom: 16,
  },
  firstNameInput: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  firstNameButton: {
    width: '100%',
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalBlur: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoModalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    position: 'relative',
  },
  infoModalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  infoModalLogoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoModalLogo: {
    width: 120,
    height: 120,
  },
  infoModalHeaderCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoModalHeaderCardBlur: {
    padding: 18,
  },
  infoModalHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  infoModalCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoModalHeaderText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    flex: 1,
  },
  infoModalCopyButton: {
    padding: 8,
    backgroundColor: 'rgba(135, 206, 250, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
  },
  infoSection: {
    gap: 16,
  },
  infoPoint: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(135, 206, 250, 0.9)',
    marginTop: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(200, 200, 200, 0.85)',
  },
  highlightText: {
    color: 'rgba(135, 206, 250, 0.9)',
    fontWeight: '600',
  },
});
