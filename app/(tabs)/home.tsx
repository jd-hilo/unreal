import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, Animated, Platform, Modal, Easing, Dimensions, Linking, KeyboardAvoidingView, Switch, ActivityIndicator } from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, calculateOverallProgress, getTodayJournal, getAllYearPredictions, updateProfileFields, getDailyTasks, updateDailyTask, saveArchitectFeedback, getLatestArchitectFeedback, saveDailyTasks, deleteDailyTasks, getLocalDateString, getOnboardingTasks, initializeOnboardingTasks, checkAndCompleteOnboardingTasks, ensureTwinBriefingSeeded, createLifeChat } from '@/lib/storage';
import { getTwinBriefingFromCoreJson } from '@/lib/twinInsights';
import type { LifeThread } from '@/types/database';

import { Sparkles, X, Trash2, ChevronRight, Book, Settings, Info, Layers, ArrowUpRight, CheckCircle, Zap, Clipboard, Check, Lock, Trophy, Bell, TrendingUp, Phone, PenLine } from 'lucide-react-native';
import { generateArchitectPlan, calculateArchitectProgress, recalculateDreamProgress, generateDreamSelfLetter } from '@/lib/ai';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { ProductGuide } from '@/components/ProductGuide';
import { ProgressBar } from '@/components/ProgressBar';
import { CircularProgress } from '@/components/CircularProgress';
import { setHasSeenDecisionGuide } from '@/lib/guideStorage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { isHomeDecisionFirst } from '@/lib/featureFlags';
import { Colors, Fonts } from '@/constants/Theme';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/lib/notifications';
import { useTypewriter } from '@/hooks/useTypewriter';

const { width } = Dimensions.get('window');
/** Scroll 20+20 + hubSection 4+4; matches width of one Update Twin button (row gap 12). */
const HUB_CONTENT_INNER_W = width - 48;
const HUB_UPDATE_TWIN_CELL_W = (HUB_CONTENT_INNER_W - 12) / 2;

function hubThreadDomainLabel(domain: LifeThread['domain']): string {
  const m: Record<string, string> = {
    career: 'Career',
    relationships: 'Relationships',
    health: 'Health',
    money: 'Money',
    personal: 'Personal',
  };
  return m[domain] || String(domain).charAt(0).toUpperCase() + String(domain).slice(1);
}

const HUB_CARD_GRADIENT = {
  decide: ['#FFF8F0', '#FFD4A3'] as const,
  simulate: ['#F0FDFC', '#9EE6D8'] as const,
  chat: ['#F3FDF6', '#A7E9B8'] as const,
  insights: ['#FAFAFA', '#E4E5E7'] as const,
} as const;

/** Hero mini-cards + accents (overlapping UI on hub tiles) */
const HUB_UI = {
  decide: {
    back: ['#FFB86C', '#FF6B2C'] as const,
    front: ['#FFFFFF', '#FFEAD5'] as const,
    accent: '#E8590C',
    letterB: '#C2410C',
  },
  simulate: {
    back: ['#5EEAD4', '#0D9488'] as const,
    front: ['#FFFFFF', '#E6FFFA'] as const,
    accent: '#0F7668',
    bar: ['#FFFFFF', '#CCFBF1'] as const,
  },
  chat: {
    back: ['#86EFAC', '#16A34A'] as const,
    front: ['#FFFFFF', '#DCFCE7'] as const,
    accent: '#15803D',
    dot: '#22C55E',
  },
  insights: {
    back: ['#D1D5DB', '#6B7280'] as const,
    front: ['#FFFFFF', '#F3F4F6'] as const,
    accent: '#4B5563',
    spark: ['#F9FAFB', '#E5E7EB'] as const,
    cell: ['#CBD5E1', '#64748B'] as const,
  },
} as const;

type HubBlurTone = 'decide' | 'simulate' | 'chat' | 'insights';

const HUB_BLUR_FADE: Record<
  HubBlurTone,
  { colors: readonly string[]; locations: readonly number[] }
> = {
  decide: {
    colors: [
      'rgba(255, 248, 240, 0.88)',
      'rgba(255, 230, 200, 0.42)',
      'rgba(255, 212, 163, 0.1)',
      'rgba(255, 212, 163, 0.06)',
      'rgba(255, 228, 195, 0.28)',
      'rgba(255, 245, 230, 0.55)',
    ],
    locations: [0, 0.2, 0.42, 0.58, 0.8, 1],
  },
  simulate: {
    colors: [
      'rgba(240, 253, 252, 0.88)',
      'rgba(190, 235, 225, 0.4)',
      'rgba(158, 230, 216, 0.1)',
      'rgba(158, 230, 216, 0.06)',
      'rgba(180, 236, 224, 0.26)',
      'rgba(236, 252, 249, 0.52)',
    ],
    locations: [0, 0.2, 0.42, 0.58, 0.8, 1],
  },
  chat: {
    colors: [
      'rgba(243, 253, 246, 0.88)',
      'rgba(200, 241, 216, 0.38)',
      'rgba(167, 233, 184, 0.1)',
      'rgba(167, 233, 184, 0.06)',
      'rgba(195, 240, 210, 0.26)',
      'rgba(238, 252, 242, 0.52)',
    ],
    locations: [0, 0.2, 0.42, 0.58, 0.8, 1],
  },
  insights: {
    colors: [
      'rgba(250, 250, 250, 0.9)',
      'rgba(236, 236, 238, 0.4)',
      'rgba(228, 229, 231, 0.12)',
      'rgba(228, 229, 231, 0.06)',
      'rgba(235, 235, 237, 0.28)',
      'rgba(248, 248, 249, 0.52)',
    ],
    locations: [0, 0.2, 0.42, 0.58, 0.8, 1],
  },
};

// Helper function to get emoji for task category
const getCategoryEmoji = (category: string | null | undefined): string => {
  const cat = (category || 'Growth').toLowerCase();
  if (cat.includes('financial') || cat.includes('career')) return '💰';
  if (cat.includes('personal')) return '👤';
  if (cat.includes('lifestyle')) return '🏠';
  if (cat.includes('health')) return '💪';
  if (cat.includes('growth')) return '✨';
  return '✨'; // default
};

// Floating Point Component for Gamification
function FloatingPoint({ x, y, value }: { x: number; y: number; value: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.floatingPoint,
        {
          left: x - 20,
          top: y - 20,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <LinearGradient
        colors={['#25729f', '#62edb9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.floatingPointGradient}
      >
        <Text style={styles.floatingPointText}>{value}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function HubSquareBottomBlur({ tone }: { tone: HubBlurTone }) {
  const fade = HUB_BLUR_FADE[tone];
  return (
    <View style={styles.hubCardBottomBlurWrap} pointerEvents="none">
      <BlurView intensity={9} tint="light" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={fade.colors as readonly [string, string, string, string, string, string]}
        locations={fade.locations as readonly [number, number, number, number, number, number]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
    </View>
  );
}

function HubTypewriterCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.12,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.Text style={[styles.hubTypewriterCursor, { opacity }]} accessibilityLabel="Typing cursor">
      I
    </Animated.Text>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuth((state) => state.user);
  const { checkOnboardingStatus, isPremium } = useTwin();
  const [userName, setUserName] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hubButtonsReady, setHubButtonsReady] = useState(false);
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
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [onboardingTasks, setOnboardingTasks] = useState<any[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<{ id: string; x: number; y: number; value: string }[]>([]);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);
  const [showDreamSelfLetterModal, setShowDreamSelfLetterModal] = useState(false);
  const [dreamSelfLetterText, setDreamSelfLetterText] = useState('');
  const initialProfileRef = useRef<any>(null);
  const taskScrollViewRef = useRef<ScrollView>(null);
  const hubIntroTextOpacity = useRef(new Animated.Value(1)).current;
  const hubButtonsOpacity = useRef(new Animated.Value(0)).current;

  const homeDecisionFirst = isHomeDecisionFirst();
  const hubFirstName = (userName?.trim() || profileData?.first_name || 'Friend').trim();
  const hubIntroPrefix = `Hi ${hubFirstName}, `;
  const hubIntroLines =
    homeDecisionFirst && !isInitialLoad ? [`${hubIntroPrefix}let's navigate`] : [];

  const onHubIntroComplete = useCallback(() => {
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(hubIntroTextOpacity, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(hubButtonsOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start((finished) => {
        if (finished) setHubButtonsReady(true);
      });
    }, 420);
  }, [hubIntroTextOpacity, hubButtonsOpacity]);

  const { displayedLines: hubIntroDisplayedLines, isComplete: hubIntroTypewriterComplete } =
    useTypewriter(hubIntroLines, {
      speed: 34,
      pauseBetweenLines: 0,
      onAllComplete: onHubIntroComplete,
    });

  const rawHubIntro = hubIntroDisplayedLines[0] || '';
  const hubIntroPrefixLen = hubIntroPrefix.length;
  const hubIntroNamePart = rawHubIntro.slice(0, Math.min(rawHubIntro.length, hubIntroPrefixLen));
  const hubIntroNavigatePart =
    rawHubIntro.length > hubIntroPrefixLen ? rawHubIntro.slice(hubIntroPrefixLen) : '';

  useEffect(() => {
    if (!homeDecisionFirst || isInitialLoad) return;
    hubIntroTextOpacity.setValue(1);
    hubButtonsOpacity.setValue(0);
    setHubButtonsReady(false);
  }, [homeDecisionFirst, isInitialLoad, hubIntroTextOpacity, hubButtonsOpacity]);
  
  // Animation refs for fade transitions (Twin Society modal)
  const invitationOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Animation refs for Dream Self letter modal
  const letterInvitationOpacity = useRef(new Animated.Value(1)).current;
  const letterContentOpacity = useRef(new Animated.Value(0)).current;
  const [showLetterContent, setShowLetterContent] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setNotificationsEnabled(status === 'granted');
      });
    }, [])
  );

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

  // Typewriter for Dream Self letter intro
  const { displayedLines: letterInvitationLines } = useTypewriter(
    showDreamSelfLetterModal ? ['A letter from', 'your dream self.'] : [],
    {
      speed: 60,
      onAllComplete: () => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(letterInvitationOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(letterContentOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
          setShowLetterContent(true);
        }, 1500);
      },
    }
  );

  // Reset letter modal state when it opens/closes
  useEffect(() => {
    if (showDreamSelfLetterModal) {
      setShowLetterContent(false);
      letterInvitationOpacity.setValue(1);
      letterContentOpacity.setValue(0);
    } else {
      setShowLetterContent(false);
    }
  }, [showDreamSelfLetterModal]);
  
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
  
  // Animation values - start with visible opacity
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [profile, decisions, whatifs, progress, journalToday, tasks, allTasks, onboardingTasksData] = await Promise.all([
        getProfile(user.id),
        getDecisions(user.id),
        getWhatIfs(user.id),
        calculateOverallProgress(user.id),
        getTodayJournal(user.id),
        getDailyTasks(user.id),
        getDailyTasks(user.id, null), // Get all tasks for streak calculation
        getOnboardingTasks(user.id)
      ]);

      // Check if we need to recalculate dream progress
      if (initialProfileRef.current && profile) {
        const hasChanged = 
          initialProfileRef.current.current_location !== profile.current_location ||
          initialProfileRef.current.net_worth !== profile.net_worth ||
          (initialProfileRef.current.core_json as any)?.primary_role !== (profile.core_json as any)?.primary_role ||
          JSON.stringify(initialProfileRef.current.dream_vision) !== JSON.stringify(profile.dream_vision);

        if (hasChanged) {
          setIsRecalculating(true);
          try {
            const { dream_self_progress, est_days_remaining } = await recalculateDreamProgress(
              initialProfileRef.current,
              profile,
              initialProfileRef.current.dream_self_progress || {},
              initialProfileRef.current.est_days_remaining || 365
            );

            await updateProfileFields(user.id, {
              dream_self_progress,
              est_days_remaining
            });
            
            // Update local profile data with new progress
            profile.dream_self_progress = dream_self_progress;
            profile.est_days_remaining = est_days_remaining;
          } catch (error) {
            console.error('Recalculation failed on home screen:', error);
          } finally {
            setIsRecalculating(false);
          }
        }
      }

      if (profile?.first_name) {
        setUserName(profile.first_name);
      }

      setProfileData(profile);
      initialProfileRef.current = profile;

      try {
        await ensureTwinBriefingSeeded(user.id);
        const refreshed = await getProfile(user.id);
        if (refreshed) {
          setProfileData(refreshed);
          initialProfileRef.current = refreshed;
          if (refreshed.first_name) {
            setUserName(refreshed.first_name);
          }
        }
      } catch (e) {
        console.warn('ensureTwinBriefingSeeded', e);
      }
      setRecentDecisions(decisions || []);
      setRecentWhatIfs(whatifs || []);
      setProfileProgress(progress || 0);
      setHasTodayJournal(!!journalToday);
      
      // Initialize onboarding tasks if they don't exist
      try {
        if (!onboardingTasksData || onboardingTasksData.length === 0) {
          await initializeOnboardingTasks(user.id);
          const newOnboardingTasks = await getOnboardingTasks(user.id);
          setOnboardingTasks(newOnboardingTasks || []);
        } else {
          setOnboardingTasks(onboardingTasksData);
        }
        
        // Check and auto-complete onboarding tasks based on existing data
        await checkAndCompleteOnboardingTasks(user.id);
        
        // Refresh onboarding tasks after auto-completion check
        const updatedOnboardingTasks = await getOnboardingTasks(user.id);
        
        // Track newly completed tasks
        if (onboardingTasksData && onboardingTasksData.length > 0) {
          const taskMap = new Map(onboardingTasksData.map((t: any) => [t.task_type, t.is_completed]));
          updatedOnboardingTasks?.forEach((task: any) => {
            const wasCompleted = taskMap.get(task.task_type) || false;
            if (!wasCompleted && task.is_completed) {
              // Task was just completed
              const eventName = task.task_type === 'ask_decision' ? 'OB - ask-decision-complete' :
                               task.task_type === 'simulate_career' ? 'OB - simulate-career-complete' :
                               task.task_type === 'invite_friend' ? 'OB - invite-friend-complete' :
                               null;
              if (eventName) {
                trackEvent(eventName);
              }
            }
          });
        }
        
        setOnboardingTasks(updatedOnboardingTasks || []);
        
        // Check if all visible onboarding tasks are complete (excluding invite_friend)
        const visibleTasks = (updatedOnboardingTasks || []).filter((task: any) => task.task_type !== 'invite_friend');
        const allComplete = visibleTasks.length > 0 && visibleTasks.every((task: any) => task.is_completed);
        setOnboardingComplete(allComplete);
      } catch (error) {
        // Silently handle if onboarding_tasks table doesn't exist yet (migration not run)
        console.warn('Onboarding tasks not available (migration may not be run):', error);
        setOnboardingTasks([]);
        setOnboardingComplete(true); // Show daily path if table doesn't exist
      }
      
      // Ensure we only show today's tasks - filter and limit to max 3
      const today = getLocalDateString();
      const todayTasks = (tasks || [])
        .filter(task => task.scheduled_date === today)
        .slice(0, 3); // Limit to max 3 tasks
      setDailyTasks(todayTasks);
      
      // Check and track if today's tasks are all completed (on initial load)
      if (user?.id && todayTasks.length > 0) {
        await checkAndTrackCompletedDay(todayTasks);
      }

      // Calculate streak (Duolingo-style) - same logic as streak screen
      // Group tasks by date and check if all tasks for each date are completed
      // Only count the first 3 tasks per day (to handle duplicates)
      const grouped: Record<string, { total: number; completed: number }> = {};
      const tasksByDate: Record<string, typeof allTasks> = {};
      
      // First, group all tasks by date
      (allTasks || []).forEach(t => {
        // Normalize date from database (ensure it's YYYY-MM-DD format)
        let date = t.scheduled_date;
        if (date && date.includes('T')) {
          date = date.split('T')[0];
        }
        if (!tasksByDate[date]) {
          tasksByDate[date] = [];
        }
        tasksByDate[date].push(t);
      });
      
      // Then, for each date, only count the first 3 tasks (sorted by created_at)
      Object.keys(tasksByDate).forEach(date => {
        const dateTasks = tasksByDate[date]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(0, 3); // Only count first 3 tasks per day
        
        grouped[date] = { total: dateTasks.length, completed: 0 };
        dateTasks.forEach(t => {
          if (t.is_completed) {
            grouped[date].completed++;
          }
        });
      });

      // A day counts for streak only if ALL tasks are completed
      const completedDays: Record<string, boolean> = {};
      Object.keys(grouped).forEach(date => {
        completedDays[date] = grouped[date].completed === grouped[date].total && grouped[date].total > 0;
      });

      // Debug logging
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      let curr = new Date(todayDate);
      const todayStr = getLocalDateString(curr);
      
      console.log('Streak Debug:', {
        todayStr,
        completedDaysKeys: Object.keys(completedDays),
        todayCompleted: completedDays[todayStr],
        groupedToday: grouped[todayStr],
        allTasksToday: (allTasks || []).filter(t => {
          let date = t.scheduled_date;
          if (date && date.includes('T')) date = date.split('T')[0];
          return date === todayStr;
        })
      });
      
      // Initialize streak variable
      let streak = 0;
      
      // Check if today has all tasks completed
      // Also check if the date exists in completedDays (case-insensitive check)
      const todayCompleted = completedDays[todayStr] || completedDays[todayStr.toLowerCase()] || completedDays[todayStr.toUpperCase()];
      if (todayCompleted) {
        // Today is completed, start streak at 1
        streak = 1;
        curr.setDate(curr.getDate() - 1);
        
        // Continue counting backwards for consecutive completed days
        while (true) {
          const d = getLocalDateString(curr);
          const dayCompleted = completedDays[d] || completedDays[d.toLowerCase()] || completedDays[d.toUpperCase()];
          if (dayCompleted) {
            streak++;
            curr.setDate(curr.getDate() - 1);
          } else {
            // Hit a missed day or no tasks for this day, stop counting
            break;
          }
        }
      } else {
        // Today not completed yet, check if yesterday was completed
        curr.setDate(curr.getDate() - 1);
        const yesterdayStr = getLocalDateString(curr);
        
        const yesterdayCompleted = completedDays[yesterdayStr] || completedDays[yesterdayStr.toLowerCase()] || completedDays[yesterdayStr.toUpperCase()];
        if (yesterdayCompleted) {
          // Yesterday was completed, start streak at 1
          streak = 1;
          curr.setDate(curr.getDate() - 1);
          
          // Continue counting backwards for consecutive completed days
          while (true) {
            const d = getLocalDateString(curr);
            const dayCompleted = completedDays[d] || completedDays[d.toLowerCase()] || completedDays[d.toUpperCase()];
          if (dayCompleted) {
              streak++;
              curr.setDate(curr.getDate() - 1);
            } else {
              // Hit a missed day or no tasks for this day, stop counting
              break;
            }
          }
        } else {
          // Neither today nor yesterday completed, streak is 0
          streak = 0;
        }
      }
      
      // Save streak to database
      if (user && streak !== (profile?.current_streak || 0)) {
        try {
          await updateProfileFields(user.id, { current_streak: streak });
          // Update local profile data
          if (profileData) {
            setProfileData({ ...profileData, current_streak: streak });
          }
        } catch (error) {
          console.error('Error updating streak:', error);
        }
      }

      // Generate daily tasks if none exist for today (skip when decision-first hides Daily Path on Home)
      const hasJourneyOrDreamVision = profile?.dream_vision || (profile?.core_json as any)?.onboarding_responses?.['journey'];
      if ((!todayTasks || todayTasks.length === 0) && hasJourneyOrDreamVision && !isHomeDecisionFirst()) {
        try {
          const today = getLocalDateString();

          let completedTasks: string[] = [];
          try {
            const allTasks = await getDailyTasks(user.id, null);
            completedTasks = allTasks
              .filter(t => t.is_completed && t.scheduled_date !== today)
              .map(t => t.task_content);
          } catch (error) {
            console.warn('Could not fetch previous tasks:', error);
          }

          let latestFeedback = null;
          try {
            latestFeedback = await getLatestArchitectFeedback(user.id);
          } catch (error) {
            console.warn('Could not fetch architect feedback:', error);
          }

          const newTasks = await generateArchitectPlan(
            profile,
            profile.dream_vision || {},
            completedTasks,
            latestFeedback?.feedback
          );

          const tasksWithDate = newTasks.map(task => ({
            ...task,
            scheduled_date: today
          }));

          const savedTasks = await saveDailyTasks(user.id, tasksWithDate);
          const savedTodayTasks = (savedTasks || [])
            .filter(task => task.scheduled_date === today)
            .slice(0, 3);
          setDailyTasks(savedTodayTasks);
        } catch (error) {
          console.error('Error generating daily tasks:', error);
        }
      }

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


      // Ensure content is visible
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      setIsInitialLoad(false);

      // Check for store review - after 3 days of completing all daily tasks
      const lastReview = await AsyncStorage.getItem('last_review_request');
      const now = Date.now();
      if (!lastReview || now - parseInt(lastReview) > 1000 * 60 * 60 * 24 * 30) {
        const completedDaysKey = user?.id ? `completed_days_${user.id}` : 'completed_days';
        const completedDaysStr = await AsyncStorage.getItem(completedDaysKey);
        const completedDays = completedDaysStr ? JSON.parse(completedDaysStr) : [];
        
        if (completedDays.length >= 3) {
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            await StoreReview.requestReview();
            await AsyncStorage.setItem('last_review_request', now.toString());
          }
        }
      }

      // Show Dream Self letter on first visit to home screen (not when decision-first Home omits dream-self hero)
      if (!isHomeDecisionFirst()) {
        const letterKey = user?.id ? `dream_self_letter_shown_${user.id}` : 'dream_self_letter_shown';
        const hasSeenLetter = await AsyncStorage.getItem(letterKey);
        if (!hasSeenLetter && profile?.dream_vision) {
          AsyncStorage.setItem(letterKey, 'true');
          generateDreamSelfLetter(profile, profile.dream_vision)
            .then((letter) => {
              if (letter) {
                setDreamSelfLetterText(letter);
                setTimeout(() => setShowDreamSelfLetterModal(true), 500);
              }
            })
            .catch(() => {});
        }
      }

      // Check for Discord modal (Twin Society) - Show only on 6th visit
      const hasSeenDiscordModal = await AsyncStorage.getItem('has_seen_discord_modal');
      if (!hasSeenDiscordModal) {
        // Get current visit count
        const visitCountStr = await AsyncStorage.getItem('app_visit_count');
        const visitCount = visitCountStr ? parseInt(visitCountStr, 10) : 0;
        const newVisitCount = visitCount + 1;
        await AsyncStorage.setItem('app_visit_count', newVisitCount.toString());
        
        // Only show modal on 6th visit
        if (newVisitCount === 6) {
          // Delay slightly to let animations finish or feel more natural
          setTimeout(() => {
            setShowDiscordModal(true);
            trackEvent(MixpanelEvents.TWIN_SOCIETY_MODAL_VIEWED, { source: 'auto' });
            AsyncStorage.setItem('has_seen_discord_modal', 'true');
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Ensure content is visible even on error
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      setIsInitialLoad(false);
    }
  }, [user, fadeAnim, slideAnim]);

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
          router.replace('/onboarding/architect-chat');
          return;
        }
        // Load data immediately
        loadData();
      })
      .catch((error) => {
        console.warn('Failed to confirm onboarding status:', error);
        // Still try to load data even if onboarding check fails
        loadData();
      });
  }, [user, router, checkOnboardingStatus, loadData]);

  useFocusEffect(
    useCallback(() => {
      // Ensure content is visible when screen comes into focus
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      
      // Reset initialProfileRef to trigger recalculation if needed
      initialProfileRef.current = null;
      
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

  async function handleNotificationsToggle(value: boolean) {
    if (!value) {
      // User turned off — route to settings to disable
      await Linking.openURL('app-settings:');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      setNotificationsEnabled(true);
      return;
    }
    if (status === 'denied') {
      await Linking.openURL('app-settings:');
      return;
    }
    if (user) {
      await registerForPushNotifications(user.id);
      const { status: newStatus } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(newStatus === 'granted');
    }
  }

  // Track completed days for review request
  async function checkAndTrackCompletedDay(tasks: any[]) {
    if (!user?.id) return;
    
    const todayStr = getLocalDateString(new Date());
    const todayTasks = tasks.filter(t => {
      let date = t.scheduled_date;
      if (date && date.includes('T')) {
        date = date.split('T')[0];
      }
      return date === todayStr;
    });
    
    // Check if all tasks for today are completed
    const allCompleted = todayTasks.length > 0 && todayTasks.every(t => t.is_completed);
    
    if (allCompleted) {
      const key = `completed_days_${user.id}`;
      const completedDaysStr = await AsyncStorage.getItem(key);
      const completedDays = completedDaysStr ? JSON.parse(completedDaysStr) : [];
      
      // Only add today if it's not already tracked
      if (!completedDays.includes(todayStr)) {
        completedDays.push(todayStr);
        await AsyncStorage.setItem(key, JSON.stringify(completedDays));
      }
    }
  }

  const handleToggleTask = async (task: any, event: any) => {
    try {
      if (task.is_completed) return; // Only animate on completion

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Get task position
      const { pageX, pageY } = event.nativeEvent;
      
      // Animate floating points text
      const pointsValue = task.points || 10;
      const id = Math.random().toString(36).substr(2, 9);
      setFloatingPoints(prev => [...prev, { id, x: pageX, y: pageY, value: `+${pointsValue}` }]);
      
      // Remove point text after animation
      setTimeout(() => {
        setFloatingPoints(prev => prev.filter(p => p.id !== id));
      }, 1000);

      const updatedTask = await updateDailyTask(task.id, { is_completed: true });
      const newTasks = dailyTasks.map(t => t.id === task.id ? updatedTask : t);
      setDailyTasks(newTasks);
      
      // Check if all tasks for today are completed and track it
      await checkAndTrackCompletedDay(newTasks);
      
      // Track task completion
      trackEvent('Daily Task - completed', {
        task_id: task.id,
        task_content: task.task_content,
        category: task.category || 'uncategorized',
        points: pointsValue,
        completed_count: newTasks.filter(t => t.is_completed).length,
        total_tasks: dailyTasks.length,
      });
      
      // Award points to user profile
      if (user && profileData) {
        const currentPoints = profileData.total_points || 0;
        const newPoints = currentPoints + pointsValue;
        await updateProfileFields(user.id, { total_points: newPoints });
        
        // Update local profile data
        setProfileData({ ...profileData, total_points: newPoints });
      }
      
      // Haptic feedback for task completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Scroll to next uncompleted task
      const nextTaskIndex = dailyTasks.findIndex((t, idx) => t.id === task.id) + 1;
      if (nextTaskIndex < dailyTasks.length) {
        setTimeout(() => {
          taskScrollViewRef.current?.scrollTo({
            x: nextTaskIndex * (width * 0.65 + 12),
            animated: true
          });
        }, 500);
      }

      // Check if all 3 tasks are completed
      const completedCount = newTasks.filter(t => t.is_completed).length;
      if (completedCount === 3) {
        // Track all tasks completed
        trackEvent('Daily Task - all-completed', {
          total_tasks: dailyTasks.length,
          total_points: newTasks.reduce((sum, t) => sum + (t.points || 10), 0),
        });
        
        // Reload data to recalculate streak (which will also save it to DB)
        await loadData();
        
        // Navigate to streak screen sequence
        setTimeout(() => {
          router.push('/onboarding/dream-self/streak');
        }, 1000);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleRefreshTasks = async () => {
    if (!user || !profileData || isRefreshingTasks) return;
    
    try {
      setIsRefreshingTasks(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Delete current tasks for today
      const todayStr = getLocalDateString();
      await deleteDailyTasks(user.id, todayStr);
      
      // Get completed tasks for context
      const allTasks = await getDailyTasks(user.id, null);
      const completedTasks = allTasks
        .filter(t => t.is_completed)
        .map(t => t.task_content)
        .slice(-10); // Last 10 completed tasks
      
      // Generate new tasks (uses journey context if no dream_vision)
      const newTasks = await generateArchitectPlan(
        profileData,
        profileData.dream_vision || {},
        completedTasks
      );
      
      // Save new tasks
      const tasksWithDate = newTasks.map(task => ({
        ...task,
        scheduled_date: todayStr,
      }));
      await saveDailyTasks(user.id, tasksWithDate);
      
      // Fetch and update UI
      const refreshedTasks = await getDailyTasks(user.id, todayStr);
      setDailyTasks(refreshedTasks);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRefreshingTasks(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || !profileData || isGeneratingNext) return;
    setIsGeneratingNext(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 1. Save feedback (gracefully handle if table doesn't exist yet)
      try {
        await saveArchitectFeedback(user.id, feedbackText, 3);
      } catch (error) {
        // Table might not exist yet, that's okay - continue without saving feedback
        console.warn('Could not save architect feedback (table may not exist):', error);
      }

      // 2. Calculate realistic progress points
      const completedTaskDetails = dailyTasks.map(t => ({
        task_content: t.task_content,
        category: t.category
      }));
      const { increments, rationale } = await calculateArchitectProgress(
        profileData,
        completedTaskDetails,
        feedbackText
      );

      // 3. Update profile progress
      const currentProgress = profileData.dream_self_progress || {
        "Financial": 0,
        "Personal": 0,
        "Lifestyle": 0,
        "Health": 0,
        "Growth": 0
      };
      
      const newProgress = { ...currentProgress };
      Object.entries(increments).forEach(([category, increment]) => {
        const cat = category === "Career" ? "Financial" : category;
        if (newProgress[cat] !== undefined) {
          newProgress[cat] = Math.min(100, (newProgress[cat] || 0) + (increment as number));
        }
      });

      await updateProfileFields(user.id, { dream_self_progress: newProgress });

      // 4. Generate next day's tasks
      const nextTasks = await generateArchitectPlan(
        profileData,
        profileData.dream_vision,
        completedTaskDetails.map(t => t.task_content),
        feedbackText
      );

      // 5. Save next tasks (for tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrow);
      
      const tasksWithDate = nextTasks.map(t => ({
        ...t,
        scheduled_date: tomorrowStr
      }));

      const { saveDailyTasks } = require('@/lib/storage');
      await saveDailyTasks(user.id, tasksWithDate);

      setShowFeedbackModal(false);
      setFeedbackText('');
      
      // Navigate to streak screen instead of alert
      router.push({
        pathname: '/onboarding/dream-self/streak',
        params: {
          increments: JSON.stringify(increments),
          rationale: rationale
        }
      });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert("Failed to generate next tasks. Please try again.");
    } finally {
      setIsGeneratingNext(false);
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

  const activeThreadsHome = useMemo(() => {
    if (!profileData?.core_json) return [];
    const b = getTwinBriefingFromCoreJson(profileData.core_json);
    if (!b?.threads?.length) return [];
    return b.threads
      .filter((t) => t.status !== 'resolved')
      .sort(
        (a, b) =>
          new Date(b.mentioned_at || 0).getTime() - new Date(a.mentioned_at || 0).getTime()
      );
  }, [profileData]);

  const openThreadInArchitectChat = useCallback(
    async (thread: LifeThread) => {
      if (!user?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const title = thread.summary.slice(0, 48) || 'Thread';
        const initialMessage = `I want to talk through this: ${thread.summary}${
          thread.stakes ? `. What's at stake: ${thread.stakes}` : ''
        }`;
        const chat = await createLifeChat(user.id, title);
        await AsyncStorage.setItem('decide_initial_tab', 'architect');
        router.push({
          pathname: '/chat/life/[id]',
          params: { id: chat.id, initialMessage, chatTitle: title },
        } as any);
      } catch (e) {
        console.error('openThreadInArchitectChat', e);
      }
    },
    [user?.id, router]
  );

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
                    <Text style={styles.moraTagTextPremium}>mora+</Text>
                  ) : (
                    <Text style={styles.moraTagText}>unlock mora+</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/account-settings');
                }}
              >
                <Settings size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
          </View>
        </View>

        {isRecalculating && (
          <View style={styles.recalculatingOverlay}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(248,247,255,0.9)']}
              style={StyleSheet.absoluteFill}
            />
            <Sparkles size={48} color="#A78BFA" />
            <Text style={styles.recalculatingText}>Recalculating your path...</Text>
          </View>
        )}

        <Animated.ScrollView 
          style={[styles.content, { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }]} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
            {/* Decision-first hub */}
            {homeDecisionFirst && (
              <View style={styles.hubSection}>
                {isInitialLoad ? (
                  <View style={styles.hubLoadingWrap}>
                    <ActivityIndicator size="small" color="#25729f" />
                  </View>
                ) : (
                  <View style={styles.hubStage}>
                    <Animated.View
                      style={[styles.hubIntroLayer, { opacity: hubIntroTextOpacity }]}
                      pointerEvents="none"
                    >
                      <View style={styles.hubTypewriterRow}>
                        <Text style={styles.hubTypewriterName}>{hubIntroNamePart}</Text>
                        <Text style={styles.hubTypewriterNavigate}>{hubIntroNavigatePart}</Text>
                        {!hubIntroTypewriterComplete && <HubTypewriterCursor />}
                      </View>
                    </Animated.View>
                    <Animated.View
                      style={[styles.hubActionsBlock, { opacity: hubButtonsOpacity }]}
                      pointerEvents={hubButtonsReady ? 'auto' : 'none'}
                    >
                      <Text style={styles.hubActionsTitle}>Actions</Text>
                      <View style={styles.hubGrid}>
                      <TouchableOpacity
                        style={styles.hubSquareCard}
                        activeOpacity={0.9}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          await AsyncStorage.setItem('decide_initial_tab', 'decide');
                          router.push({ pathname: '/(tabs)/decide', params: { tab: 'decide' } });
                        }}
                      >
                        <View style={styles.hubSquareCardInner} collapsable={false}>
                          <LinearGradient
                            colors={HUB_CARD_GRADIENT.decide}
                            style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                          />
                          <View ref={decideRef} collapsable={false} style={styles.hubSquareGraphic}>
                            <View style={styles.hubOverlapHeroContainer}>
                              <View style={[styles.hubOverlapCard, styles.decideOptionBack, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.decide.back}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <Text style={styles.decideOptionLetterOnSolid}>A</Text>
                              </View>
                              <View style={[styles.hubOverlapCard, styles.decideOptionFront, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.decide.front}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <Text style={[styles.decideOptionLetterOutlined, { color: HUB_UI.decide.letterB }]}>
                                  B
                                </Text>
                              </View>
                            </View>
                          </View>
                          <HubSquareBottomBlur tone="decide" />
                          <View style={styles.hubSquarePill}>
                            <Text style={styles.hubSquarePillText}>Decide</Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.hubSquareCard}
                        activeOpacity={0.9}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push('/(tabs)/simulate');
                        }}
                      >
                        <View style={styles.hubSquareCardInner} collapsable={false}>
                          <LinearGradient
                            colors={HUB_CARD_GRADIENT.simulate}
                            style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                          />
                          <View ref={simulateRef} collapsable={false} style={styles.hubSquareGraphic}>
                            <View style={styles.hubOverlapHeroContainer}>
                              <View style={[styles.hubOverlapCard, styles.simulateHeroBack, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.simulate.back}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <View style={styles.simulateBars}>
                                  {[20, 34, 26].map((h, i) => (
                                    <LinearGradient
                                      key={i}
                                      colors={HUB_UI.simulate.bar}
                                      start={{ x: 0, y: 1 }}
                                      end={{ x: 0, y: 0 }}
                                      style={[styles.simulateBar, { height: h }]}
                                    />
                                  ))}
                                </View>
                              </View>
                              <View style={[styles.hubOverlapCard, styles.simulateHeroFront, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.simulate.front}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <TrendingUp size={30} color={HUB_UI.simulate.accent} strokeWidth={2.5} />
                              </View>
                            </View>
                          </View>
                          <HubSquareBottomBlur tone="simulate" />
                          <View style={styles.hubSquarePill}>
                            <Text style={styles.hubSquarePillText}>Simulate</Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.hubSquareCard}
                        activeOpacity={0.9}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          await AsyncStorage.setItem('decide_initial_tab', 'architect');
                          router.push({ pathname: '/(tabs)/decide', params: { tab: 'architect' } });
                        }}
                      >
                        <View style={styles.hubSquareCardInner} collapsable={false}>
                          <LinearGradient
                            colors={HUB_CARD_GRADIENT.chat}
                            style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                          />
                          <View style={styles.hubSquareGraphic}>
                            <View style={styles.hubOverlapHeroContainer}>
                              <View style={[styles.hubOverlapCard, styles.chatHeroBack, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.chat.back}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <View style={styles.chatBubbleBackTail} />
                                <View style={styles.chatBubbleBackMain} />
                              </View>
                              <View style={[styles.hubOverlapCard, styles.chatHeroFront, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.chat.front}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <View style={styles.chatDotsRow}>
                                  <LinearGradient
                                    colors={[HUB_UI.chat.dot, HUB_UI.chat.accent] as const}
                                    style={styles.chatDot}
                                  />
                                  <LinearGradient
                                    colors={[HUB_UI.chat.dot, HUB_UI.chat.accent] as const}
                                    style={styles.chatDot}
                                  />
                                  <LinearGradient
                                    colors={[HUB_UI.chat.dot, HUB_UI.chat.accent] as const}
                                    style={styles.chatDot}
                                  />
                                </View>
                              </View>
                            </View>
                          </View>
                          <HubSquareBottomBlur tone="chat" />
                          <View style={styles.hubSquarePill}>
                            <Text style={styles.hubSquarePillText}>Chat</Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.hubSquareCard}
                        activeOpacity={0.9}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          await AsyncStorage.setItem('previous_route_before_profile', '/(tabs)/home');
                          router.push('/twin-insights');
                        }}
                      >
                        <View style={styles.hubSquareCardInner} collapsable={false}>
                          <LinearGradient
                            colors={HUB_CARD_GRADIENT.insights}
                            style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                          />
                          <View ref={trainRef} collapsable={false} style={styles.hubSquareGraphic}>
                            <View style={styles.hubOverlapHeroContainer}>
                              <View style={[styles.hubOverlapCard, styles.insightsHeroBack, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.insights.back}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <View style={styles.insightsSparkRow}>
                                  <LinearGradient
                                    colors={HUB_UI.insights.spark}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 0, y: 0 }}
                                    style={styles.insightsSpark}
                                  />
                                  <LinearGradient
                                    colors={HUB_UI.insights.spark}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 0, y: 0 }}
                                    style={[styles.insightsSpark, styles.insightsSparkTall]}
                                  />
                                  <LinearGradient
                                    colors={HUB_UI.insights.spark}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 0, y: 0 }}
                                    style={styles.insightsSpark}
                                  />
                                </View>
                              </View>
                              <View style={[styles.hubOverlapCard, styles.insightsHeroFront, styles.hubUiCardClip]}>
                                <LinearGradient
                                  colors={HUB_UI.insights.front}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.hubUiGradientFill}
                                />
                                <View style={styles.insightsMiniGrid}>
                                  {[0, 1, 2, 3].map((i) => (
                                    <LinearGradient
                                      key={i}
                                      colors={HUB_UI.insights.cell}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={styles.insightsMiniCell}
                                    />
                                  ))}
                                </View>
                              </View>
                            </View>
                          </View>
                          <HubSquareBottomBlur tone="insights" />
                          <View style={styles.hubSquarePill}>
                            <Text style={styles.hubSquarePillText}>Twin</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      </View>

                      <View style={styles.hubUpdateTwinSection}>
                        <Text style={styles.hubUpdateTwinTitle}>Update Twin</Text>
                        <View style={styles.hubUpdateTwinOptions}>
                          <TouchableOpacity
                            style={styles.hubUpdateTwinOption}
                            activeOpacity={0.88}
                            disabled={!user?.id}
                            onPress={() => {
                              if (!user?.id) return;
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              router.push('/twin-update');
                            }}
                          >
                            <PenLine size={22} color="#25729f" strokeWidth={2} />
                            <Text style={styles.hubUpdateTwinOptionLabel}>Write</Text>
                          </TouchableOpacity>
                          <View style={[styles.hubUpdateTwinOption, styles.hubUpdateTwinOptionSoon]}>
                            <Phone size={22} color={Colors.textTertiary} strokeWidth={2} />
                            <Text style={styles.hubUpdateTwinOptionLabelMuted}>Call</Text>
                            <Text style={styles.hubUpdateTwinComingSoon}>Coming soon</Text>
                          </View>
                        </View>
                      </View>

                      {activeThreadsHome.length > 0 && (
                        <View style={styles.hubMindSection}>
                          <Text style={styles.hubUpdateTwinTitle}>On your mind</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.hubMindCarousel}
                            contentContainerStyle={styles.hubMindCarouselContent}
                          >
                            {activeThreadsHome.map((thread) => (
                              <TouchableOpacity
                                key={thread.id}
                                style={styles.hubMindCard}
                                activeOpacity={0.88}
                                onPress={() => openThreadInArchitectChat(thread)}
                              >
                                <View style={styles.hubMindCardContent}>
                                  <View style={styles.hubMindCardBadge}>
                                    <Text style={styles.hubMindCardBadgeText}>
                                      {hubThreadDomainLabel(thread.domain)}
                                    </Text>
                                  </View>
                                  <Text style={styles.hubMindCardText} numberOfLines={3}>
                                    {thread.summary}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                            {activeThreadsHome.length > 3 && (
                              <TouchableOpacity
                                style={[styles.hubMindCard, styles.hubMindCardMore]}
                                activeOpacity={0.88}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  AsyncStorage.setItem('previous_route_before_profile', '/(tabs)/home');
                                  router.push('/twin-insights');
                                }}
                              >
                                <View style={styles.hubMindCardMoreInner}>
                                  <Text style={styles.hubMindCardMoreTitle}>Your twin</Text>
                                  <Text style={styles.hubMindCardMoreSub}>View all threads</Text>
                                  <ChevronRight
                                    size={22}
                                    color={Colors.textTertiary}
                                    strokeWidth={2}
                                    style={styles.hubMindCardMoreChevron}
                                  />
                                </View>
                              </TouchableOpacity>
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </Animated.View>
                  </View>
                )}
              </View>
            )}

            {/* Distance to Dream Self Card */}
            {!homeDecisionFirst && profileData?.dream_vision && (
              <TouchableOpacity 
                style={styles.dreamSelfCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/journey');
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F8F7FF']}
                  style={styles.dreamSelfCardGradient}
                />
                
                <View style={styles.dreamSelfWidgetContent}>
                  <View style={styles.dreamSelfWidgetLeft}>
                    <Text style={styles.dreamSelfWidgetValue}>
                      {(() => {
                        const p = profileData?.dream_self_progress || {};
                        const values = Object.values(p) as number[];
                        if (values.length === 0) return "0%";
                        const avg = values.reduce((a, b) => a + b, 0) / values.length;
                        return Math.round(avg) + "%";
                      })()}
                    </Text>
                    <View style={styles.dreamSelfWidgetLabelRow}>
                      <Text style={styles.dreamSelfWidgetLabel}>Distance to Dream Self</Text>
                      <ChevronRight size={14} color={Colors.textTertiary} />
                    </View>
                    
                    {profileData?.est_days_remaining && (
                      <View style={styles.dreamSelfWidgetDaysContainer}>
                        <Text style={styles.dreamSelfWidgetDaysText}>
                          Estimated {profileData.est_days_remaining} days left
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.dreamSelfWidgetRight}>
                    <CircularProgress 
                      progress={(() => {
                        const p = profileData?.dream_self_progress || {};
                        const values = Object.values(p) as number[];
                        if (values.length === 0) return 0;
                        const avg = values.reduce((a, b) => a + b, 0) / values.length;
                        return avg / 100;
                      })()}
                      size={80}
                      strokeWidth={8}
                      icon={require('@/assets/images/manwhite.png')}
                      colors={['#25729f', '#62edb9']}
                      trackColor="rgba(37, 114, 159, 0.1)"
                      iconTintColor={null}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Daily Tasks Section */}
            {!homeDecisionFirst && dailyTasks.length > 0 ? (
              <View style={styles.architectSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <View style={styles.dailyPathTitleRow}>
                      <Text style={styles.sectionTitle}>Daily Path</Text>
                      <View style={styles.notifTag}>
                        <Bell size={14} color={notificationsEnabled ? '#25729f' : Colors.textTertiary} strokeWidth={2} />
                        <Switch
                          value={notificationsEnabled}
                          onValueChange={handleNotificationsToggle}
                          trackColor={{ false: 'rgba(0,0,0,0.15)', true: 'rgba(37,114,159,0.4)' }}
                          thumbColor={notificationsEnabled ? '#25729f' : '#f4f3f4'}
                          style={styles.notifSwitch}
                        />
                      </View>
                    </View>
                    <Text style={styles.sectionSubtitle}>Your micro-actions for today</Text>
                  </View>
                  <View style={styles.taskCountBadge}>
                    <Text style={styles.taskCountText}>
                      {dailyTasks.filter(t => t.is_completed).length}/3
                    </Text>
                  </View>
                </View>

                <View style={styles.taskCarouselContainer}>
                  <ScrollView
                    ref={taskScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pathList}
                    snapToInterval={width * 0.65 + 12}
                    decelerationRate="fast"
                  >
                  {dailyTasks.map((task, index) => (
                    <TouchableOpacity
                      key={task.id}
                      onPress={(e) => handleToggleTask(task, e)}
                      activeOpacity={0.7}
                      disabled={task.is_completed}
                      style={task.is_completed && { opacity: 0.6 }}
                    >
                        <View
                          style={[
                            styles.taskCard,
                            task.is_completed && styles.taskCardCompleted
                          ]}
                        >
                          <View style={styles.taskContent}>
                            <View style={styles.taskHeader}>
                              <View style={styles.taskCategoryBadge}>
                                <Text style={styles.taskCategoryText}>{task.category || 'Growth'}</Text>
                                <Text style={styles.taskCategoryEmoji}>{getCategoryEmoji(task.category)}</Text>
                              </View>
                              <LinearGradient
                                colors={['#25729f', '#62edb9']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.taskPointsBadge}
                              >
                                <Text style={styles.taskPointsText}>+{task.points || 10}</Text>
                              </LinearGradient>
                            </View>
                            <Text
                              style={[
                                styles.taskText,
                                task.is_completed && styles.taskTextCompleted
                              ]}
                            >
                              {task.task_content}
                            </Text>
                          </View>
                          {!task.is_completed && (
                            <Text style={styles.tapToCompleteLabel}>tap to complete</Text>
                          )}
                          <View style={[
                            styles.taskCheckbox,
                            task.is_completed && styles.taskCheckboxChecked
                          ]}>
                            {task.is_completed ? (
                              <Check size={12} color="#FFFFFF" strokeWidth={4} />
                            ) : (
                              <View style={styles.taskDot} />
                            )}
                          </View>
                        </View>
                    </TouchableOpacity>
                  ))}
                  </ScrollView>
                </View>
              </View>
            ) : !homeDecisionFirst ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No tasks yet</Text>
                <Text style={styles.emptyStateText}>
                  Complete your dream self setup to get personalized daily tasks from your Architect.
                </Text>
              </View>
            ) : null}

          </Animated.ScrollView>
        </SafeAreaView>
        
        {/* Floating Points - Outside ScrollView for proper absolute positioning */}
        {floatingPoints.map(point => (
          <FloatingPoint key={point.id} x={point.x} y={point.y} value={point.value} />
        ))}
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

      {/* Dream Self Letter Modal */}
      <Modal
        visible={showDreamSelfLetterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDreamSelfLetterModal(false)}
      >
        <View style={styles.discordModalOverlay}>
          <View style={styles.discordModalContent}>

            {/* Typewriter intro — "A letter from / your future self." */}
            <Animated.View
              style={{
                opacity: letterInvitationOpacity,
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
              pointerEvents={showLetterContent ? 'none' : 'auto'}
            >
              <View style={styles.invitationTextContainer}>
                {letterInvitationLines.map((line, index) => (
                  <Text key={index} style={styles.invitationText}>
                    {line || ''}
                  </Text>
                ))}
              </View>
            </Animated.View>

            {/* Letter content — fades in after typewriter */}
            {showLetterContent && (
              <Animated.View style={[styles.discordContentContainer, { opacity: letterContentOpacity }]}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 420, width: '100%' }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  <Text style={styles.letterBodyText}>{dreamSelfLetterText}</Text>
                </ScrollView>

                <Pressable
                  onPress={() => setShowDreamSelfLetterModal(false)}
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
                    <Text style={styles.discordButtonText}>Start my path</Text>
                  </LinearGradient>
                </Pressable>

              </Animated.View>
            )}

          </View>
        </View>
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
                router.push('/twin-insights');
              }}
            >
              <Text style={styles.accuracyActionText}>Train My Mora</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Architect Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.feedbackModalOverlay}
        >
          <View style={styles.feedbackModalContent}>
            <View style={styles.feedbackHeader}>
              <View style={styles.architectIconLarge}>
                <Zap size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.feedbackTitle}>Daily Review</Text>
              <Text style={styles.feedbackSubtitle}>
                You've completed all tasks for today. How did it go?
              </Text>
            </View>

            <FloatingLabelInput
              label="Your feedback for The Architect"
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              placeholder="e.g. Too easy, I need more financial focus, etc."
              containerStyle={styles.feedbackInput}
            />

            <TouchableOpacity
              style={[
                styles.feedbackSubmitButton,
                (!feedbackText || isGeneratingNext) && styles.feedbackSubmitDisabled
              ]}
              onPress={handleSubmitFeedback}
              disabled={!feedbackText || isGeneratingNext}
            >
              <LinearGradient
                colors={['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.feedbackSubmitGradient}
              >
                <Text style={styles.feedbackSubmitText}>
                  {isGeneratingNext ? "Generating Tomorrow's Path..." : "Submit & Prepare Tomorrow"}
                </Text>
                {!isGeneratingNext && <ChevronRight size={20} color="#FFFFFF" />}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowFeedbackModal(false)}
              style={styles.feedbackCloseButton}
              disabled={isGeneratingNext}
            >
              <Text style={styles.feedbackCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
  },
  moraTagText: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 13,
    color: '#696969',
  },
  moraTagTextPremium: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 13,
    color: '#00BCA6',
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
    paddingTop: 8,
    paddingBottom: 120,
  },
  tasksContainer: {
    gap: 16,
  },
  compatibilityBanner: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    backgroundColor: '#FFFFFF',
  },
  compatibilityBannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compatibilityBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  compatibilityBannerLeft: {
    flex: 1,
    gap: 4,
  },
  compatibilityBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  compatibilityBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  compatibilityBannerSubtitle: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  compatibilityAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  compatibilityAvatar: {
    width: 40,
    height: 40,
  },
  compatibilityAvatarFlipped: {
    transform: [{ scaleX: -1 }],
  },
  compatibilityConnector: {
    marginHorizontal: 2,
  },
  newTag: {
    backgroundColor: '#A78BFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  greetingContainer: {
    marginBottom: 12,
    paddingTop: 8,
    paddingLeft: 4,
  },
  greetingText: {
    fontSize: 15,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    lineHeight: 21,
    textAlign: 'left',
    fontWeight: '600',
  },
  greetingSubtext: {
    fontSize: 17,
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    lineHeight: 23,
    textAlign: 'left',
    fontWeight: '700',
    marginTop: 4,
  },
  journeyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(37, 114, 159, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 114, 159, 0.2)',
  },
  journeyCtaContent: {},
  journeyCtaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  journeyCtaSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Dream Self Card
  dreamSelfCard: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  dreamSelfCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  dreamSelfWidgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dreamSelfWidgetLeft: {
    flex: 1,
    gap: 4,
  },
  dreamSelfWidgetValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 36,
  },
  dreamSelfWidgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  dreamSelfWidgetLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  dreamSelfWidgetDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dreamSelfWidgetDaysText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
    fontFamily: Fonts.secondary.bold,
  },
  dreamSelfWidgetRight: {
    marginLeft: 16,
  },
  // Architect Section
  architectSection: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginTop: 4,
  },
  dailyPathTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  notifSwitch: {
    transform: [{ scale: 0.7 }],
  },
  taskCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  taskCountText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
  },
  dreamProgressContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    padding: 16,
    borderRadius: 20,
  },
  dreamProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dreamProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dreamProgressValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  estDaysLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  estDaysValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    fontFamily: Fonts.secondary.bold,
  },
  taskCarouselContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  pathList: {
    flexDirection: 'row',
    paddingRight: 24,
    paddingLeft: 4,
    paddingVertical: 12,
    gap: 12,
  },
  taskCardGradient: {
    padding: 0,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  taskCard: {
    width: width * 0.65,
    height: 210,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    // 3D Effect
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  taskCardCompleted: {
    backgroundColor: '#F8F8F8',
    borderColor: 'transparent',
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  taskCheckboxChecked: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  tapToCompleteLabel: {
    position: 'absolute',
    bottom: 20,
    right: 48,
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.regular,
    opacity: 0.7,
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textTertiary,
  },
  taskContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-start',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  taskCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  taskPointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 114, 159, 0.3)',
  },
  taskPointsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  taskCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
  },
  taskCategoryEmoji: {
    fontSize: 10,
  },
  taskText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 20,
    paddingHorizontal: width * 0.04, // 4% of screen width
    paddingVertical: width * 0.02, // 2% of screen width
  },
  taskTextCompleted: {
    color: Colors.textTertiary,
    textDecorationLine: 'none',
  },
  taskCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  hubSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  hubLoadingWrap: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  hubStage: {
    position: 'relative',
    width: '100%',
    minHeight: 420,
  },
  hubIntroLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 8,
    zIndex: 2,
  },
  hubTypewriterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    maxWidth: '100%',
  },
  hubTypewriterName: {
    fontSize: 24,
    fontFamily: Fonts.primary.regular,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  hubTypewriterNavigate: {
    fontSize: 24,
    fontFamily: Fonts.primary.regular,
    fontWeight: '700',
    color: '#25729f',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  hubTypewriterCursor: {
    fontSize: 24,
    fontFamily: Fonts.primary.regular,
    fontWeight: '300',
    color: '#25729f',
    lineHeight: 30,
    marginLeft: 2,
    marginTop: -2,
  },
  hubActionsBlock: {
    width: '100%',
    paddingTop: 8,
  },
  hubMindSection: {
    width: '100%',
    marginTop: 22,
  },
  hubMindCarousel: {
    overflow: 'visible',
    marginHorizontal: -20,
  },
  hubMindCarouselContent: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  hubMindCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    width: HUB_UPDATE_TWIN_CELL_W,
    minWidth: HUB_UPDATE_TWIN_CELL_W,
    maxWidth: HUB_UPDATE_TWIN_CELL_W,
    minHeight: 96,
    justifyContent: 'center',
  },
  hubMindCardContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  hubMindCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  hubMindCardBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
  },
  hubMindCardText: {
    fontSize: 12,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  hubMindCardMore: {
    width: HUB_UPDATE_TWIN_CELL_W,
    minWidth: HUB_UPDATE_TWIN_CELL_W,
    maxWidth: HUB_UPDATE_TWIN_CELL_W,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubMindCardMoreInner: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubMindCardMoreTitle: {
    fontSize: 11,
    fontFamily: Fonts.secondary.bold,
    color: '#25729f',
    textAlign: 'center',
  },
  hubMindCardMoreSub: {
    fontSize: 9,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  hubMindCardMoreChevron: {
    marginTop: 6,
  },
  hubActionsTitle: {
    fontSize: 20,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 11,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    width: '100%',
  },
  hubUpdateTwinSection: {
    marginTop: 22,
    width: '100%',
  },
  hubUpdateTwinTitle: {
    fontSize: 17,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    letterSpacing: -0.35,
    marginBottom: 11,
  },
  hubUpdateTwinOptions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  hubUpdateTwinOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  hubUpdateTwinOptionLabel: {
    fontSize: 15,
    fontFamily: Fonts.secondary.semibold,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.15,
  },
  hubUpdateTwinOptionSoon: {
    opacity: 0.85,
    backgroundColor: '#F8F9FA',
    borderColor: 'rgba(0,0,0,0.04)',
    shadowOpacity: 0.02,
    elevation: 0,
  },
  hubUpdateTwinOptionLabelMuted: {
    fontSize: 15,
    fontFamily: Fonts.secondary.semibold,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: -0.15,
  },
  hubUpdateTwinComingSoon: {
    fontSize: 11,
    fontFamily: Fonts.secondary.semibold,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  hubSquareCard: {
    width: '48%',
    height: (width - 48) * 0.48,
    borderRadius: 28,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  hubSquareCardInner: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
  },
  hubSquareGraphic: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    zIndex: 0,
    elevation: 0,
  },
  hubCardBottomBlurWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
    zIndex: 2,
    overflow: 'hidden',
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  hubSquarePill: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    zIndex: 10,
    ...(Platform.OS === 'android' ? { elevation: 12 } : {}),
  },
  hubSquarePillText: {
    fontSize: 12,
    fontFamily: Fonts.secondary.semibold,
    color: Colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  hubOverlapHeroContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubOverlapCard: {
    position: 'absolute',
    width: 56,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubUiCardClip: {
    overflow: 'hidden',
  },
  hubUiGradientFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  simulateHeroBack: {
    right: 10,
    top: 6,
    transform: [{ rotate: '8deg' }],
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  simulateHeroFront: {
    borderColor: '#0F7668',
    borderWidth: 2.5,
    left: 10,
    bottom: 10,
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  simulateBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    height: 40,
  },
  simulateBar: {
    width: 9,
    borderRadius: 3,
    overflow: 'hidden',
  },
  chatHeroBack: {
    right: 10,
    top: 6,
    transform: [{ rotate: '8deg' }],
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  chatHeroFront: {
    borderColor: '#15803D',
    borderWidth: 2.5,
    left: 10,
    bottom: 10,
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBubbleBackMain: {
    position: 'absolute',
    width: 38,
    height: 26,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    top: 10,
    right: 6,
  },
  chatBubbleBackTail: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    bottom: 14,
    left: 10,
  },
  chatDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  insightsHeroBack: {
    right: 10,
    top: 6,
    transform: [{ rotate: '8deg' }],
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  insightsHeroFront: {
    borderColor: '#4B5563',
    borderWidth: 2.5,
    left: 10,
    bottom: 10,
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  insightsSparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 36,
  },
  insightsSpark: {
    width: 5,
    height: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  insightsSparkTall: {
    height: 22,
  },
  insightsMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 28,
    gap: 4,
    justifyContent: 'center',
  },
  insightsMiniCell: {
    width: 11,
    height: 11,
    borderRadius: 3,
    overflow: 'hidden',
  },
  decideOptionBack: {
    right: 10,
    top: 6,
    transform: [{ rotate: '8deg' }],
    shadowColor: '#FF6B2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  decideOptionFront: {
    borderColor: '#E8590C',
    borderWidth: 2.5,
    left: 10,
    bottom: 10,
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  decideOptionLetterOnSolid: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Fonts.secondary.bold,
  },
  decideOptionLetterOutlined: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Fonts.secondary.bold,
  },
  emptyStateContainer: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  onboardingTaskCard: {
    width: width * 0.65,
    height: 180,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingTaskCardCompleted: {
    backgroundColor: '#F8F8F8',
    borderColor: 'transparent',
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  onboardingTaskCardContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-start',
  },
  onboardingTaskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 12,
  },
  onboardingTaskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTaskCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 20,
    marginBottom: 4,
  },
  onboardingTaskCardTitleCompleted: {
    color: Colors.textTertiary,
  },
  onboardingTaskCardDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 18,
  },
  onboardingTaskCardCta: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.semibold,
    marginTop: 6,
  },
  onboardingTaskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  onboardingTaskCheckboxCompleted: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  onboardingTaskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // Locked State
  lockedStateContainer: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  lockedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  lockedStateText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  floatingPoint: {
    position: 'absolute',
    zIndex: 1000,
    shadowColor: '#25729f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingPointGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPointText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  // Feedback Modal
  feedbackModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  feedbackModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  feedbackHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  architectIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#25729f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Fonts.secondary.regular,
  },
  feedbackInput: {
    marginBottom: 24,
  },
  feedbackSubmitButton: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 12,
  },
  feedbackSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  feedbackSubmitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  feedbackSubmitDisabled: {
    opacity: 0.5,
  },
  feedbackCloseButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  feedbackCloseText: {
    fontSize: 15,
    color: Colors.textTertiary,
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
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
    minHeight: 520,
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
  recalculatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  recalculatingText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  // Dream Self Letter body text
  letterBodyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 24,
  },
});
