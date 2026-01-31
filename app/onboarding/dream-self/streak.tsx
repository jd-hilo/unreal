import { View, Text, StyleSheet, Animated, Image, Pressable, Dimensions, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { ChevronRight, Flame, Sparkles, Calendar as CalendarIcon, BookOpen, CheckCircle2, Zap, MapPin, Heart, User, Copy, ArrowDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ProgressBar } from '@/components/ProgressBar';
import { getProfile, getDailyTasks, updateProfileFields, saveArchitectFeedback, saveDailyTasks, ensureTwinCode } from '@/lib/storage';
import { calculateArchitectProgress, generateArchitectPlan } from '@/lib/ai';
import { useAuth } from '@/store/useAuth';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { LigatureFreeText } from '@/components/LigatureFreeText';

const { width, height } = Dimensions.get('window');

type Stage = 'streak' | 'calendar' | 'journal' | 'progress';

export default function StreakScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [stage, setStage] = useState<Stage>('streak');
  const [journalText, setJournalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [increments, setIncrements] = useState<Record<string, number>>({});
  const [rationale, setRationale] = useState('');
  const [estDays, setEstDays] = useState<number | string>('---');
  const [previousEstDays, setPreviousEstDays] = useState<number | null>(null);
  const [daysDecreased, setDaysDecreased] = useState(false);
  const [daysDecreasedBy, setDaysDecreasedBy] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<Record<string, boolean>>({});
  const [streakCount, setStreakNumber] = useState(1);
  const [twinCode, setTwinCode] = useState<string>('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const stageFadeAnim = useRef(new Animated.Value(1)).current;
  const stageSlideAnim = useRef(new Animated.Value(0)).current;
  const manSlideAnim = useRef(new Animated.Value(100)).current;
  const imageFadeAnim = useRef(new Animated.Value(0)).current;
  const imageSlideAnim = useRef(new Animated.Value(20)).current;
  
  // Streak animations
  const flameScaleAnim = useRef(new Animated.Value(0)).current;
  const flameRotateAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const subtitleFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Calendar animations
  const calendarIconScaleAnim = useRef(new Animated.Value(0)).current;
  const calendarTitleFadeAnim = useRef(new Animated.Value(0)).current;
  const calendarSubtitleFadeAnim = useRef(new Animated.Value(0)).current;
  const calendarButtonFadeAnim = useRef(new Animated.Value(0)).current;
  const calendarDotsAnim = useRef(new Animated.Value(0)).current;
  
  // Journal animations
  const journalIconScaleAnim = useRef(new Animated.Value(0)).current;
  const journalTitleFadeAnim = useRef(new Animated.Value(0)).current;
  const journalSubtitleFadeAnim = useRef(new Animated.Value(0)).current;
  const journalInputFadeAnim = useRef(new Animated.Value(0)).current;
  const journalButtonFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Progress animations
  const progressTitleFadeAnim = useRef(new Animated.Value(0)).current;
  const progressButtonFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) loadData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(manSlideAnim, { toValue: 0, friction: 6, tension: 30, useNativeDriver: true }),
      Animated.timing(imageFadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(imageSlideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [user]);

  // Stage animations
  useEffect(() => {
    if (stage === 'streak') {
      // Reset animations
      flameScaleAnim.setValue(0);
      flameRotateAnim.setValue(0);
      badgeScaleAnim.setValue(0);
      titleFadeAnim.setValue(0);
      subtitleFadeAnim.setValue(0);
      buttonFadeAnim.setValue(0);

      // Sequence: Flame animation -> Badge animation -> Text fade in -> Button fade in
      Animated.sequence([
        // Flame: Scale up with rotation
        Animated.parallel([
          Animated.spring(flameScaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(flameRotateAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Badge: Bounce in
        Animated.spring(badgeScaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        // Text: Fade in
        Animated.parallel([
          Animated.timing(titleFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleFadeAnim, {
            toValue: 1,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
        ]),
        // Button: Fade in
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (stage === 'calendar') {
      // Reset animations
      calendarTitleFadeAnim.setValue(0);
      calendarSubtitleFadeAnim.setValue(0);
      calendarDotsAnim.setValue(0);
      calendarButtonFadeAnim.setValue(0);

      // Sequence: Text -> Calendar -> Button
      Animated.sequence([
        // Text: Fade in
        Animated.parallel([
          Animated.timing(calendarTitleFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(calendarSubtitleFadeAnim, {
            toValue: 1,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
        ]),
        // Calendar dots: Fade in
        Animated.timing(calendarDotsAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Button: Fade in after calendar
        Animated.timing(calendarButtonFadeAnim, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (stage === 'journal') {
      // Reset animations
      journalIconScaleAnim.setValue(0);
      journalTitleFadeAnim.setValue(0);
      journalSubtitleFadeAnim.setValue(0);
      journalInputFadeAnim.setValue(0);
      journalButtonFadeAnim.setValue(0);

      // Sequence: Icon -> Text -> Input -> Button
      Animated.sequence([
        // Icon: Scale up
        Animated.spring(journalIconScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Text: Fade in
        Animated.parallel([
          Animated.timing(journalTitleFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(journalSubtitleFadeAnim, {
            toValue: 1,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
        ]),
        // Input: Fade in
        Animated.timing(journalInputFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Button: Fade in after input
        Animated.timing(journalButtonFadeAnim, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (stage === 'progress') {
      // Reset animations
      progressTitleFadeAnim.setValue(0);
      progressButtonFadeAnim.setValue(0);

      // Sequence: Title -> Button
      Animated.sequence([
        // Title: Fade in
        Animated.timing(progressTitleFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Button: Fade in
        Animated.timing(progressButtonFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [stage]);

  async function loadData() {
    if (!user) return;
    try {
      const [profileData, tasksToday, allTasks, code] = await Promise.all([
        getProfile(user.id),
        getDailyTasks(user.id),
        getDailyTasks(user.id, null),
        ensureTwinCode(user.id)
      ]);
      
      setProfile(profileData);
      setCompletedTasks(tasksToday.filter(t => t.is_completed));
      setTwinCode(code);
      
      // Set previous est_days_remaining for comparison
      if (profileData?.est_days_remaining) {
        setPreviousEstDays(typeof profileData.est_days_remaining === 'number' ? profileData.est_days_remaining : parseInt(profileData.est_days_remaining, 10));
      }
      
      // Process history
      const grouped: Record<string, boolean> = {};
      allTasks.forEach(t => {
        if (!grouped[t.scheduled_date]) grouped[t.scheduled_date] = true;
        if (!t.is_completed) grouped[t.scheduled_date] = false;
      });
      setHistory(grouped);

      // Active streak calculation (Duolingo-style)
      // Count consecutive days backwards from today/yesterday
      // If any day is missed, streak resets to 0
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Start from today
      let curr = new Date(today);
      const todayStr = curr.toISOString().split('T')[0];
      
      // Check if today has completed tasks
      if (grouped[todayStr]) {
        // Start counting from today
        streak = 1;
        curr.setDate(curr.getDate() - 1);
      } else {
        // Today not completed yet, check yesterday
        curr.setDate(curr.getDate() - 1);
        const yesterdayStr = curr.toISOString().split('T')[0];
        
        if (grouped[yesterdayStr]) {
          // Start counting from yesterday
          streak = 1;
          curr.setDate(curr.getDate() - 1);
        } else {
          // Yesterday also not completed, streak is 0
          setStreakNumber(0);
          return;
        }
      }
      
      // Continue counting backwards until we hit a missed day
      while (true) {
        const d = curr.toISOString().split('T')[0];
        if (grouped[d]) {
          streak++;
          curr.setDate(curr.getDate() - 1);
        } else {
          // Hit a missed day, stop counting
          break;
        }
      }
      
      setStreakNumber(streak);
    } catch (e) {
      console.error(e);
    }
  }

  const transitionTo = useCallback((nextStage: Stage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Hide all buttons immediately when transitioning
    buttonFadeAnim.setValue(0);
    calendarButtonFadeAnim.setValue(0);
    journalButtonFadeAnim.setValue(0);
    progressButtonFadeAnim.setValue(0);
    
    // Fade out and slide left
    Animated.parallel([
      Animated.timing(stageFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(stageSlideAnim, {
        toValue: -20,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setStage(nextStage);
      // Reset slide position to right
      stageSlideAnim.setValue(20);
      // Reset button animations for new stage
      if (nextStage === 'streak') {
        buttonFadeAnim.setValue(0);
      } else if (nextStage === 'calendar') {
        calendarDotsAnim.setValue(0);
        calendarButtonFadeAnim.setValue(0);
      } else if (nextStage === 'journal') {
        journalInputFadeAnim.setValue(0);
        journalButtonFadeAnim.setValue(0);
      } else if (nextStage === 'progress') {
        progressButtonFadeAnim.setValue(0);
      }
      // Fade in and slide to center
      Animated.parallel([
        Animated.timing(stageFadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(stageSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    });
  }, [stageFadeAnim, stageSlideAnim, buttonFadeAnim, calendarButtonFadeAnim, journalButtonFadeAnim, progressButtonFadeAnim, calendarDotsAnim, journalInputFadeAnim]);

  async function handleContinue() {
    if (stage === 'streak') {
      transitionTo('calendar');
    } else if (stage === 'calendar') {
      transitionTo('journal');
    } else if (stage === 'journal') {
      if (!journalText.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      
      setIsSubmitting(true);
      try {
        const { increments: incs, rationale: rat, est_days_remaining } = await calculateArchitectProgress(
          profile,
          completedTasks,
          journalText
        );
        
        setIncrements(incs);
        setRationale(rat);
        
        // Compare with previous value to show arrow
        const newEstDays = est_days_remaining || '---';
        const newEstDaysNum = typeof newEstDays === 'number' ? newEstDays : (typeof newEstDays === 'string' && newEstDays !== '---' ? parseInt(newEstDays, 10) : null);
        
        if (previousEstDays !== null && newEstDaysNum !== null && newEstDaysNum < previousEstDays) {
          setDaysDecreased(true);
          setDaysDecreasedBy(previousEstDays - newEstDaysNum);
        } else {
          setDaysDecreased(false);
          setDaysDecreasedBy(0);
        }
        
        setEstDays(newEstDays);
        setPreviousEstDays(newEstDaysNum);

        const currentProgress = profile.dream_self_progress || {
          "Financial": 0, "Personal": 0, "Lifestyle": 0, "Health": 0, "Growth": 0
        };
        const newProgress = { ...currentProgress };
        Object.entries(incs).forEach(([category, increment]) => {
          const cat = category === "Career" ? "Financial" : category;
          if (newProgress[cat] !== undefined) {
            newProgress[cat] = Math.min(100, (newProgress[cat] || 0) + (increment as number));
          }
        });

        await updateProfileFields(user!.id, { 
          dream_self_progress: newProgress,
          est_days_remaining: est_days_remaining
        });

        try {
          await saveArchitectFeedback(user!.id, journalText, completedTasks.length);
        } catch (e) { 
          // Table might not exist yet, that's okay - continue without saving feedback
          console.warn('Could not save architect feedback (table may not exist):', e);
        }

        const nextTasks = await generateArchitectPlan(
          profile,
          profile.dream_vision,
          completedTasks.map(t => t.task_content),
          journalText
        );
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const tasksWithDate = nextTasks.map(t => ({ ...t, scheduled_date: tomorrowStr }));
        await saveDailyTasks(user!.id, tasksWithDate);

        setIsSubmitting(false);
        transitionTo('progress');
      } catch (error) {
        console.error(error);
        setIsSubmitting(false);
        alert("Something went wrong. Please try again.");
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.replace('/(tabs)/home');
    }
  }

  const firstName = profile?.first_name || 'Friend';
  const hometown = profile?.hometown || profile?.current_location || 'Unknown';
  const onboardingResponses = profile?.core_json?.onboarding_responses || {};
  const coreJson = profile?.core_json || {};
  
  let birthYearStr = onboardingResponses['birth-year'] || 
                     onboardingResponses['birth_year'] || 
                     onboardingResponses['birthYear'] ||
                     coreJson['birth-year'] ||
                     coreJson['birth_year'] ||
                     coreJson['birthYear'] ||
                     profile?.birth_year ||
                     null;

  if (birthYearStr) {
    birthYearStr = String(birthYearStr).replace(/[^0-9]/g, '');
  }

  const birthYear = birthYearStr ? parseInt(birthYearStr, 10) : null;
  const currentYear = new Date().getFullYear();
  const age = birthYear && !isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear 
    ? currentYear - birthYear 
    : null;

  const status = profile?.relationships?.length > 0 ? 'Connected' : 'Single';

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <View style={styles.nameRow}>
          <Text style={styles.headerName}>{firstName}</Text>
        </View>
        <View style={styles.locationRow}>
          <MapPin size={14} color={Colors.textSecondary} />
          <Text style={styles.headerLocation}>{hometown}</Text>
          {age && <Text style={styles.headerAge}> • Age {age}</Text>}
        </View>
        <View style={styles.tagsRow}>
          <HeaderTag icon={<Heart size={10} color="#696969" />} text={status} />
          {age && <HeaderTag icon={<User size={10} color="#696969" />} text={`Age ${age}`} />}
        </View>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.twinCodeContainer}>
          <Text style={styles.twinCodeText}>mora#: {twinCode}</Text>
        </View>
        <Animated.View 
          style={[
            styles.headerImageContainer,
            {
              opacity: imageFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
              transform: [{ translateY: imageSlideAnim }]
            }
          ]}
        >
          <Image 
            source={require('@/assets/images/manwhite.png')} 
            style={[styles.headerImage, { transform: [{ scaleX: -1 }] }]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );

  const renderStreak = () => {
    const flameRotation = flameRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['-15deg', '15deg'],
    });

    return (
      <View style={styles.stageContainer}>
        <View style={styles.flameContainer}>
          <Animated.View
            style={[
              styles.flameCircleAnimated,
              {
                transform: [
                  { scale: flameScaleAnim },
                  { rotate: flameRotation },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#A78BFA', '#F472B6']}
              style={styles.flameCircle}
            />
          </Animated.View>
          <Animated.View
            style={{
              transform: [
                { scale: flameScaleAnim },
                { rotate: flameRotation },
              ],
            }}
          >
            <Flame size={100} color="#FFFFFF" fill="#FFFFFF" />
          </Animated.View>
          <Animated.View
            style={[
              styles.streakBadge,
              {
                transform: [
                  { scale: badgeScaleAnim },
                ],
              },
            ]}
          >
            <Text style={styles.streakNumber}>{streakCount}</Text>
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: titleFadeAnim }}>
          <LigatureFreeText text="Day Streak!" style={styles.stageTitle} />
        </Animated.View>
        <Animated.View style={{ opacity: subtitleFadeAnim }}>
          <LigatureFreeText text="You're building momentum towards your dream self." style={styles.stageSubtitle} />
        </Animated.View>
      </View>
    );
  };

  const renderCalendar = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = [...Array(7)].map((_, i) => addDays(start, i));

    return (
      <View style={styles.stageContainer}>
        <Animated.View style={{ opacity: calendarTitleFadeAnim }}>
          <LigatureFreeText text="Consistency is Key" style={styles.stageTitle} />
        </Animated.View>
        <Animated.View style={{ opacity: calendarSubtitleFadeAnim }}>
          <LigatureFreeText text="Every dot is a step closer to your vision." style={styles.stageSubtitle} />
        </Animated.View>
        
        <Animated.View style={[styles.miniCalendar, { opacity: calendarDotsAnim }]}>
          {weekDays.map((day, i) => {
            const dateStr = day.toISOString().split('T')[0];
            const isDone = history[dateStr];
            const isToday = isSameDay(day, new Date());
            
            return (
              <View key={i} style={styles.calendarDay}>
                <Text style={styles.dayLabel}>{format(day, 'E').charAt(0)}</Text>
                <View style={[
                  styles.dayDot,
                  isDone && styles.dayDotDone,
                  isToday && styles.dayDotToday
                ]}>
                  {isDone ? (
                    <CheckCircle2 size={18} color="#FFFFFF" />
                  ) : isToday ? (
                    <View style={styles.todayInnerDot} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </Animated.View>
      </View>
    );
  };

  const renderJournal = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stageContainer}
    >
      <Animated.View
        style={{
          transform: [{ scale: journalIconScaleAnim }],
        }}
      >
        <Image
          source={require('@/assets/images/cube.png')}
          style={styles.journalIconImage}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={{ opacity: journalTitleFadeAnim }}>
        <LigatureFreeText text="Archetype Feedback" style={styles.stageTitle} />
      </Animated.View>
      <Animated.View style={{ opacity: journalSubtitleFadeAnim }}>
        <LigatureFreeText text="How did today's actions feel? Anything else I should be aware about in your life?" style={styles.stageSubtitle} />
      </Animated.View>
      
      <Animated.View style={[styles.journalInputWrapper, { opacity: journalInputFadeAnim }]}>
        <TextInput
          style={styles.journalInput}
          placeholder="Write your thoughts here..."
          placeholderTextColor="rgba(0,0,0,0.2)"
          multiline
          value={journalText}
          onChangeText={setJournalText}
          autoFocus
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );

  const renderProgress = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: progressTitleFadeAnim }}>
        <Text style={styles.progressTitle}>Architect's Evaluation</Text>
      </Animated.View>
      
      <View style={styles.estDaysCard}>
        <Text style={styles.estDaysLabelLarge}>Distance to Dream Self</Text>
        <View style={styles.estDaysValueRow}>
          <Text style={styles.estDaysValueLarge}>{estDays}</Text>
          <Text style={styles.estDaysUnit}>Days</Text>
          {daysDecreased && (
            <View style={styles.arrowContainer}>
              <ArrowDown size={20} color="#4ADE80" />
              <Text style={styles.daysDecreasedText}>-{daysDecreasedBy}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rationaleCard}>
        <Text style={styles.rationaleText}>{rationale}</Text>
      </View>

      <View style={styles.progressList}>
        {Object.entries(increments).map(([cat, inc]: [string, any]) => (
          <View key={cat} style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{cat}</Text>
              <Text style={styles.progressValue}>+{inc.toFixed(1)} pts</Text>
            </View>
            <ProgressBar 
              progress={(profile?.dream_self_progress?.[cat] || 0) / 100}
              showLabel={false}
              height={12}
              gradientColors={['#25729f', '#62edb9']}
              trackColor="rgba(0,0,0,0.05)"
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: stageFadeAnim,
              transform: [{ translateX: stageSlideAnim }]
            }
          ]}
        >
          {stage === 'streak' && renderStreak()}
          {stage === 'calendar' && renderCalendar()}
          {stage === 'journal' && renderJournal()}
          {stage === 'progress' && renderProgress()}
        </Animated.View>

        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: stage === 'streak' ? buttonFadeAnim :
                       stage === 'calendar' ? calendarButtonFadeAnim :
                       stage === 'journal' ? journalButtonFadeAnim :
                       stage === 'progress' ? progressButtonFadeAnim : 0
            }
          ]}
        >
          <Pressable 
            onPress={handleContinue} 
            style={({ pressed }) => [
              styles.ctaButtonWrapper,
              isSubmitting && { opacity: 0.7 },
              {
                shadowColor: stage === 'streak' ? '#A78BFA' : 
                            stage === 'calendar' ? '#A78BFA' :
                            stage === 'journal' ? '#F472B6' : '#25729f',
                transform: [{ translateY: pressed ? 2 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                shadowOpacity: pressed ? 0.3 : 0.5,
                shadowRadius: pressed ? 8 : 20,
                elevation: pressed ? 4 : 12,
              }
            ]}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={stage === 'streak' ? ['#A78BFA', '#F472B6'] : 
                      stage === 'calendar' ? ['#A78BFA', '#C084FC'] :
                      stage === 'journal' ? ['#F472B6', '#FB7185'] : ['#25729f', '#62edb9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.ctaButtonGradient}
            >
              <Text style={styles.ctaText}>
                {isSubmitting ? "Evaluating..." : (stage === 'progress' ? "Finish" : "Continue")}
              </Text>
              {!isSubmitting && <ChevronRight size={20} color="#FFFFFF" />}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function HeaderTag({ icon, text }: { icon: any, text: string }) {
  return (
    <LinearGradient
      colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerTag}
    >
      {icon}
      <Text style={styles.headerTagText}>{text}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  stageContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stageTitle: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, fontFamily: Fonts.primary.regular, marginTop: 24, textAlign: 'center' },
  stageSubtitle: { fontSize: 16, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, marginTop: 12, textAlign: 'center', marginBottom: 40, lineHeight: 22, letterSpacing: 1 },
  
  // Header Section (from twin-reveal)
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 32,
    marginBottom: 0,
    height: 180,
    position: 'relative',
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 16,
    zIndex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    zIndex: 2,
  },
  headerName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: -0.5,
    zIndex: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerLocation: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
  },
  headerAge: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  headerTag: {
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
  headerTagText: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 15,
    color: '#696969',
  },
  headerRight: {
    width: 240,
    height: '140%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: -40,
    bottom: -40,
    zIndex: 0,
  },
  headerImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  twinCodeContainer: {
    position: 'absolute',
    top: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  twinCodeText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.15)',
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
  },

  flameContainer: { position: 'relative', width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  flameCircleAnimated: { position: 'absolute', width: 160, height: 160 },
  flameCircle: { width: 160, height: 160, borderRadius: 80, opacity: 0.1 },
  streakBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#FFFFFF', borderRadius: 25, width: 50, height: 50, alignItems: 'center', justifyContent: 'center', shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  streakNumber: { fontSize: 24, fontWeight: '900', color: '#A78BFA' },
  
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 0, 0, 0.02)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.05)' },
  
  journalIconImage: { width: 100, height: 100 },
  
  miniCalendar: { flexDirection: 'row', gap: 12, marginTop: 20, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
  calendarDay: { alignItems: 'center', gap: 10 },
  dayLabel: { color: Colors.textTertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  dayDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'rgba(0,0,0,0.02)', alignItems: 'center', justifyContent: 'center' },
  dayDotDone: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  dayDotToday: { borderColor: '#25729f', borderWidth: 2 },
  todayInnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#25729f' },

  journalInputWrapper: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 32, padding: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
  journalInput: { width: '100%', minHeight: 180, padding: 24, color: Colors.textPrimary, fontSize: 17, fontFamily: Fonts.secondary.regular, textAlignVertical: 'top' },

  scrollContent: { paddingTop: 20, paddingBottom: 120 },
  progressTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 24, fontFamily: Fonts.primary.regular },
  estDaysCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 32, 
    borderRadius: 32, 
    alignItems: 'center', 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4
  },
  estDaysLabelLarge: { color: Colors.textTertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: Fonts.secondary.bold },
  estDaysValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  estDaysValueLarge: { color: Colors.textPrimary, fontSize: 56, fontWeight: '800', fontFamily: Fonts.secondary.bold },
  estDaysUnit: { color: Colors.textTertiary, fontSize: 20, fontWeight: '600', fontFamily: Fonts.secondary.bold },
  arrowContainer: { marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  daysDecreasedText: { fontSize: 16, fontWeight: '700', color: '#4ADE80', fontFamily: Fonts.secondary.bold },
  
  rationaleCard: { backgroundColor: '#FAFAFA', padding: 20, borderRadius: 24, flexDirection: 'row', gap: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 32 },
  rationaleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 },
  rationaleText: { flex: 1, color: Colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: Fonts.secondary.regular, letterSpacing: 0.5 },
  
  progressList: { gap: 20 },
  progressItem: { gap: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: Colors.textTertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.secondary.bold },
  progressValue: { color: '#25729f', fontSize: 14, fontWeight: '800', fontFamily: Fonts.secondary.bold },

  footer: { padding: 24, paddingBottom: 40 },
  ctaButtonWrapper: {
    borderRadius: 28,
    overflow: 'visible',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 28,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});