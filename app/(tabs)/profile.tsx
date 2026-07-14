import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, Alert, Platform, Clipboard, Linking, Modal, Animated, Dimensions, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CheckCircle2, Circle as CircleIcon, ChevronRight, ChevronDown, BookOpen, Copy, X, ArrowLeft, Settings, Sparkles, User, MapPin, GraduationCap, Briefcase, Heart, Brain, Zap, Activity, Shield, Flag, Banknote, Home, Users, ArrowUpRight, AlertTriangle, MessageCircle } from 'lucide-react-native';
import {
  getProfile,
  getRelationships,
  ensureTwinCode,
  getInterestProgressNew,
  updateProfileFields,
  calculateOverallProgress,
  ensureTwinBriefingSeeded,
} from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTextScramble } from '@/hooks/useTextScramble';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { Colors, Fonts } from '@/constants/Theme';
import { useTypewriter } from '@/hooks/useTypewriter';
import {
  getLifeSituationDisplay,
  getCoreValuesDisplay,
  getHealthWellnessSummary,
  getHealthStressSummary,
  getArchitectInsightLog,
  getTwinBriefingFromCoreJson,
  getLifeJourneyDisplay,
  getDecisionStyleDisplay,
} from '@/lib/twinInsights';
import type { TwinArchetypeResult } from '@/lib/ai';
import { LigatureFreeText } from '@/components/LigatureFreeText';

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

function TwinHeaderTag({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <LinearGradient
      colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.twinRevealTag}
    >
      {icon}
      <Text style={styles.twinRevealTagText}>{text}</Text>
    </LinearGradient>
  );
}

function friendlyThreadDomain(domain: string): string {
  const map: Record<string, string> = {
    career: 'Work',
    relationships: 'People',
    health: 'Health',
    money: 'Money',
    personal: 'Life',
  };
  return map[domain] || domain;
}

function friendlyThreadStatus(status: string): string {
  const map: Record<string, string> = {
    deciding: 'Thinking it over',
    active: 'Active',
    stalled: 'On hold',
    resolved: 'Done',
  };
  return map[status] || status;
}

export type ProfileShellMode = 'twin_insights' | 'full';

/**
 * Twin tab + `/twin-insights` use `twin_insights` (easy-to-read twin view).
 * `/full-profile` uses `full` (long form: facts, premium).
 */
export function ProfileShell({
  mode,
  isTab = false,
}: {
  mode: ProfileShellMode;
  /** True when rendered as the tab bar screen (no back — use settings or Home). */
  isTab?: boolean;
}) {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [resolvedThreadsExpanded, setResolvedThreadsExpanded] = useState(false);
  const contentFade = useRef(new Animated.Value(0)).current;
  
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

  useEffect(() => {
    if (profileData) {
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [profileData, contentFade]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      if (user?.id) {
        const { checkPremiumStatus } = useTwin.getState();
        checkPremiumStatus(user.id);
      }
      AsyncStorage.getItem('previous_route_before_profile').then((route) => {
        if (route) setPreviousRoute(route);
      });
    }, [user])
  );

  useEffect(() => {
    if (!profileData) return;
    
    const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
    const lifeSituationDisp = getLifeSituationDisplay(profileData);
    const lifeJourneyResp = getLifeJourneyDisplay(profileData);
    const coreValuesDisp = getCoreValuesDisplay(profileData);
    const hw = getHealthWellnessSummary(onboardingResponses as Record<string, unknown>);
    const hs = getHealthStressSummary(onboardingResponses as Record<string, unknown>);
    const university = profileData?.university || onboardingResponses.university;
    const hometown = profileData?.hometown || onboardingResponses.hometown;
    const currentLocation = profileData?.current_location;
    const netWorth = profileData?.net_worth;
    const politicalViews = profileData?.political_views;
    
    const tempCards: ProfileCard[] = [
      { id: '02-now', title: '', subtitle: '', completed: !!lifeSituationDisp },
      { id: '02-path', title: '', subtitle: '', completed: !!lifeJourneyResp },
      { id: '01-values', title: '', subtitle: '', completed: !!coreValuesDisp },
      { id: '04-style', title: '', subtitle: '', completed: !!onboardingResponses['04-style'] },
      { id: 'health-wellness', title: '', subtitle: '', completed: hw.completed },
      { id: 'health-stress', title: '', subtitle: '', completed: hs.completed },
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
      const [profile, rels, code, progress, overallProgress] = await Promise.all([
        getProfile(user.id),
        getRelationships(user.id),
        ensureTwinCode(user.id),
        getInterestProgressNew(user.id).catch(() => 0),
        calculateOverallProgress(user.id).catch(() => 0)
      ]);
      setProfileData(profile);
      if (user?.id) {
        await ensureTwinBriefingSeeded(user.id);
        const refreshed = await getProfile(user.id);
        if (refreshed) setProfileData(refreshed);
      }
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

  function handleCardPress(card: ProfileCard) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const sensitiveFields = ['job', 'current_location', 'net_worth', 'dream_self'];
    
    if (sensitiveFields.includes(card.id)) {
      setPendingRoute(card.route || card.onboardingStep || null);
      setShowWarning(true);
      return;
    }

    if (card.id === 'twin_society') {
      trackEvent(MixpanelEvents.TWIN_SOCIETY_JOIN_CLICKED);
      Linking.openURL('https://discord.gg/yYKYZNfQ');
    } else if (card.onboardingStep) {
      router.push(card.onboardingStep as any);
    } else if (card.route) {
      router.push(card.route as any);
    }
  }

  const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
  const twinBriefing = profileData ? getTwinBriefingFromCoreJson(profileData.core_json) : null;
  const lifeSituationResp = getLifeSituationDisplay(profileData);
  const lifeJourneyResp = getLifeJourneyDisplay(profileData);
  const coreValuesResp = getCoreValuesDisplay(profileData);
  const decisionStyleResp = getDecisionStyleDisplay(profileData);
  const healthWellness = getHealthWellnessSummary(onboardingResponses as Record<string, unknown>);
  const healthStress = getHealthStressSummary(onboardingResponses as Record<string, unknown>);
  const architectInsightEntries = getArchitectInsightLog(profileData?.core_json as any);
  const university = profileData?.university || onboardingResponses.university;
  const hometown = profileData?.hometown || onboardingResponses.hometown;
  const currentLocation = profileData?.current_location;
  const netWorth = profileData?.net_worth;
  const politicalViews = profileData?.political_views;
  const job = (profileData?.core_json as any)?.primary_role;
  
  // Format relationship subtitle
  const relationshipStatus = profileData?.relationship_details?.status;
  const partnerName = profileData?.relationship_details?.partnerName;
  const howLong = profileData?.relationship_details?.howLong;
  let relationshipSubtitle = 'Not set';
  if (relationshipStatus) {
    if (partnerName && howLong) {
      relationshipSubtitle = `${relationshipStatus} - ${partnerName} (${howLong})`;
    } else if (partnerName) {
      relationshipSubtitle = `${relationshipStatus} - ${partnerName}`;
    } else {
      relationshipSubtitle = relationshipStatus;
    }
  }

  const identityCards: ProfileCard[] = [
    { id: 'university', title: 'Education', subtitle: university || profileData?.core_json?.university || 'Not set', route: '/profile/edit-university' as any, completed: !!(university || profileData?.core_json?.university), icon: GraduationCap },
    { id: 'job', title: 'Job', subtitle: job || profileData?.core_json?.primary_role || profileData?.core_json?.job || 'Not set', route: '/profile/edit-job' as any, completed: !!(job || profileData?.core_json?.primary_role || profileData?.core_json?.job), icon: Briefcase },
    { id: 'relationship', title: 'Relationship', subtitle: relationshipSubtitle, route: '/profile/edit-relationship' as any, completed: !!relationshipStatus, icon: Heart },
    { id: 'hometown', title: 'Hometown', subtitle: hometown || profileData?.core_json?.hometown || 'Not set', route: '/profile/edit-hometown' as any, completed: !!(hometown || profileData?.core_json?.hometown), icon: Home },
    { id: 'current_location', title: 'Location', subtitle: currentLocation || profileData?.core_json?.current_location || profileData?.core_json?.city || 'Not set', route: '/profile/edit-location' as any, completed: !!(currentLocation || profileData?.core_json?.current_location || profileData?.core_json?.city), icon: MapPin },
    { id: 'net_worth', title: 'Net Worth', subtitle: netWorth || profileData?.core_json?.net_worth || 'Not set', route: '/profile/edit-networth' as any, completed: !!(netWorth || profileData?.core_json?.net_worth), icon: Banknote },
    { id: 'political_views', title: 'Politics', subtitle: politicalViews || profileData?.core_json?.political_views || 'Not set', route: '/profile/edit-politics' as any, completed: !!(politicalViews || profileData?.core_json?.political_views), icon: Flag },
    { id: 'dream_self', title: 'Dream life', subtitle: profileData?.dream_vision?.net_worth_goal ? 'Tap to view or edit' : 'Optional big goal', route: '/profile/edit-dreamself' as any, completed: !!profileData?.dream_vision?.net_worth_goal, icon: Sparkles },
    { id: 'twin_society', title: 'Twin Society', subtitle: 'Join our Discord community', route: null as any, completed: true, icon: Users },
  ];

  // Helper function to truncate text for preview
  const truncateText = (text: string | undefined, maxLength: number = 60): string => {
    if (!text) return 'Not set';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const lensWhatsDraining =
    twinBriefing?.lens?.whats_draining?.trim() || healthStress.text || '';
  const lensSupport = twinBriefing?.lens?.support_system?.trim() || '';

  const lensRows: ProfileCard[] = [
    {
      id: 'whats_important',
      title: 'What matters to you',
      subtitle: coreValuesResp ? truncateText(coreValuesResp, 72) : 'Tap to add',
      route: '/profile/edit-values' as any,
      completed: !!coreValuesResp,
      icon: Heart,
    },
    {
      id: 'how_they_decide',
      title: 'How you choose',
      subtitle: decisionStyleResp ? truncateText(decisionStyleResp, 72) : 'Tap to add',
      route: '/profile/edit-decisionstyle' as any,
      completed: !!decisionStyleResp,
      icon: Brain,
    },
    {
      id: 'whats_draining',
      title: 'What wears you out',
      subtitle: lensWhatsDraining ? truncateText(lensWhatsDraining, 72) : 'Tap to add',
      route: '/profile/edit-stress' as any,
      completed: !!lensWhatsDraining || healthStress.completed,
      icon: Zap,
    },
    {
      id: 'support_system',
      title: 'Who helps you',
      subtitle: lensSupport ? truncateText(lensSupport, 72) : 'Tap to add',
      route: '/profile/edit-context' as any,
      completed: !!lensSupport,
      icon: Users,
    },
  ];

  const nearTermDisplay =
    twinBriefing?.direction?.near_term?.trim() ||
    (typeof onboardingResponses['02-path'] === 'string' ? onboardingResponses['02-path'].trim().slice(0, 200) : '') ||
    '';
  const horizonDisplay =
    twinBriefing?.direction?.horizon?.trim() ||
    lifeJourneyResp?.trim() ||
    '';

  const resolvedThreads = twinBriefing?.threads.filter((t) => t.status === 'resolved') ?? [];
  const activeThreadsForTwin =
    twinBriefing?.threads.filter((t) => t.status !== 'resolved' && t.summary.trim()) ?? [];
  const storedArchetype = (profileData?.core_json as { twin_archetype?: TwinArchetypeResult } | undefined)
    ?.twin_archetype;
  const twinDisplayName = twinBriefing?.identity?.name?.trim() || firstName || 'Friend';
  const twinLocationLine =
    twinBriefing?.identity?.location?.trim() ||
    currentLocation ||
    hometown ||
    (typeof profileData?.core_json?.city === 'string' ? String(profileData.core_json.city).trim() : '') ||
    '';
  const twinAgeLine = twinBriefing?.identity?.age?.trim();
  const twinWorkLine = twinBriefing?.identity?.work?.trim();

  const briefingTwinTitle = useMemo(() => {
    const first = activeThreadsForTwin[0];
    if (first?.summary?.trim()) {
      const s = first.summary.trim();
      return s.length > 88 ? `${s.slice(0, 88)}…` : s;
    }
    if (nearTermDisplay.trim()) {
      const s = nearTermDisplay.trim();
      return s.length > 80 ? `${s.slice(0, 80)}…` : s;
    }
    return 'Your twin';
  }, [activeThreadsForTwin, nearTermDisplay]);

  const briefingTwinBody = useMemo(() => {
    const parts: string[] = [];
    activeThreadsForTwin.slice(0, 3).forEach((t) => {
      const sum = t.summary?.trim();
      const st = t.stakes?.trim();
      if (sum && st) parts.push(`${sum} ${st}`);
      else if (sum) parts.push(sum);
    });
    const L = twinBriefing?.lens;
    if (L?.whats_important?.trim()) parts.push(L.whats_important.trim());
    if (L?.how_they_decide?.trim()) parts.push(L.how_they_decide.trim());
    if (L?.whats_draining?.trim()) parts.push(L.whats_draining.trim());
    if (L?.support_system?.trim()) parts.push(L.support_system.trim());
    if (horizonDisplay.trim()) parts.push(`Big picture: ${horizonDisplay.trim()}`);
    if (nearTermDisplay.trim() && !activeThreadsForTwin[0]) parts.push(`Soon: ${nearTermDisplay.trim()}`);
    const joined = parts.join(' ');
    if (!joined.trim()) {
      return 'Use Update twin or chat in Decide to fill this in.';
    }
    return joined.length > 280 ? `${joined.slice(0, 280)}…` : joined;
  }, [activeThreadsForTwin, twinBriefing, horizonDisplay, nearTermDisplay]);

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
          {isTab ? (
            <View style={[styles.backButton, { opacity: 0 }]} pointerEvents="none" />
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {mode === 'full' ? 'All your facts' : 'Twin insights'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/account-settings' as any);
            }}
            style={styles.backButton}
            hitSlop={12}
          >
            <Settings size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        
        <Animated.ScrollView
          style={[styles.scrollView, { opacity: contentFade }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'twin_insights' && (
          <View style={styles.twinRevealHeader}>
            <View style={styles.twinRevealHeaderLeft}>
              <View style={styles.twinRevealNameRow}>
                <Text style={styles.twinRevealHeaderName}>{twinDisplayName}</Text>
              </View>
              {twinLocationLine.trim() !== '' && (
                <View style={styles.twinRevealLocationRow}>
                  <MapPin size={14} color={Colors.textSecondary} />
                  <Text style={styles.twinRevealHeaderLocation}>{twinLocationLine}</Text>
                </View>
              )}
              <View style={styles.twinRevealTagsRow}>
                {relationshipStatus && relationshipStatus !== 'Not set' && (
                  <TwinHeaderTag
                    icon={<Heart size={10} color="#696969" />}
                    text={relationshipStatus}
                  />
                )}
                {twinAgeLine ? (
                  <TwinHeaderTag icon={<User size={10} color="#696969" />} text={`Age ${twinAgeLine}`} />
                ) : null}
                {twinWorkLine ? (
                  <TwinHeaderTag
                    icon={<Briefcase size={10} color="#696969" />}
                    text={truncateText(twinWorkLine, 28)}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.twinRevealHeaderRight} pointerEvents="box-none">
              <View style={styles.twinRevealCodeRow}>
                <Text style={styles.twinRevealCodeText}>mora#: {animatedTwinCode || '------'}</Text>
                {twinCode ? (
                  <TouchableOpacity
                    onPress={handleCopyTwinCode}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Copy size={14} color="rgba(0,0,0,0.15)" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Image
                source={require('@/assets/images/manwhite.png')}
                style={[styles.twinRevealManImage, { transform: [{ scaleX: -1 }] }]}
                resizeMode="contain"
              />
            </View>
          </View>
          )}

          {mode === 'twin_insights' && (
          <View style={styles.twinSnapshotCard}>
            {storedArchetype ? (
              <>
                <View style={styles.twinArchetypeHeader}>
                  <View style={styles.twinArchetypeIconWrap}>
                    <Image
                      source={require('@/assets/images/icon.png')}
                      style={styles.twinArchetypeIconImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.twinArchetypeLabel}>YOUR STYLE</Text>
                </View>
                <Text style={styles.twinArchetypeTitle}>{storedArchetype.title}</Text>
                <LigatureFreeText text={storedArchetype.description} style={styles.twinArchetypeDescription} />
                <View style={styles.twinDnaBox}>
                  <Text style={styles.twinDnaLabel}>HEAD, GUT, HEART</Text>
                  <View style={styles.twinDnaRow}>
                    <Text style={styles.twinDnaRowLabel}>Logic</Text>
                    <View style={styles.twinDnaBarTrack}>
                      <View
                        style={[
                          styles.twinDnaBarFill,
                          { width: `${storedArchetype.traits.logic}%`, backgroundColor: '#8EC5FC' },
                        ]}
                      />
                    </View>
                    <Text style={styles.twinDnaValue}>{storedArchetype.traits.logic}%</Text>
                  </View>
                  <View style={styles.twinDnaRow}>
                    <Text style={styles.twinDnaRowLabel}>Intuition</Text>
                    <View style={styles.twinDnaBarTrack}>
                      <View
                        style={[
                          styles.twinDnaBarFill,
                          { width: `${storedArchetype.traits.intuition}%`, backgroundColor: '#6BCA9A' },
                        ]}
                      />
                    </View>
                    <Text style={styles.twinDnaValue}>{storedArchetype.traits.intuition}%</Text>
                  </View>
                  <View style={styles.twinDnaRow}>
                    <Text style={styles.twinDnaRowLabel}>Emotion</Text>
                    <View style={styles.twinDnaBarTrack}>
                      <View
                        style={[
                          styles.twinDnaBarFill,
                          { width: `${storedArchetype.traits.emotion}%`, backgroundColor: '#E87A7F' },
                        ]}
                      />
                    </View>
                    <Text style={styles.twinDnaValue}>{storedArchetype.traits.emotion}%</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.twinArchetypeHeader}>
                  <View style={styles.twinArchetypeIconWrap}>
                    <Image
                      source={require('@/assets/images/icon.png')}
                      style={styles.twinArchetypeIconImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.twinArchetypeLabel}>YOUR TWIN</Text>
                </View>
                <Text style={styles.twinArchetypeTitle}>{briefingTwinTitle}</Text>
                <Text style={styles.twinArchetypeDescription}>{briefingTwinBody}</Text>
              </>
            )}
            <TouchableOpacity
              onPress={() => router.push('/twin-update' as any)}
              activeOpacity={0.85}
              style={styles.twinRefineCta}
            >
              <Sparkles size={18} color="#25729f" />
              <Text style={styles.twinRefineCtaText}>Add or fix info</Text>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
          )}

          {mode === 'twin_insights' && activeThreadsForTwin.length > 0 && (
            <View style={styles.twinThreadsSection}>
              <Text style={styles.twinThreadsSectionTitle}>What’s on your mind</Text>
              <Text style={styles.twinThreadsSectionSub}>From your chats and updates.</Text>
              <View style={styles.twinThreadsList}>
                {activeThreadsForTwin.map((t) => (
                  <View key={t.id} style={styles.twinThreadCard}>
                    <View style={styles.twinThreadCardTop}>
                      <Text style={styles.twinThreadDomain}>{friendlyThreadDomain(t.domain)}</Text>
                      <Text style={styles.twinThreadStatus}>{friendlyThreadStatus(t.status)}</Text>
                    </View>
                    <Text style={styles.twinThreadSummary} numberOfLines={3}>
                      {t.summary}
                    </Text>
                    {t.stakes?.trim() ? (
                      <Text style={styles.twinThreadStakes} numberOfLines={2}>
                        {t.stakes}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {mode === 'twin_insights' && (
          <View style={styles.twinCompletenessCard}>
            <View style={styles.twinCompletenessTop}>
              <Avatar
                name={firstName || user?.email || 'Friend'}
                size={44}
                variant={(profileData?.avatar_variant as any) || 'beam'}
                colors={profileData?.avatar_colors || undefined}
              />
              <View style={styles.twinCompletenessCopy}>
                <Text style={styles.twinCompletenessTitle}>How well we know you</Text>
                <Text style={styles.twinCompletenessSub}>More detail means answers that fit you.</Text>
              </View>
              <View style={styles.twinCompletenessPctWrap}>
                <Text style={styles.twinCompletenessPct}>{Math.round(animatedProgress)}%</Text>
              </View>
            </View>
            <View style={styles.twinCompletenessTrack}>
              <View style={[styles.twinCompletenessFill, { width: `${Math.min(100, animatedProgress)}%` }]} />
            </View>
          </View>
          )}

          {mode === 'twin_insights' && (
            <TouchableOpacity
              style={styles.fullProfileEntry}
              activeOpacity={0.88}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/full-profile' as any);
              }}
            >
              <View style={styles.fullProfileEntryTextCol}>
                <Text style={styles.fullProfileEntryTitle}>School, work, money, and more</Text>
                <Text style={styles.fullProfileEntrySub}>Tap to edit all fact fields in one list.</Text>
              </View>
              <ChevronRight size={22} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {mode === 'full' && (
            <>
              <View style={styles.editorialBlock}>
                <Text style={styles.editorialKicker}>Profile</Text>
                <Text style={styles.editorialHeadline}>Your details</Text>
                <Text style={styles.editorialLead}>Tap a row to change it.</Text>
              </View>

              {!isPremium && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Premium</Text>
                  <View style={styles.cardContainer}>
                    <TouchableOpacity
                      onPress={() => router.push('/premium' as any)}
                      style={[styles.rowCard, styles.rowCardFirst, styles.rowCardLast]}
                    >
                      <View style={styles.rowIcon}>
                        <Sparkles size={20} color="#FFD700" />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowTitle}>Unlock mora+</Text>
                        <Text style={styles.rowSubtitle}>Upgrade</Text>
                      </View>
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.editorialBlockTight}>
                  <Text style={styles.editorialKicker}>You</Text>
                  <Text style={styles.editorialHeadline}>About you</Text>
                </View>
                <View style={styles.cardContainer}>
                  {identityCards.map((card, index) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.rowCard,
                        index === 0 && styles.rowCardFirst,
                        index === identityCards.length - 1 && styles.rowCardLast,
                        index !== identityCards.length - 1 && styles.rowCardBorder,
                      ]}
                      onPress={() => handleCardPress(card)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowIcon}>
                        {card.icon && <card.icon size={20} color={card.completed ? Colors.textPrimary : Colors.textTertiary} />}
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowTitle}>{card.title}</Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {card.subtitle}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={styles.section}>
            <View style={[styles.editorialBlockTight, { paddingHorizontal: 4 }]}>
              <Text style={styles.editorialKicker}>People</Text>
              <Text style={styles.editorialHeadline}>People in your life</Text>
              <Text style={styles.editorialLead}>Folks who show up in your choices.</Text>
            </View>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }} />
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
                <Text style={styles.emptyRelationshipSubtext}>Tap to add people you care about.</Text>
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
            <View style={styles.editorialBlockTight}>
              <Text style={styles.editorialKicker}>Choices</Text>
              <Text style={styles.editorialHeadline}>How you decide</Text>
            </View>
            <View style={styles.cardContainer}>
              {lensRows.map((card, index) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.rowCard,
                    index === 0 && styles.rowCardFirst,
                    index === lensRows.length - 1 && styles.rowCardLast,
                    index !== lensRows.length - 1 && styles.rowCardBorder,
                  ]}
                  onPress={() => handleCardPress(card)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIcon}>
                    {card.icon && <card.icon size={20} color={card.completed ? Colors.textPrimary : Colors.textTertiary} />}
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{card.title}</Text>
                    <Text style={styles.rowSubtitle} numberOfLines={2}>
                      {card.subtitle}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.editorialBlockTight, { marginTop: 20 }]}>
              <Text style={styles.editorialKicker}>Plans</Text>
              <Text style={styles.editorialHeadline}>Where you’re headed</Text>
              <Text style={styles.editorialLead}>Soon, then the bigger picture.</Text>
            </View>
            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={[styles.rowCard, styles.rowCardFirst, styles.rowCardBorder]}
                onPress={() => router.push('/profile/edit-lifejourney' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.rowIcon}>
                  <Briefcase size={20} color={nearTermDisplay ? Colors.textPrimary : Colors.textTertiary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Soon</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={3}>
                    {nearTermDisplay || 'What you’re working on next'}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rowCard, styles.rowCardLast]}
                onPress={() => router.push('/profile/edit-lifejourney' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.rowIcon}>
                  <Flag size={20} color={horizonDisplay ? Colors.textPrimary : Colors.textTertiary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Big picture</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={3}>
                    {horizonDisplay || 'Where you want life to go'}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.editorialBlockTight, { marginTop: 20 }]}>
              <Text style={styles.editorialKicker}>Body</Text>
              <Text style={styles.editorialHeadline}>Health & energy</Text>
              <Text style={styles.editorialLead}>Sleep, food, movement, mood.</Text>
            </View>
            <View style={styles.mindsetVertical}>
              <TouchableOpacity
                style={styles.mindsetChapterCard}
                onPress={() => router.push('/profile/edit-health-wellbeing' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.mindsetChapterTop}>
                  <View style={styles.gridIcon}>
                    <Activity size={24} color={healthWellness.completed ? '#4ADE80' : Colors.textTertiary} />
                  </View>
                  <View style={styles.gridStatus}>
                    {healthWellness.completed ? (
                      <CheckCircle2 size={16} color="#4ADE80" />
                    ) : (
                      <CircleIcon size={16} color={Colors.textTertiary} />
                    )}
                  </View>
                </View>
                <Text style={styles.gridTitle}>Day-to-day</Text>
                <Text style={styles.gridSubtitle} numberOfLines={3}>
                  {healthWellness.text ? truncateText(healthWellness.text, 72) : 'Tap to add how you feel'}
                </Text>
              </TouchableOpacity>
            </View>

            {resolvedThreads.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setResolvedThreadsExpanded(!resolvedThreadsExpanded);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.editorialBlockTight}>
                    <Text style={styles.editorialKicker}>Past</Text>
                    <Text style={styles.editorialHeadline}>Old topics</Text>
                    <Text style={styles.editorialLead}>Stuff you’re not focused on now.</Text>
                  </View>
                  <ChevronDown
                    size={22}
                    color={Colors.textTertiary}
                    style={{ transform: [{ rotate: resolvedThreadsExpanded ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
                {resolvedThreadsExpanded && (
                  <View style={styles.insightsList}>
                    {resolvedThreads.map((t) => (
                      <View key={t.id} style={styles.insightCard}>
                        <Text style={styles.insightMeta}>{friendlyThreadDomain(t.domain)}</Text>
                        <Text style={styles.insightText} numberOfLines={4}>
                          {t.summary}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.editorialBlockTight}>
              <Text style={styles.editorialKicker}>Chats</Text>
              <Text style={styles.editorialHeadline}>Saved lines</Text>
              <Text style={styles.editorialLead}>Short notes from when you talked in the app.</Text>
            </View>
            {architectInsightEntries.length === 0 ? (
              <View style={styles.insightsEmpty}>
                <MessageCircle size={22} color={Colors.textTertiary} />
                <Text style={styles.insightsEmptyText}>
                  Chat in Decide. Good lines from those talks can show up here.
                </Text>
              </View>
            ) : (
              <View style={styles.insightsList}>
                {architectInsightEntries.slice(0, 6).map((entry, idx) => (
                  <View key={`${entry.at}-${idx}`} style={styles.insightCard}>
                    <Text style={styles.insightMeta}>
                      {entry.source === 'decision' ? 'Decide' : 'Life'}
                      {entry.at ? ` · ${new Date(entry.at).toLocaleDateString()}` : ''}
                    </Text>
                    <Text style={styles.insightText} numberOfLines={5}>
                      {truncateText(entry.text, 220)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

        </Animated.ScrollView>
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

export default function ProfileTabScreen() {
  return <ProfileShell mode="twin_insights" isTab />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.primary.regular, fontWeight: '700', color: Colors.textPrimary },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  twinRevealTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
  },
  twinRevealTagText: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 15,
    color: '#696969',
  },
  twinRevealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
    marginBottom: 20,
    minHeight: 168,
    position: 'relative',
  },
  twinRevealHeaderLeft: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 12,
    zIndex: 2,
    maxWidth: '62%',
  },
  twinRevealNameRow: { marginBottom: 8 },
  twinRevealHeaderName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: -0.5,
  },
  twinRevealLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  twinRevealHeaderLocation: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
  },
  twinRevealTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  twinRevealHeaderRight: {
    width: 200,
    position: 'absolute',
    right: -28,
    bottom: -48,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 0,
  },
  twinRevealCodeRow: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  twinRevealCodeText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.15)',
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
  },
  twinRevealManImage: { width: '100%', height: '100%' },
  twinSnapshotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  twinArchetypeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  twinArchetypeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  twinArchetypeIconImg: { width: 20, height: 20 },
  twinArchetypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  twinArchetypeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
    lineHeight: 34,
  },
  twinArchetypeDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
    lineHeight: 24,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  twinDnaBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  twinDnaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  twinDnaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  twinDnaRowLabel: {
    width: 72,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  twinDnaBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  twinDnaBarFill: { height: '100%', borderRadius: 4 },
  twinDnaValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  twinRefineCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  twinRefineCtaText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: '#25729f',
  },
  twinThreadsSection: { marginBottom: 28 },
  twinThreadsSectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  twinThreadsSectionSub: {
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  twinThreadsList: { gap: 12 },
  twinThreadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  twinThreadCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  twinThreadDomain: {
    fontSize: 11,
    fontFamily: Fonts.secondary.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  twinThreadStatus: {
    fontSize: 11,
    fontFamily: Fonts.secondary.bold,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  twinThreadSummary: {
    fontSize: 16,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  twinThreadStakes: {
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  twinCompletenessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  twinCompletenessTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  twinCompletenessCopy: { flex: 1 },
  twinCompletenessTitle: {
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  twinCompletenessSub: {
    fontSize: 13,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textTertiary,
    marginTop: 2,
    lineHeight: 18,
  },
  twinCompletenessPctWrap: { paddingRight: 4 },
  twinCompletenessPct: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
  },
  twinCompletenessTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  twinCompletenessFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#25729f',
  },
  fullProfileEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  fullProfileEntryTextCol: { flex: 1 },
  fullProfileEntryTitle: {
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fullProfileEntrySub: {
    fontSize: 13,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  twinCodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  twinCode: { fontSize: 14, fontFamily: Fonts.secondary.bold, color: Colors.textTertiary },
  section: { marginBottom: 28 },
  editorialBlock: { marginBottom: 28, paddingHorizontal: 4 },
  editorialBlockTight: { marginBottom: 14, paddingHorizontal: 4 },
  editorialKicker: {
    fontSize: 11,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1.2,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  editorialHeadline: {
    fontSize: 26,
    fontFamily: Fonts.primary.regular,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 32,
    marginBottom: 10,
  },
  editorialLead: {
    fontSize: 15,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
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
  mindsetVertical: { gap: 14 },
  mindsetChapterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mindsetChapterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gridCard: { width: (width - 40 - 12) / 2, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'space-between', minHeight: 100 },
  gridIcon: { marginBottom: 12 },
  gridTitle: { fontSize: 15, fontFamily: Fonts.secondary.bold, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  gridSubtitle: { fontSize: 12, fontFamily: Fonts.secondary.regular, fontWeight: '300', color: Colors.textTertiary, lineHeight: 16, marginBottom: 8, flex: 1 },
  gridStatus: { alignSelf: 'flex-end' },
  insightsEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    gap: 10,
  },
  insightsEmptyText: {
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  insightsList: { gap: 12 },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  insightMeta: {
    fontSize: 11,
    fontFamily: Fonts.secondary.bold,
    color: Colors.textTertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    lineHeight: 20,
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

