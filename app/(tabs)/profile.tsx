import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, Alert, Platform, Clipboard, Linking, Modal, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CheckCircle2, Circle as CircleIcon, ChevronRight, BookOpen, Copy, Info, X, ArrowLeft, Settings, Mail, LogOut, Sparkles, Trash2, User, MapPin, GraduationCap, Briefcase, Heart, Brain, Zap, Clock, Shield, Flag, Banknote, Home, Users, ArrowUpRight, AlertTriangle } from 'lucide-react-native';
import { getProfile, getTodayJournal, getRelationships, deleteAccountData, ensureTwinCode, getInterestProgressNew, updateProfileFields, calculateOverallProgress } from '@/lib/storage';
import { resetDecisionGuide } from '@/lib/guideStorage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTextScramble } from '@/hooks/useTextScramble';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { Colors, Fonts } from '@/constants/Theme';
import { useTypewriter } from '@/hooks/useTypewriter';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const GRID_CARD_WIDTH = (width - 40 - CARD_GAP) / 2;
const RELATIONSHIP_GRAPH_HEIGHT = 220;
const GRAPH_CONTENT_WIDTH = 600;
const SATELLITE_SIZE = 50;

interface ProfileCard {
  id: string;
  title: string;
  subtitle: string;
  onboardingStep?: string;
  route?: string;
  completed: boolean;
  icon?: any;
}

// Animated Progress Arc Component
function AnimatedProgressArc({ progress }: { progress: number }) {
  const radius = 64;
  const centerX = 70;
  const centerY = 70;
  
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
  
  const angle = progress * 2 * Math.PI - Math.PI / 2;
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
}

// Animated Percentage Text Component
function AnimatedPercentageText({ progress }: { progress: number }) {
  return <Text style={styles.percentageText}>{Math.round(progress)}%</Text>;
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const { isPremium } = useTwin();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [journalComplete, setJournalComplete] = useState(false);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [twinCode, setTwinCode] = useState<string>('');
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [interestProgress, setInterestProgress] = useState(0);
  const [overallProgressValue, setOverallProgressValue] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [savingFirstName, setSavingFirstName] = useState(false);
  const [previousRoute, setPreviousRoute] = useState<string>('/(tabs)/home');
  const animatedTwinCode = useTextScramble(twinCode, 1500);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progressAnimRef = useRef<Animated.Value | null>(null);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  
  // Animation refs for fade transitions
  const invitationOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Typewriter for invitation text
  const { displayedLines: invitationLines } = useTypewriter(
    showDiscordModal ? ["You've", "been", "invited"] : [],
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

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      if (user?.id) {
        const { checkPremiumStatus } = useTwin.getState();
        checkPremiumStatus(user.id);
      }
      AsyncStorage.getItem('previous_route_before_profile').then(route => {
        if (route) setPreviousRoute(route);
      });
    }, [user])
  );

  useEffect(() => {
    if (!profileData) return;
    
    const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
    // Pull from dedicated columns first, then fall back to core_json
    const lifeSituationResp = profileData?.life_situation ?? onboardingResponses['02-now'] ?? onboardingResponses['01-now'];
    const lifeJourneyResp = profileData?.life_journey ?? onboardingResponses['02-path'];
    const coreValuesResp = profileData?.core_value ?? onboardingResponses['01-values'] ?? onboardingResponses['03-values'];
    const university = profileData?.university || onboardingResponses.university;
    const hometown = profileData?.hometown || onboardingResponses.hometown;
    const currentLocation = profileData?.current_location;
    const netWorth = profileData?.net_worth;
    const politicalViews = profileData?.political_views;
    
    const tempCards: ProfileCard[] = [
      { id: '02-now', title: '', subtitle: '', completed: !!lifeSituationResp },
      { id: '02-path', title: '', subtitle: '', completed: !!lifeJourneyResp },
      { id: '01-values', title: '', subtitle: '', completed: !!coreValuesResp },
      { id: '04-style', title: '', subtitle: '', completed: !!onboardingResponses['04-style'] },
      { id: '05-day', title: '', subtitle: '', completed: !!onboardingResponses['05-day'] },
      { id: '06-stress', title: '', subtitle: '', completed: !!onboardingResponses['06-stress'] },
      { id: 'university', title: '', subtitle: '', completed: !!university },
      { id: 'hometown', title: '', subtitle: '', completed: !!hometown },
      { id: 'current_location', title: '', subtitle: '', completed: !!currentLocation },
      { id: 'net_worth', title: '', subtitle: '', completed: !!netWorth },
      { id: 'political_views', title: '', subtitle: '', completed: !!politicalViews },
      { id: 'relationships', title: '', subtitle: '', completed: relationships.length > 0 },
    ];
    
    const completedCount = tempCards.filter(card => card.completed).length;
    const calculatedProgress = overallProgressValue;
    
    if (progressAnimRef.current) {
      progressAnimRef.current.stopAnimation();
    }
    progressAnimRef.current = new Animated.Value(0);
    setAnimatedProgress(0);
    
    const animation = Animated.timing(progressAnimRef.current, {
      toValue: calculatedProgress,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    
    const listenerId = progressAnimRef.current.addListener(({ value }) => {
      setAnimatedProgress(value);
    });
    
    animation.start(({ finished }) => {
      if (finished && progressAnimRef.current) {
        progressAnimRef.current.removeListener(listenerId);
        setAnimatedProgress(calculatedProgress);
      }
    });
    
    return () => {
      if (progressAnimRef.current) {
        progressAnimRef.current.stopAnimation();
      }
    };
  }, [profileData, relationships]);

  async function loadProfileData() {
    if (!user) return;
    try {
      const [profile, todayJournal, rels, code, progress, overallProgress] = await Promise.all([
        getProfile(user.id),
        getTodayJournal(user.id),
        getRelationships(user.id),
        ensureTwinCode(user.id),
        getInterestProgressNew(user.id).catch(() => 0),
        calculateOverallProgress(user.id).catch(() => 0)
      ]);
      setProfileData(profile);
      setJournalComplete(!!todayJournal);
      setRelationships(rels || []);
      setTwinCode(code);
      setInterestProgress(progress);
      setFirstName(profile?.first_name || '');
      setOverallProgressValue(overallProgress);
      
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
      Alert.alert('Copied!', 'Your mora# has been copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  async function handleSendFeedback() {
    try {
      const url = 'mailto:jd@hilo.media?subject=mora App Feedback';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else Alert.alert('Error', 'Unable to open email app');
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert('Error', 'Unable to open email app');
    }
  }

  async function handleShowProductGuide() {
    try {
      await resetDecisionGuide();
      trackEvent('Product Guide Replayed');
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to reset product guide:', error);
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

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function handleCardPress(card: ProfileCard) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const sensitiveFields = ['job', 'current_location', 'net_worth', 'dream_self'];
    
    if (sensitiveFields.includes(card.id)) {
      setPendingRoute(card.route || card.onboardingStep || null);
      setShowWarning(true);
      return;
    }

    if (card.id === 'twin_society') {
      setShowDiscordModal(true);
      trackEvent(MixpanelEvents.TWIN_SOCIETY_MODAL_VIEWED, { source: 'profile' });
    } else if (card.onboardingStep) {
      router.push(card.onboardingStep as any);
    } else if (card.route) {
      router.push(card.route as any);
    }
  }

  const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
  // Pull from dedicated columns first, then fall back to core_json
  const lifeSituationResp = profileData?.life_situation ?? onboardingResponses['02-now'] ?? onboardingResponses['01-now'];
  const lifeJourneyResp = profileData?.life_journey ?? onboardingResponses['02-path'];
  const coreValuesResp = profileData?.core_value ?? onboardingResponses['01-values'] ?? onboardingResponses['03-values'];
  const university = profileData?.university || onboardingResponses.university;
  const hometown = profileData?.hometown || onboardingResponses.hometown;
  const currentLocation = profileData?.current_location;
  const netWorth = profileData?.net_worth;
  const politicalViews = profileData?.political_views;
  const job = (profileData?.core_json as any)?.primary_role;

  const identityCards: ProfileCard[] = [
    { id: 'university', title: 'Education', subtitle: university || profileData?.core_json?.university || 'Not set', route: '/profile/edit-university' as any, completed: !!(university || profileData?.core_json?.university), icon: GraduationCap },
    { id: 'job', title: 'Job', subtitle: job || profileData?.core_json?.primary_role || profileData?.core_json?.job || 'Not set', route: '/profile/edit-job' as any, completed: !!(job || profileData?.core_json?.primary_role || profileData?.core_json?.job), icon: Briefcase },
    { id: 'hometown', title: 'Hometown', subtitle: hometown || profileData?.core_json?.hometown || 'Not set', route: '/profile/edit-hometown' as any, completed: !!(hometown || profileData?.core_json?.hometown), icon: Home },
    { id: 'current_location', title: 'Location', subtitle: currentLocation || profileData?.core_json?.current_location || profileData?.core_json?.city || 'Not set', route: '/profile/edit-location' as any, completed: !!(currentLocation || profileData?.core_json?.current_location || profileData?.core_json?.city), icon: MapPin },
    { id: 'net_worth', title: 'Net Worth', subtitle: netWorth || profileData?.core_json?.net_worth || 'Not set', route: '/profile/edit-networth' as any, completed: !!(netWorth || profileData?.core_json?.net_worth), icon: Banknote },
    { id: 'political_views', title: 'Politics', subtitle: politicalViews || profileData?.core_json?.political_views || 'Not set', route: '/profile/edit-politics' as any, completed: !!(politicalViews || profileData?.core_json?.political_views), icon: Flag },
    { id: 'dream_self', title: 'Dream Self', subtitle: profileData?.dream_vision?.net_worth_goal ? 'View your vision' : 'Complete your dream self', route: '/profile/edit-dreamself' as any, completed: !!profileData?.dream_vision?.net_worth_goal, icon: Sparkles },
    { id: 'twin_society', title: 'Twin Society', subtitle: 'Join our Discord community', route: null as any, completed: true, icon: Users },
  ];

  // Helper function to truncate text for preview
  const truncateText = (text: string | undefined, maxLength: number = 60): string => {
    if (!text) return 'Not set';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const mindsetCards: ProfileCard[] = [
    { 
      id: '02-now', 
      title: 'Life Situation', 
      subtitle: lifeSituationResp ? truncateText(lifeSituationResp, 80) : 'Where are you now?', 
      route: '/profile/edit-lifesituation' as any, 
      completed: !!lifeSituationResp, 
      icon: User 
    },
    { 
      id: '02-path', 
      title: 'Life Journey', 
      subtitle: lifeJourneyResp ? truncateText(lifeJourneyResp, 80) : 'How did you get here?', 
      route: '/profile/edit-lifejourney' as any, 
      completed: !!lifeJourneyResp, 
      icon: Briefcase 
    },
    { 
      id: '01-values', 
      title: 'Core Values', 
      subtitle: coreValuesResp ? truncateText(coreValuesResp, 80) : 'What matters most?', 
      route: '/profile/edit-values' as any, 
      completed: !!coreValuesResp, 
      icon: Heart 
    },
    { 
      id: '04-style', 
      title: 'Decision Style', 
      subtitle: onboardingResponses['04-style'] ? truncateText(onboardingResponses['04-style'], 80) : 'How do you decide?', 
      route: '/profile/edit-decisionstyle' as any, 
      completed: !!onboardingResponses['04-style'], 
      icon: Brain 
    },
    { 
      id: '05-day', 
      title: 'Typical Day', 
      subtitle: onboardingResponses['05-day'] ? truncateText(onboardingResponses['05-day'], 80) : 'Walk through a day', 
      route: '/profile/edit-typicalday' as any, 
      completed: !!onboardingResponses['05-day'], 
      icon: Clock 
    },
    { 
      id: '06-stress', 
      title: 'Stress Response', 
      subtitle: onboardingResponses['06-stress'] ? truncateText(onboardingResponses['06-stress'], 80) : 'Reaction to stress', 
      route: '/profile/edit-stress' as any, 
      completed: !!onboardingResponses['06-stress'], 
      icon: Zap 
    },
  ];

  const getRelationshipEmoji = (relationshipType: string): string => {
    const type = relationshipType?.toLowerCase() || '';
    if (type.includes('partner') || type.includes('spouse')) return '❤️';
    if (type.includes('family') || type.includes('parent') || type.includes('sibling') || type.includes('child')) return '👨‍👩‍👧‍👦';
    if (type.includes('coworker') || type.includes('boss') || type.includes('colleague') || type.includes('business')) return '💼';
    if (type.includes('mentor')) return '🎓';
    if (type.includes('friend')) return '👤';
    return '👤';
  };

  const satellitePositions = [
    { x: -130, y: -25 },
    { x: -85, y: -55 },
    { x: -35, y: -75 },
    { x: 35, y: -75 },
    { x: 85, y: -55 },
    { x: 130, y: -25 },
  ];

  const visibleRelationships = relationships.slice(0, 6);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Mora</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <Svg width={140} height={140} style={styles.progressRing}>
                <Defs>
                  <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#84FAB0" />
                    <Stop offset="50%" stopColor="#8FD3F4" />
                    <Stop offset="100%" stopColor="#A1C4FD" />
                  </SvgLinearGradient>
                </Defs>
                <Circle cx={70} cy={70} r={64} stroke="rgba(0,0,0,0.05)" strokeWidth={6} fill="none" />
                <AnimatedProgressArc progress={animatedProgress / 100} />
              </Svg>
              <View style={styles.avatarContainer}>
                <Avatar 
                  name={firstName || user?.email || 'Friend'} 
                  size={80} 
                  variant={(profileData?.avatar_variant as any) || 'beam'} 
                  colors={profileData?.avatar_colors || undefined}
                />
              </View>
              <View style={styles.percentageBadgeWrapper}>
                <View style={styles.percentageBadge}><AnimatedPercentageText progress={animatedProgress} /></View>
              </View>
            </View>
            <View style={styles.usernameContainer}>
              <Text style={styles.username}>{firstName || 'Friend'}</Text>
              <View style={styles.twinCodeContainer}>
                <Text style={styles.twinCode}>mora#{animatedTwinCode || '------'}</Text>
                {twinCode && (
                  <TouchableOpacity onPress={handleCopyTwinCode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Copy size={14} color={Colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily</Text>
            <TouchableOpacity style={styles.singleCard} onPress={() => router.push('/journal' as any)} activeOpacity={0.8}>
              <LinearGradient colors={Colors.gradients.turquoise} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: 0.2 }]} />
              <View style={styles.singleCardContent}>
                <View style={styles.singleCardHeader}><View style={styles.singleCardIcon}><BookOpen size={24} color={Colors.textPrimary} /></View><Text style={styles.singleCardTitle}>Journal</Text></View>
                <Text style={styles.singleCardSubtitle}>{journalComplete ? "Today's entry complete" : "Log your day"}</Text>
                {!journalComplete && (
                  <View style={styles.journalBadge}>
                    <Clock size={12} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.journalBadgeText}>Complete daily journal</Text>
                  </View>
                )}
              </View>
              {journalComplete ? <CheckCircle2 size={24} color="#4ADE80" /> : <ChevronRight size={20} color={Colors.textTertiary} />}
            </TouchableOpacity>
          </View>

          {!isPremium && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premium</Text>
              <View style={styles.cardContainer}>
                <TouchableOpacity onPress={() => router.push('/premium' as any)} style={[styles.rowCard, styles.rowCardFirst, styles.rowCardLast]}>
                  <View style={styles.rowIcon}><Sparkles size={20} color="#FFD700" /></View>
                  <View style={styles.rowContent}><Text style={styles.rowTitle}>Unlock mora+</Text><Text style={styles.rowSubtitle}>Upgrade</Text></View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identity</Text>
            <View style={styles.cardContainer}>
              {identityCards.map((card, index) => (
                <TouchableOpacity key={card.id} style={[styles.rowCard, index === 0 && styles.rowCardFirst, index === identityCards.length - 1 && styles.rowCardLast, index !== identityCards.length - 1 && styles.rowCardBorder]} onPress={() => handleCardPress(card)} activeOpacity={0.7}>
                  <View style={styles.rowIcon}>{card.icon && <card.icon size={20} color={card.completed ? Colors.textPrimary : Colors.textTertiary} />}</View>
                  <View style={styles.rowContent}><Text style={styles.rowTitle}>{card.title}</Text><Text style={styles.rowSubtitle} numberOfLines={1}>{card.subtitle}</Text></View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Relationships</Text>
              <TouchableOpacity onPress={() => router.push('/relationships')} style={styles.manageLink}>
                <Text style={styles.manageLinkText}>Manage</Text>
                <Users size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {relationships.length === 0 ? (
              <TouchableOpacity 
                onPress={() => router.push('/relationships/add')} 
                style={styles.emptyRelationshipCard}
                activeOpacity={0.8}
              >
                <Users size={32} color={Colors.textTertiary} />
                <Text style={styles.emptyRelationshipText}>Add relationships</Text>
                <Text style={styles.emptyRelationshipSubtext}>Connect with people in your life</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.relationshipCard}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.graphScrollContent}
                  contentOffset={{ x: (GRAPH_CONTENT_WIDTH + 40 - (width - 40)) / 2, y: 0 }}
                >
                  <View style={styles.graphContainer}>
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <Svg style={StyleSheet.absoluteFill}>
                        {visibleRelationships.map((_, index) => {
                          const pos = satellitePositions[index];
                          const startX = GRAPH_CONTENT_WIDTH / 2;
                          const startY = RELATIONSHIP_GRAPH_HEIGHT - 40;
                          const endX = startX + pos.x;
                          const endY = startY + pos.y;
                          const controlX = (startX + endX) / 2;
                          const controlY = startY - 30;
                          return (
                            <Path
                              key={`line-${index}`}
                              d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                              stroke="#E5E7EB"
                              strokeWidth="1"
                              strokeDasharray="2, 2"
                              fill="none"
                            />
                          );
                        })}
                      </Svg>
                    </View>

                    {visibleRelationships.map((rel, index) => {
                      const pos = satellitePositions[index];
                      return (
                        <View key={rel.id} style={[styles.satellite, { transform: [{ translateX: pos.x }, { translateY: pos.y }], bottom: 40, left: '50%', marginLeft: -25 }]}>
                          <View style={styles.satelliteIcon}><Text style={styles.satelliteEmoji}>{getRelationshipEmoji(rel.relationship_type)}</Text></View>
                          <Text style={styles.satelliteName} numberOfLines={1}>{rel.name}</Text>
                        </View>
                      );
                    })}

                    <View style={styles.centralNode}><View style={styles.centralNodeInner}><User size={20} color={Colors.textPrimary} /></View></View>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mindset</Text>
            <View style={styles.gridContainer}>
              {mindsetCards.map((card) => (
                <TouchableOpacity key={card.id} style={styles.gridCard} onPress={() => handleCardPress(card)} activeOpacity={0.8}>
                  <View style={styles.gridIcon}>{card.icon && <card.icon size={24} color={card.completed ? '#4ADE80' : Colors.textTertiary} />}</View>
                  <Text style={styles.gridTitle}>{card.title}</Text>
                  {card.subtitle && (
                    <Text style={styles.gridSubtitle} numberOfLines={2}>{card.subtitle}</Text>
                  )}
                  <View style={styles.gridStatus}>{card.completed ? <CheckCircle2 size={16} color="#4ADE80" /> : <CircleIcon size={16} color={Colors.textTertiary} />}</View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.cardContainer}>
              {isPremium && (
                <TouchableOpacity style={[styles.rowCard, styles.rowCardFirst, styles.rowCardBorder]} disabled>
                  <View style={styles.rowIcon}><Sparkles size={20} color="#FFD700" /></View>
                  <View style={styles.rowContent}><Text style={styles.rowTitle}>Premium</Text><Text style={styles.rowSubtitle}>Active</Text></View>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleSendFeedback} style={[styles.rowCard, !isPremium && styles.rowCardFirst, styles.rowCardBorder]}><View style={styles.rowIcon}><Mail size={20} color={Colors.textPrimary} /></View><View style={styles.rowContent}><Text style={styles.rowTitle}>Send Feedback</Text></View><ChevronRight size={20} color={Colors.textTertiary} /></TouchableOpacity>
              <TouchableOpacity onPress={handleShowProductGuide} style={[styles.rowCard, styles.rowCardBorder]}><View style={styles.rowIcon}><Info size={20} color={Colors.textPrimary} /></View><View style={styles.rowContent}><Text style={styles.rowTitle}>Product Guide</Text></View><ChevronRight size={20} color={Colors.textTertiary} /></TouchableOpacity>
              <TouchableOpacity onPress={handleSignOut} style={[styles.rowCard, styles.rowCardBorder]}><View style={styles.rowIcon}><LogOut size={20} color={Colors.textPrimary} /></View><View style={styles.rowContent}><Text style={styles.rowTitle}>Sign Out</Text></View><ChevronRight size={20} color={Colors.textTertiary} /></TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAccount} style={[styles.rowCard, styles.rowCardLast]}><View style={styles.rowIcon}><Trash2 size={20} color="#EF4444" /></View><View style={styles.rowContent}><Text style={[styles.rowTitle, { color: '#EF4444' }]}>Delete Account</Text></View></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={infoModalVisible} transparent animationType="fade" onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.infoModalOverlay}><View style={styles.infoModalContent}><TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.infoModalCloseButton}><X size={24} color={Colors.textTertiary} /></TouchableOpacity><View style={styles.infoModalHeader}><Text style={styles.infoModalTitle}>Your mora#</Text><Text style={styles.infoModalCode}>{twinCode}</Text></View><Text style={styles.infoModalText}>This is your unique twin identifier. Share it with friends to let them include your twin in their decisions.</Text></View></View>
      </Modal>

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
              <View style={styles.invitationTextContainer}>
                {invitationLines.map((line, index) => (
                  <Text key={index} style={styles.invitationText}>
                    {line || ''}
                  </Text>
                ))}
              </View>
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

      {/* Warning Modal */}
      <Modal
        visible={showWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <AlertTriangle size={32} color="#F59E0B" />
            </View>
            <Text style={styles.modalTitle}>Recalculation Warning</Text>
            <Text style={styles.modalDescription}>
              Changing your Current or Dream Twin details will trigger a recalculation of your path. 
              {"\n\n"}
              Your progress percentages and estimated days will be adjusted based on the new "gap" between who you are and who you want to become.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowWarning(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={() => {
                  setShowWarning(false);
                  if (pendingRoute) {
                    router.push(pendingRoute as any);
                  }
                }}
              >
                <Text style={styles.confirmButtonText}>I Understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.primary.regular, fontWeight: '700', color: Colors.textPrimary },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginVertical: 20 },
  avatarWrapper: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  avatarImage: { width: '100%', height: '100%' },
  progressRing: { position: 'absolute', top: 0, left: 0 },
  percentageBadgeWrapper: { position: 'absolute', bottom: 0, right: 0 },
  percentageBadge: { backgroundColor: Colors.textPrimary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  percentageText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', fontFamily: Fonts.secondary.bold },
  usernameContainer: { alignItems: 'center', marginTop: 16 },
  username: { fontSize: 24, fontFamily: Fonts.primary.regular, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  twinCodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  twinCode: { fontSize: 14, fontFamily: Fonts.secondary.bold, color: Colors.textTertiary },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.primary.regular, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  manageLinkText: { fontSize: 14, fontFamily: Fonts.secondary.bold, color: Colors.textPrimary, fontWeight: '600' },
  relationshipCard: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  emptyRelationshipCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  emptyRelationshipText: { fontSize: 16, fontFamily: Fonts.secondary.bold, fontWeight: '600', color: Colors.textPrimary, marginTop: 12, marginBottom: 4 },
  emptyRelationshipSubtext: { fontSize: 13, fontFamily: Fonts.secondary.regular, fontWeight: '300', color: Colors.textTertiary, textAlign: 'center' },
  graphScrollContent: { paddingHorizontal: 20, paddingVertical: 20 },
  graphContainer: { height: RELATIONSHIP_GRAPH_HEIGHT, width: GRAPH_CONTENT_WIDTH, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  centralNode: { position: 'absolute', bottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  centralNodeInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  satellite: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: SATELLITE_SIZE },
  satelliteIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3, marginBottom: 4 },
  satelliteEmoji: { fontSize: 18 },
  satelliteName: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', width: 70 },
  cardContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF' },
  rowCardFirst: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  rowCardLast: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  rowCardBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  rowIcon: { width: 32, alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontFamily: Fonts.secondary.bold, fontWeight: '600', color: Colors.textPrimary },
  rowSubtitle: { fontSize: 13, fontFamily: Fonts.secondary.regular, fontWeight: '300', color: Colors.textTertiary, marginTop: 2 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: (width - 40 - 12) / 2, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'space-between', minHeight: 100 },
  gridIcon: { marginBottom: 12 },
  gridTitle: { fontSize: 15, fontFamily: Fonts.secondary.bold, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  gridSubtitle: { fontSize: 12, fontFamily: Fonts.secondary.regular, fontWeight: '300', color: Colors.textTertiary, lineHeight: 16, marginBottom: 8, flex: 1 },
  gridStatus: { alignSelf: 'flex-end' },
  singleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  singleCardContent: { flex: 1 },
  singleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  singleCardIcon: { marginRight: 4 },
  singleCardTitle: { fontSize: 16, fontFamily: Fonts.secondary.bold, fontWeight: '600', color: Colors.textPrimary },
  singleCardSubtitle: { fontSize: 13, fontFamily: Fonts.secondary.bold, color: Colors.textTertiary },
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
  infoModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  infoModalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  infoModalCloseButton: { position: 'absolute', top: 16, right: 16, padding: 4 },
  infoModalHeader: { alignItems: 'center', marginBottom: 16 },
  infoModalTitle: { fontSize: 14, fontFamily: Fonts.secondary.bold, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  infoModalCode: { fontSize: 32, fontFamily: Fonts.primary.regular, fontWeight: '700', color: Colors.textPrimary },
  infoModalText: { fontSize: 15, fontFamily: Fonts.secondary.bold, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
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
  invitationTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, width: '100%', alignItems: 'center' },
  warningIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, fontFamily: Fonts.primary.regular, marginBottom: 12, textAlign: 'center' },
  modalDescription: { fontSize: 15, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  cancelButton: { backgroundColor: 'rgba(0,0,0,0.05)' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold },
  confirmButton: { backgroundColor: '#F59E0B' },
  confirmButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
});
