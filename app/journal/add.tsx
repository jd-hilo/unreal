import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from 'react-native';
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
      await insertJournal(user.id, mood, text.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save journal entry');
      setSaving(false);
    }
  }

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
    return (
      <View style={styles.stepContainer}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        <FloatingLabelInput
          label="What's on your mind?"
          placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
          value={text}
          onChangeText={setText}
          multiline
          showCharCount
          maxCharCount={2000}
          containerStyle={styles.textInput}
          style={styles.notesTextArea}
        />
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
                activeOpacity={0.7}
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
                  <BlurView 
                    intensity={80} 
                    tint="dark" 
                    style={[
                      styles.moodCard,
                      isSelected && styles.moodCardSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={isSelected 
                        ? ['rgba(135, 206, 250, 0.15)', 'transparent'] 
                        : ['rgba(135, 206, 250, 0.05)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.glassHighlight}
                    />
                    <View style={styles.moodCardContent}>
                      <View style={[
                        styles.moodIconContainer,
                        isSelected && styles.moodIconContainerSelected
                      ]}>
                        <MoodIcon 
                          size={32} 
                          color={isSelected ? 'rgba(135, 206, 250, 0.9)' : moodOption.color} 
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
                  </BlurView>
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => currentStep > 1 ? goToStep(currentStep - 1) : router.back()} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>New Journal Entry</Text>
          <Text style={styles.subtitle}>Step {currentStep} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={progress} showLabel={false} />
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
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

        {/* Action Button */}
        <View style={styles.floatingButtonContainer}>
          <View style={styles.floatingButtonWrapper}>
            <BlurView 
              intensity={80} 
              tint="dark" 
              style={[
                styles.floatingButton,
                !canProceed && styles.floatingButtonDisabled
              ]}
            >
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
                onPress={handleNextStep}
                disabled={!canProceed}
                activeOpacity={0.9}
                style={styles.floatingButtonInner}
              >
                <Text style={styles.floatingButtonText}>
                  {getButtonLabel()}
                </Text>
                {!saving && <ChevronRight size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
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
    backgroundColor: '#0C0C10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 16,
    backgroundColor: '#0C0C10',
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
    color: '#FFFFFF',
    marginBottom: 0,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(135, 206, 250, 0.7)',
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(135, 206, 250, 0.15)',
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
    paddingBottom: 20,
  },
  animatedContent: {
    flex: 1,
  },
  stepContainer: {
    gap: 24,
  },
  stepHeader: {
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 16,
    color: 'rgba(135, 206, 250, 0.7)',
    lineHeight: 24,
    fontWeight: '500',
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
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  moodCardSelected: {
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 250, 0.5)',
    backgroundColor: 'rgba(20, 30, 50, 0.4)',
    shadowColor: 'rgba(135, 206, 250, 0.4)',
    shadowRadius: 12,
    elevation: 6,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
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
    backgroundColor: 'rgba(20, 30, 50, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
  },
  moodIconContainerSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  moodTextContainer: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(220, 220, 220, 0.85)',
  },
  moodLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedIndicator: {
    marginLeft: 'auto',
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(135, 206, 250, 0.9)',
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
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
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  floatingButtonDisabled: {
    opacity: 0.6,
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
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
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
  },
});
