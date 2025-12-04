import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/useAuth';
import { insertJournal, getTodayJournal } from '@/lib/storage';
import { Smile, Meh, Frown, SmilePlus, Angry, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ProgressBar } from '@/components/ProgressBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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

  function getStepTitle() {
    switch (currentStep) {
      case 1: return 'What\'s on your mind?';
      case 2: return 'How are you feeling?';
      default: return '';
    }
  }

  function getStepSubtitle() {
    switch (currentStep) {
      case 1: return 'Share your thoughts and experiences';
      case 2: return 'Select your current mood';
      default: return '';
    }
  }

  // Step 1: Text Entry
  function renderStep1() {
    const charCount = text.length;
    const isOverLimit = charCount > 2000;
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.textInputCardWrapper}>
          <View style={styles.textInputCard}>
            <TextInput
              placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={text}
              onChangeText={setText}
              multiline
              style={styles.textInput}
              autoFocus
            />
            <View style={styles.charCountContainer}>
              <Text style={[styles.charCountText, isOverLimit && styles.charCountError]}>
                {charCount}/2000
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Step 2: Mood Selection
  function renderStep2() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.moodsList}>
          {MOODS.map((moodOption) => {
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
                <View style={[
                  styles.moodCard,
                  isSelected && styles.moodCardSelected
                ]}>
                  <View style={styles.moodCardContent}>
                    <View style={[
                      styles.moodIconContainer,
                      isSelected && styles.moodIconContainerSelected
                    ]}>
                      <MoodIcon 
                        size={24} 
                        color={isSelected ? '#87CEFA' : moodOption.color} 
                      />
                    </View>
                    <Text style={[
                      styles.moodLabel,
                      isSelected && styles.moodLabelSelected
                    ]}>
                      {moodOption.label}
                    </Text>
                    {isSelected && (
                      <ChevronRight size={20} color="#87CEFA" />
                    )}
                  </View>
                </View>
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
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <ProgressBar
                progress={progress}
                showLabel={false}
                height={4}
                gradientColors={['#87CEFA', '#87CEFA']}
              />
            </View>

            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>
                <Text style={styles.greetingRest}>{getStepTitle()}</Text>
              </Text>
              {getStepSubtitle() && (
                <Text style={styles.greetingSubtext}>{getStepSubtitle()}</Text>
              )}
            </View>

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

            {/* Floating Action Button */}
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity
                onPress={handleNextStep}
                disabled={!canProceed || saving}
                activeOpacity={0.9}
                style={[
                  styles.floatingButtonWrapper,
                  (!canProceed || saving) && styles.floatingButtonDisabled
                ]}
              >
                <LinearGradient
                  colors={canProceed && !saving ? ['rgba(65, 105, 225, 0.9)', 'rgba(30, 58, 138, 0.8)', 'rgba(65, 105, 225, 0.7)'] : ['rgba(100, 100, 100, 0.5)', 'rgba(80, 80, 80, 0.5)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.floatingButton,
                    canProceed && !saving && styles.floatingButtonActiveBorder
                  ]}
                >
                  <Text style={[
                    styles.floatingButtonText,
                    (!canProceed || saving) && styles.floatingButtonTextDisabled
                  ]}>
                    {getButtonLabel()}
                  </Text>
                  {canProceed && !saving && <ChevronRight size={20} color="#FFFFFF" />}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
    letterSpacing: -0.5,
  },
  greetingRest: {
    color: '#FFFFFF',
  },
  greetingSubtext: {
    color: '#999999',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  animatedContent: {
    flex: 1,
  },
  stepContainer: {
    gap: 20,
  },
  textInputCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  textInputCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    padding: 20,
    minHeight: 300,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 26,
    color: '#FFFFFF',
    flex: 1,
    textAlignVertical: 'top',
    minHeight: 200,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  charCountText: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.5)',
    fontWeight: '500',
  },
  charCountError: {
    color: '#EF4444',
  },
  moodsList: {
    gap: 12,
  },
  moodCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  moodCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  moodCardSelected: {
    borderWidth: 1,
    borderColor: '#87CEFA',
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
  },
  moodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  moodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodIconContainerSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
  },
  moodLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  moodLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(65, 105, 225, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  floatingButtonActiveBorder: {
    borderWidth: 1,
    borderColor: '#87CEFA',
  },
  floatingButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
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
