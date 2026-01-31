import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, Animated, Platform, Modal, Easing, Dimensions, Linking, KeyboardAvoidingView } from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile, getWhatIfs, getRelationships, deleteDecision, deleteWhatIf, calculateOverallProgress, getTodayJournal, getAllYearPredictions, updateProfileFields, getDailyTasks, updateDailyTask, saveArchitectFeedback, getLatestArchitectFeedback, saveDailyTasks, deleteDailyTasks } from '@/lib/storage';
import { Compass, Sparkles, X, Trash2, ChevronRight, HelpCircle, Book, User, Settings, Info, Layers, ArrowUpRight, CheckCircle, Zap, Clipboard, Check, RefreshCw } from 'lucide-react-native';
import { HomeGradientIcon, FlameGradientIcon } from '@/components/GradientIcons';
import { generateArchitectPlan, calculateArchitectProgress, recalculateDreamProgress } from '@/lib/ai';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
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
import { CircularProgress } from '@/components/CircularProgress';
import { setHasSeenDecisionGuide } from '@/lib/guideStorage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors, Fonts } from '@/constants/Theme';
import { useTypewriter } from '@/hooks/useTypewriter';

const { width } = Dimensions.get('window');

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
      <Text style={styles.floatingPointText}>{value}</Text>
    </Animated.View>
  );
}

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
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<{ id: string; x: number; y: number; value: string }[]>([]);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const initialProfileRef = useRef<any>(null);
  const taskScrollViewRef = useRef<ScrollView>(null);
  const regenerateRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRegenerating) {
      Animated.loop(
        Animated.timing(regenerateRotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      regenerateRotateAnim.setValue(0);
    }
  }, [isRegenerating]);

  const spin = regenerateRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [profile, decisions, whatifs, progress, journalToday, tasks, allTasks] = await Promise.all([
        getProfile(user.id),
        getDecisions(user.id),
        getWhatIfs(user.id),
        calculateOverallProgress(user.id),
        getTodayJournal(user.id),
        getDailyTasks(user.id),
        getDailyTasks(user.id, null) // Get all tasks for streak calculation
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

      // Redirect to dream self onboarding if not completed
      if (profile && (!profile.dream_vision || Object.keys(profile.dream_vision).length === 0)) {
        router.replace('/onboarding/dream-self/welcome');
        return;
      }

      setProfileData(profile);
      initialProfileRef.current = profile;
      setRecentDecisions(decisions || []);
      setRecentWhatIfs(whatifs || []);
      setProfileProgress(progress || 0);
      setHasTodayJournal(!!journalToday);
      
      // Ensure we only show today's tasks - filter and limit to max 3
      const today = new Date().toISOString().split('T')[0];
      const todayTasks = (tasks || [])
        .filter(task => task.scheduled_date === today)
        .slice(0, 3); // Limit to max 3 tasks
      setDailyTasks(todayTasks);

      // Calculate streak (Duolingo-style) - same logic as streak screen
      const grouped: Record<string, boolean> = {};
      (allTasks || []).forEach(t => {
        if (!grouped[t.scheduled_date]) grouped[t.scheduled_date] = true;
        if (!t.is_completed) grouped[t.scheduled_date] = false;
      });

      let streak = 0;
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      let curr = new Date(todayDate);
      const todayStr = curr.toISOString().split('T')[0];
      
      // Check if today has completed tasks
      if (grouped[todayStr]) {
        streak = 1;
        curr.setDate(curr.getDate() - 1);
      } else {
        // Today not completed yet, check yesterday
        curr.setDate(curr.getDate() - 1);
        const yesterdayStr = curr.toISOString().split('T')[0];
        
        if (grouped[yesterdayStr]) {
          streak = 1;
          curr.setDate(curr.getDate() - 1);
        }
      }
      
      // Continue counting backwards until we hit a missed day
      if (streak > 0) {
        while (true) {
          const d = curr.toISOString().split('T')[0];
          if (grouped[d]) {
            streak++;
            curr.setDate(curr.getDate() - 1);
          } else {
            break;
          }
        }
      }
      
      setStreakCount(streak);

      // Generate daily tasks if they don't exist for today and user has completed dream self
      if ((!todayTasks || todayTasks.length === 0) && profile?.dream_vision) {
        try {
          const today = new Date().toISOString().split('T')[0];
          
          // Get completed tasks from previous days to inform new task generation
          let completedTasks: string[] = [];
          try {
            const allTasks = await getDailyTasks(user.id, null); // Get all tasks to find completed ones
            completedTasks = allTasks
              .filter(t => t.is_completed && t.scheduled_date !== today) // Only previous days' completed tasks
              .map(t => t.task_content);
          } catch (error) {
            // Table might not exist yet, that's okay - just proceed without completed tasks context
            console.warn('Could not fetch previous tasks (table may not exist):', error);
          }
          
          // Get latest feedback if available (gracefully handle if table doesn't exist yet)
          let latestFeedback = null;
          try {
            latestFeedback = await getLatestArchitectFeedback(user.id);
          } catch (error) {
            // Table might not exist yet, that's okay
            console.warn('Could not fetch architect feedback (table may not exist):', error);
          }
          
          // Generate new tasks for today
          const newTasks = await generateArchitectPlan(
            profile,
            profile.dream_vision,
            completedTasks,
            latestFeedback?.feedback
          );
          
          // Save tasks with today's date
          const tasksWithDate = newTasks.map(task => ({
            ...task,
            scheduled_date: today
          }));
          
          const savedTasks = await saveDailyTasks(user.id, tasksWithDate);
          // Ensure we only show today's tasks - filter and limit to max 3
          const savedTodayTasks = (savedTasks || [])
            .filter(task => task.scheduled_date === today)
            .slice(0, 3); // Limit to max 3 tasks
          setDailyTasks(savedTodayTasks);
        } catch (error) {
          console.error('Error generating daily tasks:', error);
          // Don't block the UI if task generation fails
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
          router.replace('/onboarding/00-name');
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

  const handleToggleTask = async (task: any, event: any) => {
    try {
      if (task.is_completed) return; // Only animate on completion

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animate floating points
      const { pageX, pageY } = event.nativeEvent;
      const id = Math.random().toString(36).substr(2, 9);
      setFloatingPoints(prev => [...prev, { id, x: pageX, y: pageY, value: '+1' }]);
      
      // Remove point after animation
      setTimeout(() => {
        setFloatingPoints(prev => prev.filter(p => p.id !== id));
      }, 1000);

      const updatedTask = await updateDailyTask(task.id, { is_completed: true });
      const newTasks = dailyTasks.map(t => t.id === task.id ? updatedTask : t);
      setDailyTasks(newTasks);

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
        // Navigate to streak screen sequence
        setTimeout(() => {
          router.push('/onboarding/dream-self/streak');
        }, 1000);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleRegenerateTasks = async () => {
    if (!user || !profileData || isRegenerating) return;
    
    setIsRegenerating(true);
    setDailyTasks([]); // Clear immediately for instant feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Delete today's tasks (gracefully handle if table doesn't exist)
      try {
        await deleteDailyTasks(user.id, today);
      } catch (error) {
        // Table might not exist yet, that's okay - we'll just create new ones
        console.warn('Could not delete existing tasks (table may not exist):', error);
      }
      
      // 2. Get context for new tasks
      let completedTasks: string[] = [];
      try {
        const allTasks = await getDailyTasks(user.id, null);
        completedTasks = allTasks
          .filter(t => t.is_completed && t.scheduled_date !== today)
          .map(t => t.task_content);
      } catch (error) {
        // Table might not exist yet, that's okay - proceed without completed tasks context
        console.warn('Could not fetch previous tasks (table may not exist):', error);
      }
      
      // Get latest feedback if available (gracefully handle if table doesn't exist yet)
      let latestFeedback = null;
      try {
        latestFeedback = await getLatestArchitectFeedback(user.id);
      } catch (error) {
        // Table might not exist yet, that's okay
        console.warn('Could not fetch architect feedback (table may not exist):', error);
      }
      
      // 3. Generate new tasks
      const newTasks = await generateArchitectPlan(
        profileData,
        profileData.dream_vision,
        completedTasks,
        latestFeedback?.feedback
      );
      
      // 4. Save new tasks
      const tasksWithDate = newTasks.map(task => ({
        ...task,
        scheduled_date: today
      }));
      
      try {
        const savedTasks = await saveDailyTasks(user.id, tasksWithDate);
        // Ensure we only show today's tasks - filter and limit to max 3
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = (savedTasks || [])
          .filter(task => task.scheduled_date === today)
          .slice(0, 3); // Limit to max 3 tasks
        setDailyTasks(todayTasks);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        // If table doesn't exist, at least show the tasks locally
        console.warn('Could not save tasks to database (table may not exist):', error);
        // Ensure we only show today's tasks - filter and limit to max 3
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = (tasksWithDate || [])
          .filter(task => task.scheduled_date === today)
          .slice(0, 3); // Limit to max 3 tasks
        setDailyTasks(todayTasks as any);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error regenerating tasks:', error);
      alert('Failed to regenerate tasks. Please try again.');
    } finally {
      setIsRegenerating(false);
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
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
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
              <View style={styles.streakContainer}>
                <FlameGradientIcon size={20} />
                <Text style={styles.streakText}>{streakCount}</Text>
              </View>

              <TouchableOpacity 
                style={styles.iconButton}
                onPress={handleRegenerateTasks}
                disabled={isRegenerating}
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <RefreshCw size={20} color={isRegenerating ? Colors.textTertiary : Colors.textPrimary} strokeWidth={2.5} />
                </Animated.View>
              </TouchableOpacity>

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
            {/* Main Header */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>
                  <Text style={styles.greetingName}>Hi {userName || 'Friend'},{'\n'}</Text>
                  <Text style={styles.greetingRest}>What do you want to{'\n'}explore right now?</Text>
                </Text>
              </View>
            </View>

            {/* Distance to Dream Self Card */}
            {profileData?.dream_vision && (
              <TouchableOpacity 
                style={styles.dreamSelfCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/gap-analysis');
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
                      colors={['#A78BFA', '#F472B6']}
                      trackColor="rgba(167, 139, 250, 0.1)"
                      iconTintColor={null}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Daily Tasks Section */}
            {dailyTasks.length > 0 ? (
              <View style={styles.architectSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Daily Path</Text>
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
                    snapToInterval={width * 0.50 + 12}
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
                        <View style={[
                          styles.taskCard,
                          task.is_completed && styles.taskCardCompleted
                        ]}>
                          <View style={styles.taskContent}>
                            <View style={styles.taskCategoryBadge}>
                              <Text style={styles.taskCategoryText}>{task.category || 'Growth'}</Text>
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
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No tasks yet</Text>
                <Text style={styles.emptyStateText}>
                  Complete your dream self setup to get personalized daily tasks from your Architect.
                </Text>
              </View>
            )}

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
                router.push('/(tabs)/profile');
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
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 154, 158, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 154, 158, 0.2)',
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9A9E',
    fontFamily: Fonts.secondary.bold,
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  compatibilityBannerSubtitle: {
    fontSize: 12,
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
  // Dream Self Card
  dreamSelfCard: {
    marginTop: 16,
    marginBottom: 24,
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
    fontSize: 42,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 48,
  },
  dreamSelfWidgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  dreamSelfWidgetLabel: {
    fontSize: 14,
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
    marginTop: 24,
    marginBottom: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginTop: 4,
  },
  taskCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  taskCountText: {
    fontSize: 14,
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
    paddingBottom: 24,
  },
  pathList: {
    flexDirection: 'row',
    paddingRight: 24,
    paddingLeft: 4,
    gap: 12,
  },
  taskCardGradient: {
    padding: 0,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  taskCard: {
    width: width * 0.50,
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
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
    minHeight: 140,
    marginTop: 8,
    marginBottom: 8,
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
  taskNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textTertiary,
  },
  taskContent: {
    width: '100%',
  },
  taskCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  taskCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
  },
  taskText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 24,
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
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  floatingPoint: {
    position: 'absolute',
    backgroundColor: '#FFD700',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
});
