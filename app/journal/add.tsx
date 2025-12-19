import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, TextInput, Image, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/useAuth';
import { insertJournal, getTodayJournal } from '@/lib/storage';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { Smile, Meh, Frown, SmilePlus, Angry, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ProgressBar } from '@/components/ProgressBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors, Fonts } from '@/constants/Theme';

const MOODS = [
  { value: 5, label: 'Amazing', icon: SmilePlus, color: '#10B981' },
  { value: 4, label: 'Good', icon: Smile, color: '#34D399' },
  { value: 3, label: 'Okay', icon: Meh, color: '#F59E0B' },
  { value: 2, label: 'Not great', icon: Frown, color: '#F97316' },
  { value: 1, label: 'Rough', icon: Angry, color: '#EF4444' },
  { value: 0, label: 'Very rough', icon: Angry, color: '#DC2626' },
];

const PLACEHOLDER_PROMPTS = [
  "What made today meaningful?",
  "What challenged you today?",
  "What are you grateful for?",
  "What did you learn today?",
  "How did you grow today?",
  "What's on your mind right now?",
];

const TOTAL_STEPS = 2;

export default function AddJournalScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Form data
  const [mood, setMood] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Completion screen animations
  const completionProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressScaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkTodayJournal() {
      if (!user) return;
      
      try {
        const todayJournal = await getTodayJournal(user.id);
        if (todayJournal) {
          router.replace(`/journal/${todayJournal.id}` as any);
        }
      } catch (error) {
        console.error('Failed to check today journal:', error);
      }
    }
    
    checkTodayJournal();
  }, [user]);

  // Transition to next step with animation
  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > TOTAL_STEPS) return;
    
    const direction = nextStep > currentStep ? 1 : -1;
    
    // Fade out and slide
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -direction * 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(direction * 20);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleSave() {
    if (!user) {
      setError('You must be signed in');
      return;
    }

    if (mood === null) {
      setError('Please select how you\'re feeling');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const journal = await insertJournal(user.id, mood, text.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Track journal creation
      trackEvent(MixpanelEvents.JOURNAL_ENTRY_CREATED, {
        journal_id: journal?.id,
        mood,
        text_length: text.trim().length,
        has_text: text.trim().length > 0,
      });
      
      // Show completion screen
      setShowCompletion(true);
      setSaving(false);
      
      // Reset progress to 0, then animate
      completionProgress.setValue(0);
      progressScaleAnim.setValue(1);
      flashAnim.setValue(0);
      
      // Animate progress bar
      Animated.sequence([
        Animated.timing(completionProgress, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Haptic feedback when progress completes
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Explosion effect
        Animated.parallel([
          // Scale bounce progress bar
          Animated.sequence([
            Animated.timing(progressScaleAnim, {
              toValue: 1.2,
              duration: 100,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.spring(progressScaleAnim, {
              toValue: 1,
              friction: 4,
              tension: 100,
              useNativeDriver: true,
            })
          ]),
          // Flash effect
          Animated.sequence([
            Animated.timing(flashAnim, {
              toValue: 0.3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(flashAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          ]),
          // Scale up orb again
          Animated.sequence([
             Animated.timing(scaleAnim, {
              toValue: 1.3,
              duration: 150,
              useNativeDriver: true,
             }),
             Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
             })
          ])
        ]).start();
        
        // Navigate back after showing completion
        setTimeout(() => {
          router.back();
        }, 1800);
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save journal entry');
      setSaving(false);
    }
  }
  
  // Completion screen animations
  useEffect(() => {
    if (showCompletion) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Explosion scale animation
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCompletion]);

  // Step rendering
  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return null;
    }
  }

  // Step 1: Text Entry (Apple Notes Style)
  function renderStep1() {
    const charCount = text.length;
    const isOverLimit = charCount > 2000;
    
    return (
      <View style={styles.stepContainerFullScreen}>
        <View style={styles.dateHeaderFullScreen}>
          <Text style={styles.dateTextFullScreen}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        <TextInput
          placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          value={text}
          onChangeText={setText}
          multiline
          style={styles.notesTextAreaFullScreen}
          autoFocus
        />
        
        <View style={styles.charCountContainer}>
          <Text style={[styles.charCountText, isOverLimit && styles.charCountError]}>
            {charCount}/2000
          </Text>
        </View>
      </View>
    );
  }

  // Step 2: Mood Selection
  function renderStep2() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>How are you feeling?</Text>
          <Text style={styles.stepSubtitle}>
            Select your current mood
          </Text>
        </View>

        <View style={styles.moodsList}>
          {MOODS.map((moodOption, index) => {
            const MoodIcon = moodOption.icon;
            const isSelected = mood === moodOption.value;
            return (
              <TouchableOpacity
                key={moodOption.value}
                style={styles.moodCardWrapper}
                onPress={() => {
                  setMood(moodOption.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.moodCardAnimated,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { 
                          scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          })
                        }
                      ],
                    },
                  ]}
                >
                  <View 
                    style={[
                      styles.moodCard,
                      isSelected && styles.moodCardSelected,
                    ]}
                  >
                    <View style={styles.moodCardContent}>
                      <View style={[
                        styles.moodIconContainer,
                        isSelected && styles.moodIconContainerSelected
                      ]}>
                        <MoodIcon 
                          size={32} 
                          color={isSelected ? Colors.textPrimary : moodOption.color} 
                        />
                      </View>
                      <View style={styles.moodTextContainer}>
                        <Text style={[
                          styles.moodLabel,
                          isSelected && styles.moodLabelSelected
                        ]}>
                          {moodOption.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <View style={styles.selectedDot} />
                        </View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;
  const canProceedStep1 = text.trim().length > 0;
  const canProceedStep2 = mood !== null && !saving;

  const canProceed = 
    (currentStep === 1 && canProceedStep1) ||
    (currentStep === 2 && canProceedStep2);

  function getButtonLabel() {
    if (currentStep === 1) return 'Continue';
    return saving ? 'Saving...' : 'Save Entry';
  }

  function handleNextStep() {
    if (!canProceed) return;
    
    if (currentStep === 1) {
      goToStep(2);
    } else if (currentStep === 2) {
      handleSave();
    }
  }

  // Completion screen
  if (showCompletion) {
    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const progressWidth = completionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.completionScreen}>
        <View style={styles.completionContainer}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.completionSafeArea} edges={['top', 'left', 'right']}>
            <View style={styles.completionContent}>
              {/* Animated Orb */}
              <View style={styles.completionOrbContainer}>
                <Animated.View
                  style={[
                    styles.completionOrbOuter,
                    {
                      transform: [
                        { scale: pulseAnim },
                        { rotate: rotateInterpolate },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={Colors.gradients.turquoise}
                    style={styles.completionOrbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.completionOrbInner,
                    {
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.completionCubeIcon}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>

              {/* Completion Text */}
              <View style={styles.completionTextContainer}>
                <Text style={styles.completionTitle}>Daily Journal Complete</Text>
                <Text style={styles.completionSubtitle}>Your twin just learned more about you</Text>
              </View>

              {/* Progress Bar */}
              <Animated.View style={[
                styles.completionProgressContainer,
                { transform: [{ scale: progressScaleAnim }] }
              ]}>
                <View style={styles.completionProgressTrack}>
                  <Animated.View
                    style={[
                      styles.completionProgressFill,
                      {
                        width: progressWidth,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={Colors.gradients.turquoise}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>
              </Animated.View>
            </View>
            
            {/* Flash Overlay */}
            <Animated.View 
              style={[
                StyleSheet.absoluteFill, 
                { 
                  backgroundColor: 'white', 
                  opacity: flashAnim,
                  pointerEvents: 'none'
                }
              ]} 
            />
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Minimal Header - only show on step 1 */}
      {currentStep === 1 ? (
        <View style={styles.minimalHeader}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            onPress={handleNextStep}
            disabled={!canProceed}
            style={styles.saveButton}
          >
            <Text style={[styles.saveButtonText, !canProceed && styles.saveButtonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Back Button and Progress Bar for step 2 */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => goToStep(currentStep - 1)} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={progress} 
              showLabel={false} 
              trackColor="rgba(0,0,0,0.05)"
            />
          </View>
        </>
      )}

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            currentStep === 1 && styles.contentContainerFullScreen
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.animatedContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        {/* Action Button - only show on step 2 */}
        {currentStep === 2 && (
          <View style={styles.floatingButtonContainer}>
            <View style={styles.floatingButtonWrapper}>
              <View 
                style={[
                  styles.floatingButton,
                  !canProceed && styles.floatingButtonDisabled
                ]}
              >
                <TouchableOpacity
                  onPress={handleNextStep}
                  disabled={!canProceed}
                  activeOpacity={0.9}
                  style={styles.floatingButtonInner}
                >
                  <Text style={styles.floatingButtonText}>
                    {getButtonLabel()}
                  </Text>
                  {!saving && <ChevronRight size={20} color={Colors.textPrimary} />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  minimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerSpacer: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  saveButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 0,
    letterSpacing: -0.3,
    fontFamily: Fonts.secondary.bold,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  contentContainerFullScreen: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    flexGrow: 1,
  },
  animatedContent: {
    flex: 1,
  },
  stepContainer: {
    gap: 24,
  },
  stepContainerFullScreen: {
    flex: 1,
    paddingTop: 8,
  },
  dateHeaderFullScreen: {
    marginBottom: 16,
    alignItems: 'center',
  },
  dateTextFullScreen: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 0.3,
    fontFamily: Fonts.secondary.bold,
  },
  textInputFullScreen: {
    marginTop: 0,
  },
  notesTextAreaFullScreen: {
    fontSize: 17,
    lineHeight: 26,
    minHeight: 400,
    color: Colors.textPrimary,
    flex: 1,
    textAlignVertical: 'top',
    fontFamily: Fonts.secondary.bold,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    paddingBottom: 20,
  },
  charCountText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  charCountError: {
    color: '#EF4444',
  },
  stepHeader: {
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 8,
    letterSpacing: -0.3,
    fontFamily: Fonts.secondary.bold,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  dateHeader: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    marginTop: 4,
  },
  notesTextArea: {
    fontSize: 17,
    lineHeight: 26,
    minHeight: 200,
  },
  moodsList: {
    gap: 12,
  },
  moodCardWrapper: {
    marginBottom: 0,
  },
  moodCardAnimated: {
    borderRadius: 16,
  },
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  moodCardSelected: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FFFFFF',
  },
  moodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  moodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodIconContainerSelected: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  moodTextContainer: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  moodLabelSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  selectedIndicator: {
    marginLeft: 'auto',
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textPrimary,
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingButton: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  floatingButtonDisabled: {
    opacity: 0.5,
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  // Completion screen styles
  completionScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  completionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  completionSafeArea: {
    flex: 1,
  },
  completionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completionOrbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 48,
  },
  completionOrbOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  completionOrbGradient: {
    width: '100%',
    height: '100%',
  },
  completionOrbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  completionCubeIcon: {
    width: 60,
    height: 60,
  },
  completionTextContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Fonts.secondary.bold,
  },
  completionSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  completionProgressContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  completionProgressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  completionProgressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
});
