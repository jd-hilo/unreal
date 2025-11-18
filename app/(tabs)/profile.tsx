import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, Clipboard, Linking, Modal, Animated } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CheckCircle2, Circle as CircleIcon, Edit3, ChevronRight, BookOpen, Copy, Info, X, ArrowLeft, Settings, Mail, LogOut } from 'lucide-react-native';
import { getProfile, getTodayJournal, getRelationships, deleteAccountData, ensureTwinCode } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTextScramble } from '@/hooks/useTextScramble';
import * as Haptics from 'expo-haptics';

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
      const [profile, todayJournal, relationships, code] = await Promise.all([
        getProfile(user.id),
        getTodayJournal(user.id),
        getRelationships(user.id),
        ensureTwinCode(user.id)
      ]);
      setProfileData(profile);
      setJournalComplete(!!todayJournal);
      setHasRelationships(relationships && relationships.length > 0);
      setTwinCode(code);
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
      title: 'Current Life Situation',
      subtitle: lifeSituationResp
        ? (lifeSituationResp as string).substring(0, 50) + '...'
        : 'Where are you in life right now?',
      route: '/profile/edit-lifesituation' as any,
      completed: !!lifeSituationResp,
    },
    {
      id: '02-path',
      title: 'Life Journey',
      subtitle: onboardingResponses['02-path']
        ? onboardingResponses['02-path'].substring(0, 50) + '...'
        : 'How did you get here?',
      route: '/profile/edit-lifejourney' as any,
      completed: !!onboardingResponses['02-path'],
    },
    {
      id: '01-values',
      title: 'Core Values',
      subtitle: coreValuesResp
        ? (coreValuesResp as string).substring(0, 50) + '...'
        : 'What matters most to you?',
      route: '/profile/edit-values' as any,
      completed: !!coreValuesResp,
    },
    {
      id: '04-style',
      title: 'Decision-Making Style',
      subtitle: onboardingResponses['04-style']
        ? onboardingResponses['04-style'].substring(0, 50) + '...'
        : 'How do you usually make big decisions?',
      route: '/profile/edit-decisionstyle' as any,
      completed: !!onboardingResponses['04-style'],
    },
    {
      id: '05-day',
      title: 'Typical Day',
      subtitle: onboardingResponses['05-day']
        ? onboardingResponses['05-day'].substring(0, 50) + '...'
        : 'Walk me through a typical day',
      route: '/profile/edit-typicalday' as any,
      completed: !!onboardingResponses['05-day'],
    },
    {
      id: '06-stress',
      title: 'Stress Response',
      subtitle: onboardingResponses['06-stress']
        ? onboardingResponses['06-stress'].substring(0, 50) + '...'
        : 'When things get hard, how do you react?',
      route: '/profile/edit-stress' as any,
      completed: !!onboardingResponses['06-stress'],
    },
    {
      id: 'university',
      title: 'Education',
      subtitle: university || 'Add your university',
      route: '/profile/edit-university' as any,
      completed: !!university,
    },
    {
      id: 'hometown',
      title: 'Hometown',
      subtitle: hometown || 'Where did you grow up?',
      route: '/profile/edit-hometown' as any,
      completed: !!hometown,
    },
    {
      id: 'current_location',
      title: 'Current Location',
      subtitle: currentLocation || 'Where do you live now?',
      route: '/profile/edit-location' as any,
      completed: !!currentLocation,
    },
    {
      id: 'net_worth',
      title: 'Net Worth',
      subtitle: netWorth || 'Your approximate net worth',
      route: '/profile/edit-networth' as any,
      completed: !!netWorth,
    },
    {
      id: 'political_views',
      title: 'Political Views',
      subtitle: politicalViews || 'Your political perspective',
      route: '/profile/edit-politics' as any,
      completed: !!politicalViews,
    },
    {
      id: 'relationships',
      title: 'Relationships',
      subtitle: hasRelationships 
        ? 'Manage your relationships'
        : 'Add people who influence your decisions',
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Avatar Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarWrapper}>
                {/* Circular Progress Ring */}
                <Svg width={140} height={140} style={styles.progressRing}>
                  <Defs>
                    <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="rgba(135, 206, 250, 0.9)" />
                      <Stop offset="50%" stopColor="rgba(100, 181, 246, 0.8)" />
                      <Stop offset="100%" stopColor="rgba(135, 206, 250, 0.7)" />
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
                    {/* Classic glass border */}
                    <View style={styles.badgeGlassBorder} />
                    {/* Subtle inner highlight */}
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

            {/* Unreal+ Premium Card */}
            <TouchableOpacity
              style={styles.premiumCardWrapper}
              onPress={() => !isPremium && router.push('/premium' as any)}
              activeOpacity={isPremium ? 1 : 0.85}
              disabled={isPremium}
            >
              <BlurView intensity={80} tint="dark" style={styles.premiumCard}>
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
                <View style={styles.premiumCardInner}>
                  <View style={styles.premiumRow}>
                    <View style={styles.premiumImageContainer}>
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
                          ? 'Full access to biometrics & simulations'
                          : 'Unlock biometrics and life trajectory simulations'
                        }
                      </Text>
                    </View>
                    {!isPremium && <ChevronRight size={20} color="rgba(255,255,255,0.6)" />}
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Daily Journal Card */}
            <TouchableOpacity
              style={styles.journalCardWrapper}
              onPress={() => router.push('/journal' as any)}
              activeOpacity={0.85}
            >
              <BlurView intensity={80} tint="dark" style={styles.journalCard}>
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
                <View style={styles.journalCardInner}>
                  <View style={styles.journalRow}>
                    <View style={styles.journalIconContainer}>
                      {journalComplete ? (
                        <CheckCircle2 size={24} color="rgba(135, 206, 250, 0.9)" strokeWidth={2.5} />
                      ) : (
                        <BookOpen size={24} color="rgba(135, 206, 250, 0.9)" strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.journalContent}>
                      <Text style={styles.journalTitle}>Daily Journal</Text>
                      <Text style={styles.journalSubtitle}>
                        {journalComplete 
                          ? "Today's journal complete"
                          : 'Journal your days and help your twin understand you'
                        }
                      </Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Profile sections */}
            <View style={styles.cards}>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.cardWrapper}
                  onPress={() => handleCardPress(card)}
                  activeOpacity={0.85}
                >
                  <BlurView intensity={80} tint="dark" style={styles.card}>
                    {/* Classic glass border */}
                    <View style={styles.cardGlassBorder} />
                    {/* Subtle inner highlight */}
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.cardGlassHighlight}
                      pointerEvents="none"
                    />
                    <View style={styles.cardInner}>
                      <View style={styles.cardIconContainer}>
                        {card.completed ? (
                          <CheckCircle2 size={20} color="rgba(135, 206, 250, 0.9)" strokeWidth={2.5} />
                        ) : (
                          <CircleIcon size={20} color="rgba(150, 150, 150, 0.6)" strokeWidth={2} />
                        )}
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{card.title}</Text>
                        <Text style={styles.cardSubtitle} numberOfLines={2}>
                          {card.subtitle}
                        </Text>
                      </View>
                      <View style={styles.cardAction}>
                        <Edit3 size={18} color="rgba(150, 150, 150, 0.6)" />
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.feedbackButtonWrapper}>
              <BlurView intensity={80} tint="dark" style={styles.feedbackButton}>
                {/* Classic glass border */}
                <View style={styles.buttonGlassBorder} />
                {/* Subtle inner highlight */}
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGlassHighlight}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  onPress={handleSendFeedback}
                  activeOpacity={0.9}
                  style={styles.feedbackButtonInner}
                >
                  <Mail size={20} color="#FFFFFF" />
                  <Text style={styles.feedbackText}>Send Feedback</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </BlurView>
            </View>

            <View style={styles.signOutButtonWrapper}>
              <BlurView intensity={80} tint="dark" style={styles.signOutButton}>
                {/* Classic glass border */}
                <View style={styles.buttonGlassBorder} />
                {/* Subtle inner highlight */}
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGlassHighlight}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  onPress={handleSignOut}
                  activeOpacity={0.9}
                  style={styles.signOutButtonInner}
                >
                  <LogOut size={20} color="#FFFFFF" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </BlurView>
            </View>

            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={styles.deleteButton}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(25, 10, 10, 0.95)', 'rgba(60, 15, 15, 0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.deleteButtonInner}
              >
                <Text style={styles.deleteText}>Delete Account</Text>
              </LinearGradient>
            </TouchableOpacity>
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
            <View style={styles.infoModalContent}>
              <LinearGradient
                colors={['rgba(20, 10, 35, 0.98)', 'rgba(30, 15, 50, 0.98)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoModalGradient}
              >
                <TouchableOpacity 
                  onPress={() => setInfoModalVisible(false)}
                  style={styles.infoModalCloseButton}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.infoModalHeader}>
                  <View style={styles.infoIconContainer}>
                    <Info size={32} color="#4169E1" strokeWidth={2.5} />
                  </View>
                </View>

                <View style={styles.codeDisplayBox}>
                  <Text style={styles.codeDisplayLabel}>YOUR UNIQUE IDENTIFIER</Text>
                  <Text style={styles.codeDisplayValue}>{twinCode}</Text>
                  <View style={styles.scanlineEffect} />
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

                <View style={styles.techBorder}>
                  <Text style={styles.techBorderText}>SYSTEM_ID: {twinCode}</Text>
                </View>
              </LinearGradient>
            </View>
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
    backgroundColor: '#0C0C10',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
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
  proBadge: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -30 }],
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
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
  badgeGlassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
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
    shadowColor: 'rgba(30, 50, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: 'rgba(30, 50, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(183, 149, 255, 0.3)',
  },
  infoModalGradient: {
    padding: 28,
  },
  infoModalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  infoModalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(183, 149, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(183, 149, 255, 0.3)',
  },
  infoModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Courier New',
    letterSpacing: 2,
  },
  codeDisplayBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.4)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  codeDisplayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4169E1',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: 'Courier New',
  },
  codeDisplayValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Courier New',
    letterSpacing: 4,
  },
  scanlineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(183, 149, 255, 0.5)',
  },
  infoSection: {
    gap: 20,
    marginBottom: 24,
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
    backgroundColor: '#4169E1',
    marginTop: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(220, 220, 220, 0.9)',
  },
  highlightText: {
    color: '#4169E1',
    fontWeight: '600',
    fontFamily: 'Courier New',
  },
  techBorder: {
    borderTopWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.3)',
    paddingTop: 16,
    alignItems: 'center',
  },
  techBorderText: {
    fontSize: 11,
    fontFamily: 'Courier New',
    color: 'rgba(183, 149, 255, 0.6)',
    letterSpacing: 1,
  },
  progressCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  progressCardInner: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  compassIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(110, 61, 240, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cubeIcon: {
    width: 24,
    height: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  progressSubtitle: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    marginTop: 12,
  },
  journalCardWrapper: {
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  journalCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  journalCardInner: {
    padding: 20,
    borderRadius: 24,
    zIndex: 1,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  journalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalContent: {
    flex: 1,
  },
  journalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  journalSubtitle: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 18,
  },
  cards: {
    gap: 12,
    marginBottom: 32,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  cardGlassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
  },
  cardGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    zIndex: 1,
  },
  cardIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 18,
  },
  cardAction: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonWrapper: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  feedbackButton: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  buttonGlassBorder: {
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
  buttonGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  feedbackButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  feedbackText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signOutButtonWrapper: {
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  signOutButton: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  signOutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  deleteButtonInner: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 16,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  premiumCardWrapper: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumCard: {
    borderRadius: 24,
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
  premiumCardInner: {
    padding: 16,
    borderRadius: 24,
    zIndex: 1,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumImageContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumImage: {
    width: 28,
    height: 28,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
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
    letterSpacing: 0.5,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 16,
  },
});
