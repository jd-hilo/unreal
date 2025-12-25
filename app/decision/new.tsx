import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Image, Modal, ActivityIndicator, Animated, Easing } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { SwipeableOptionCard } from '@/components/SwipeableOptionCard';
import { ArrowLeft, ChevronRight, X, UserPlus, Clock, Sparkles, Check, Plus } from 'lucide-react-native';
import { insertDecision, updateDecisionPrediction, getUserByTwinCode, addDecisionParticipant } from '@/lib/storage';
import { predictDecision, generateInterestingDecisionQuestions } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProgressBar } from '@/components/ProgressBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/Button';
import { Colors, Fonts } from '@/constants/Theme';

const TOTAL_STEPS = 4;

export default function NewDecisionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ question?: string; autoSubmit?: string }>();
  const user = useAuth((state) => state.user);
  const autoSubmit = params.autoSubmit === 'true';
  const autoSubmitStarted = useRef(false);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const questionInputRef = useRef<TextInput>(null);
  
  // Form data
  const [question, setQuestion] = useState(params.question || '');
  const [derivedOptions, setDerivedOptions] = useState<string[]>([]);
  const [isDerivingOptions, setIsDerivingOptions] = useState(false);
  const [loading, setLoading] = useState(autoSubmit); // Show loading immediately if autoSubmit
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  const LOADING_STEPS = [
    "Creating your decision...",
    "Analyzing your profile...",
    "Building context...",
    "Consulting your twin...",
    "Calculating probabilities...",
    "Finalizing recommendation..."
  ];
  
  // Twin management
  const [showTwinModal, setShowTwinModal] = useState(false);
  const [twinCode, setTwinCode] = useState('');
  const [twinCodeError, setTwinCodeError] = useState('');
  const [lookingUpTwin, setLookingUpTwin] = useState(false);
  const [addedTwins, setAddedTwins] = useState<Array<{ userId: string; name: string; code: string }>>([]);
  const [recentTwins, setRecentTwins] = useState<Array<{ userId: string; name: string; code: string }>>([]);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [editingOptionText, setEditingOptionText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    loadRecentTwins();
    
    // Keyboard listeners for modal positioning
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Handle autoSubmit - process everything in background and show loading screen
  useEffect(() => {
    if (autoSubmit && user && !autoSubmitStarted.current) {
      autoSubmitStarted.current = true;
      setLoading(true);

      const processAutoSubmit = async () => {
        try {
          let questionToUse = params.question?.trim() || '';

          // Generate question if not provided
          if (!questionToUse) {
            const corePack = await buildCorePack(user.id);
            const questions = await generateInterestingDecisionQuestions(corePack, 3);
            questionToUse = questions[0] || 'Should I make this change?';
          }

          setQuestion(questionToUse);

          // Derive options
          const corePack = await buildCorePack(user.id);
          const { deriveDecisionOptionsWithContext } = await import('@/lib/ai');
          const options = await deriveDecisionOptionsWithContext(questionToUse, corePack);
          setDerivedOptions(options);

          // Submit
          if (!user || !questionToUse.trim() || options.length < 2) {
            setLoading(false);
            setCurrentStep(1);
            return;
          }

          try {
            const decision = await insertDecision(user.id, {
              question: questionToUse.trim(),
              options: options,
              status: 'pending',
            });

            trackEvent(MixpanelEvents.DECISION_CREATED, {
              decision_id: decision.id,
              num_options: options.length,
              has_participants: false,
              num_participants: 0
            });

            const relevancePack = await buildRelevancePack(user.id, questionToUse);
            const prediction = await predictDecision({
              corePack,
              relevancePack,
              question: questionToUse.trim(),
              options: options,
              participantCount: 1,
            });

            await updateDecisionPrediction(decision.id, prediction);

            trackEvent(MixpanelEvents.DECISION_ANALYZED, {
              decision_id: decision.id,
              predicted_option: prediction.prediction,
              confidence: Math.max(...Object.values(prediction.probs)),
              num_participants: 0
            });

            router.replace(`/decision/${decision.id}`);
          } catch (error) {
            console.error('Failed to create decision:', error);
            setLoading(false);
            // Fallback to form
            setCurrentStep(1);
          }
        } catch (error) {
          console.error('Failed to process autoSubmit:', error);
          setLoading(false);
          setCurrentStep(1);
        }
      };

      processAutoSubmit();
    } else if (params.question && params.question.trim() && currentStep === 1 && !autoSubmit) {
      // Normal flow: pre-fill question and auto-derive options
      setQuestion(params.question);
      const timer = setTimeout(() => {
        handleDeriveOptions();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoSubmit, params.question, user]);


  // Auto-focus question input when on step 1
  useEffect(() => {
    if (currentStep === 1 && !params.question) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        questionInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, params.question]);

  // Loading animation and steps
  useEffect(() => {
    if (loading) {
      setLoadingStepIndex(0);
      
      // Start pulse animation
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

      // Start rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Update loading steps
      const interval = setInterval(() => {
        setLoadingStepIndex((prev) => {
          if (prev < LOADING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);
      
      return () => {
        clearInterval(interval);
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
      };
    }
  }, [loading]);

  async function loadRecentTwins() {
    try {
      const stored = await AsyncStorage.getItem('recentTwins');
      if (stored) {
        setRecentTwins(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent twins:', error);
    }
  }

  async function saveRecentTwin(twin: { userId: string; name: string; code: string }) {
    try {
      const filtered = recentTwins.filter(t => t.userId !== twin.userId);
      const updated = [twin, ...filtered].slice(0, 5);
      setRecentTwins(updated);
      await AsyncStorage.setItem('recentTwins', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent twin:', error);
    }
  }

  // Transition to next step with animation
  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > TOTAL_STEPS) return;
    
    // Dismiss keyboard before transitioning
    Keyboard.dismiss();
    
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
      // Change step
      setCurrentStep(nextStep);
      
      // Reset position
      slideAnim.setValue(direction * 20);
      
      // Fade in and slide to center
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

  async function handleDeriveOptions() {
    Keyboard.dismiss();
    if (!question.trim()) return;

    setIsDerivingOptions(true);

    try {
      const { deriveDecisionOptionsWithContext } = await import('@/lib/ai');
      
      let context = '';
      if (addedTwins.length > 0 && user) {
        const allUserIds = [user.id, ...addedTwins.map(t => t.userId)];
        const { buildCorePack } = await import('@/lib/relevance');
        context = await buildCorePack(user.id, allUserIds);
      }
      
      const options = await deriveDecisionOptionsWithContext(question.trim(), context);
      setDerivedOptions(options);
      
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Automatically go to next step
      setTimeout(() => {
        goToStep(2);
      }, 300);
    } catch (error) {
      console.error('Option derivation error:', error);
      alert('Failed to analyze your question. Please try again.');
    } finally {
      setIsDerivingOptions(false);
    }
  }

  async function handleAddTwin() {
    if (!twinCode.trim() || twinCode.length !== 6) {
      setTwinCodeError('Please enter a valid 6-digit code');
      return;
    }

    if (addedTwins.length >= 1) {
      setTwinCodeError('You can only add one other twin per decision');
      setLookingUpTwin(false);
      return;
    }

    setLookingUpTwin(true);
    setTwinCodeError('');

    try {
      const twinProfile = await getUserByTwinCode(twinCode.trim());
      
      if (!twinProfile) {
        setTwinCodeError('Twin code not found');
        setLookingUpTwin(false);
        return;
      }

      if (twinProfile.user_id === user?.id) {
        setTwinCodeError('You cannot add your own twin');
        setLookingUpTwin(false);
        return;
      }

      const twinName = twinProfile.first_name || 'Someone';

      const newTwin = {
        userId: twinProfile.user_id,
        name: twinName,
        code: twinProfile.twin_code || twinCode.trim()
      };

      setAddedTwins([newTwin]);
      await saveRecentTwin(newTwin);
      setShowTwinModal(false);
      setTwinCode('');
      setTwinCodeError('');
      
      // Track twin added event
      trackEvent(MixpanelEvents.DECISION_TWIN_ADDED, {
        twin_code: twinCode.trim(),
        twin_name: twinName,
        method: 'code_entry',
      });
    } catch (error) {
      console.error('Error looking up twin:', error);
      setTwinCodeError('Failed to look up twin code');
    } finally {
      setLookingUpTwin(false);
    }
  }

  function handleRemoveTwin(userId: string) {
    setAddedTwins(addedTwins.filter(t => t.userId !== userId));
  }

  async function handleSelectRecentTwin(twin: { userId: string; name: string; code: string }) {
    if (twin.userId === user?.id) {
      setTwinCodeError('You cannot add your own twin');
      return;
    }

    setAddedTwins([twin]);
    setShowTwinModal(false);
    setTwinCode('');
    setTwinCodeError('');
    
    // Track twin added event
    trackEvent(MixpanelEvents.DECISION_TWIN_ADDED, {
      twin_code: twin.code,
      twin_name: twin.name,
      method: 'recent_twin',
    });
  }

  function handleDeleteOption(index: number) {
    const updated = derivedOptions.filter((_, i) => i !== index);
    setDerivedOptions(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleEditOption(index: number) {
    setEditingOptionIndex(index);
    setEditingOptionText(derivedOptions[index]);
  }

  function saveEditedOption() {
    if (editingOptionIndex !== null && editingOptionText.trim()) {
      const updated = [...derivedOptions];
      updated[editingOptionIndex] = editingOptionText.trim();
      setDerivedOptions(updated);
      setEditingOptionIndex(null);
      setEditingOptionText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    if (!user || !question.trim() || derivedOptions.length < 2) return;

    setLoading(true);

    try {
      console.log('Creating decision...');
      const decision = await insertDecision(user.id, {
        question: question.trim(),
        options: derivedOptions,
        status: 'pending',
      });

      console.log('Decision created:', decision.id);
      
      trackEvent(MixpanelEvents.DECISION_CREATED, {
        decision_id: decision.id,
        num_options: derivedOptions.length,
        has_participants: addedTwins.length > 0,
        num_participants: addedTwins.length
      });
      
      if (addedTwins.length > 0) {
        console.log('Adding participants to decision...');
        for (const twin of addedTwins) {
          await addDecisionParticipant(decision.id, twin.userId, user.id);
        }
      }

      console.log('Building Core Pack and Relevance Pack...');
      
      const allUserIds = [user.id, ...addedTwins.map(t => t.userId)];
      
      const corePack = await buildCorePack(user.id, allUserIds);
      const relevancePack = await buildRelevancePack(user.id, question);
      
      console.log('Core pack length:', corePack.length);
      console.log('Relevance pack length:', relevancePack.length);
      console.log('Number of twins involved:', allUserIds.length);
      console.log('Calling AI predictDecision...');

      const prediction = await predictDecision({
        corePack,
        relevancePack,
        question: question.trim(),
        options: derivedOptions,
        participantCount: allUserIds.length,
      });

      console.log('AI prediction received:', {
        prediction: prediction.prediction,
        probs: prediction.probs,
        uncertainty: prediction.uncertainty,
      });

      console.log('Saving prediction to database...');
      await updateDecisionPrediction(decision.id, prediction);

      trackEvent(MixpanelEvents.DECISION_ANALYZED, {
        decision_id: decision.id,
        predicted_option: prediction.prediction,
        confidence: Math.max(...Object.values(prediction.probs)),
        num_participants: addedTwins.length
      });

      console.log('Prediction saved. Navigating to result page...');
      
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      router.push(`/decision/${decision.id}`);
    } catch (error) {
      console.error('Decision error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Failed to process decision. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Step rendering
  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  }

  // Step 1: Enter Question
  function renderStep1() {
    return (
      <View style={styles.stepContainer}>
        <FloatingLabelInput
          ref={questionInputRef}
          label="Your question"
          value={question}
          onChangeText={setQuestion}
          multiline
          showCharCount
          maxCharCount={500}
          containerStyle={styles.questionInput}
          style={styles.questionInputText}
          returnKeyType="done"
        />
      </View>
    );
  }

  // Step 2: Review Options
  function renderStep2() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.optionsContainer}>
          {derivedOptions.map((option, index) => (
            <SwipeableOptionCard
              key={index}
              option={option}
              index={index}
              onDelete={() => handleDeleteOption(index)}
              onEdit={() => handleEditOption(index)}
              delay={index * 50}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleDeriveOptions}
          style={styles.regenerateButton}
          activeOpacity={0.7}
        >
          <Text style={styles.regenerateText}>↻ Regenerate</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Add Twin (Optional)
  function renderStep3() {
    return (
      <View style={styles.stepContainer}>
        {addedTwins.length > 0 ? (
          <View style={styles.twinAddedCard}>
            <View style={styles.twinAddedBlur}>
              <View style={styles.twinAddedContent}>
                <View style={styles.twinAddedInfo}>
                  <View style={styles.twinAddedIconContainer}>
                    <UserPlus size={20} color={Colors.textPrimary} />
                  </View>
                  <Text style={styles.twinAddedName}>{addedTwins[0].name} added</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleRemoveTwin(addedTwins[0].userId)}
                  style={styles.removeTwinButton}
                >
                  <X size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.collaboratorSection}>
            <TouchableOpacity
              onPress={() => setShowTwinModal(true)}
              style={styles.airbudsCard}
              activeOpacity={0.8}
            >
              <View style={styles.airbudsGradient}>
                <View style={styles.airbudsInner}>
                  <View style={styles.airbudsIconCircle}>
                    <Plus size={32} color={Colors.textPrimary} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.airbudsText}>Tap to invite</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Step 4: Review & Submit
  function renderStep4() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.reviewCard}>
          <View style={styles.reviewBlur}>
            <View style={styles.reviewContent}>
              <Text style={styles.reviewLabel}>Question</Text>
              <Text style={styles.reviewValue}>{question}</Text>

              <Text style={[styles.reviewLabel, styles.reviewLabelSpaced]}>
                Options ({derivedOptions.length})
              </Text>
              {derivedOptions.map((option, index) => (
                <View key={index} style={styles.reviewOption}>
                  <Text style={styles.reviewOptionNumber}>{index + 1}.</Text>
                  <Text style={styles.reviewOptionText}>{option}</Text>
                </View>
              ))}

              {addedTwins.length > 0 && (
                <>
                  <Text style={[styles.reviewLabel, styles.reviewLabelSpaced]}>
                    Collaborator
                  </Text>
                  <Text style={styles.reviewValue}>{addedTwins[0].name}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  const progress = currentStep / TOTAL_STEPS;
  const canProceedStep1 = question.trim().length > 10 && !isDerivingOptions;
  const canProceedStep2 = derivedOptions.length >= 2;
  const canProceedStep3 = true; // Optional step
  const canSubmit = !loading;

  const canProceed = 
    (currentStep === 1 && canProceedStep1) ||
    (currentStep === 2 && canProceedStep2) ||
    (currentStep === 3 && canProceedStep3) ||
    (currentStep === 4 && canSubmit);

  function getButtonLabel() {
    if (currentStep === 1) return isDerivingOptions ? 'Generating...' : 'Generate Options';
    if (currentStep === 4) return loading ? 'Analyzing...' : 'Ask My Twin';
    return 'Continue';
  }

  function handleNextStep() {
    if (!canProceed) return;
    
    if (currentStep === 1) {
      handleDeriveOptions();
    } else if (currentStep === 4) {
      handleSubmit();
    } else {
      goToStep(currentStep + 1);
    }
  }

  function getStepTitle() {
    switch (currentStep) {
      case 1: return "What's your decision?";
      case 2: return "Your options";
      case 3: return "Making a decision with someone?";
      case 4: return "Review";
      default: return "New Decision";
    }
  }

  function getStepSubtitle() {
    switch (currentStep) {
      case 1: return "Let your twin guide your decision";
      case 2: return "Review and edit your options";
      case 3: return "Add their twin below";
      case 4: return "Ready to analyze";
      default: return "";
    }
  }

  // Loading screen
  if (loading) {
    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingContainer}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
            <View style={styles.loadingContent}>
              {/* Animated Orb */}
              <View style={styles.orbContainer}>
                <Animated.View
                  style={[
                    styles.orbOuter,
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
                    style={styles.orbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.orbInner}>
                  <View style={styles.cubeShadowWrapper}>
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.loadingCubeIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Asking your twin...</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusBlur}>
                    <Text style={styles.statusText}>
                      {LOADING_STEPS[loadingStepIndex] || LOADING_STEPS[LOADING_STEPS.length - 1]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Loading Dots */}
              <View style={styles.dotsContainer}>
                {[0, 1, 2].map((index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: Colors.textSecondary,
                        transform: [
                          {
                            scale: pulseAnim.interpolate({
                              inputRange: [1, 1.1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                        opacity: pulseAnim.interpolate({
                          inputRange: [1, 1.1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.screen}>
        <View style={styles.backgroundGradient}>
          <StatusBar style="dark" />
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
                  <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <ProgressBar
                  progress={progress}
                  showLabel={false}
                  height={4}
                  gradientColors={['#febda1', '#febda1']}
                  trackColor="rgba(0,0,0,0.05)"
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
              <View style={[styles.floatingButtonContainer, keyboardVisible && { bottom: keyboardHeight }]}>
                {currentStep === 3 && (
                  <TouchableOpacity
                    onPress={() => goToStep(4)}
                    style={styles.skipButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipText}>Skip for now</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleNextStep}
                  disabled={!canProceed || loading || isDerivingOptions}
                  activeOpacity={0.9}
                  style={[
                    styles.floatingButtonWrapper,
                    (!canProceed || loading || isDerivingOptions) && styles.floatingButtonDisabled
                  ]}
                >
                  {canProceed && !loading && !isDerivingOptions ? (
                    <View
                      style={[
                        styles.floatingButton,
                        styles.floatingButtonActiveBorder,
                        { backgroundColor: '#febda1' }
                      ]}
                    >
                      {currentStep === 4 && (
                        <View style={styles.cubeIconShadowWrapper}>
                          <Image 
                            source={require('@/assets/images/cube.png')}
                            style={styles.cubeIcon}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                      <Text style={styles.floatingButtonText}>
                        {getButtonLabel()}
                      </Text>
                      <ChevronRight 
                        size={20} 
                        color="#FFFFFF" 
                      />
                    </View>
                  ) : (
                    <View style={styles.floatingButton}>
                      {currentStep === 4 && (
                        <View style={styles.cubeIconShadowWrapper}>
                          <Image 
                            source={require('@/assets/images/cube.png')}
                            style={styles.cubeIcon}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                      <Text style={[
                        styles.floatingButtonText,
                        styles.floatingButtonTextDisabled
                      ]}>
                        {loading || isDerivingOptions ? 'Processing...' : getButtonLabel()}
                      </Text>
                      {!loading && !isDerivingOptions && (
                        <ChevronRight 
                          size={20} 
                          color={Colors.textTertiary} 
                        />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </View>

      {/* Twin Code Modal */}
      <Modal
        visible={showTwinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTwinModal(false)}
      >
        <View style={[styles.modalOverlay, keyboardVisible && styles.modalOverlayKeyboard]}>
          <View style={styles.modalContent}>
            <View style={styles.modalBlur}>
              <View style={styles.modalInner}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Another Twin</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowTwinModal(false);
                      setTwinCode('');
                      setTwinCodeError('');
                    }}
                    style={styles.modalCloseButton}
                  >
                    <X size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  Enter someone's mora# — it is listed on their profile page. They will be included in the decision.
                </Text>

                {recentTwins.length > 0 && (
                  <View style={styles.recentTwinsSection}>
                    <View style={styles.recentTwinsHeader}>
                      <Clock size={14} color={Colors.textTertiary} />
                      <Text style={styles.recentTwinsLabel}>Recently added</Text>
                    </View>
                    <View style={styles.recentTwinsList}>
                      {recentTwins.map((twin) => (
                        <TouchableOpacity
                          key={twin.userId}
                          onPress={() => handleSelectRecentTwin(twin)}
                          style={styles.recentTwinChip}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.recentTwinName}>{twin.name}</Text>
                          <Text style={styles.recentTwinCode}>#{twin.code}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <FloatingLabelInput
                  label="Enter 6-digit code"
                  value={twinCode}
                  onChangeText={(text) => {
                    setTwinCode(text);
                    setTwinCodeError('');
                  }}
                  maxLength={6}
                  keyboardType="number-pad"
                  error={twinCodeError}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  onPress={handleAddTwin}
                  disabled={lookingUpTwin || twinCode.length !== 6}
                  style={[
                    styles.modalButtonWrapper,
                    (lookingUpTwin || twinCode.length !== 6) && styles.modalButtonDisabled
                  ]}
                  activeOpacity={0.9}
                >
                  <View style={styles.modalButton}>
                    {lookingUpTwin ? (
                      <ActivityIndicator size="small" color={Colors.textPrimary} />
                    ) : (
                      <Text style={styles.modalButtonText}>Add Twin</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Option Modal */}
      <Modal
        visible={editingOptionIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingOptionIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalBlur}>
              <View style={styles.modalInner}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Option</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setEditingOptionIndex(null);
                      setEditingOptionText('');
                    }}
                    style={styles.modalCloseButton}
                  >
                    <X size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <FloatingLabelInput
                  label="Option text"
                  value={editingOptionText}
                  onChangeText={setEditingOptionText}
                  multiline
                  showCharCount
                  maxCharCount={200}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  onPress={saveEditedOption}
                  disabled={!editingOptionText.trim()}
                  style={[
                    styles.modalButtonWrapper,
                    !editingOptionText.trim() && styles.modalButtonDisabled
                  ]}
                  activeOpacity={0.9}
                >
                  <View style={styles.modalButton}>
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
  },
  greetingRest: {
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  greetingSubtext: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '400',
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
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: Colors.background,
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  floatingButtonActiveBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  floatingButtonDisabled: {
    opacity: 0.5,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  cubeIconShadowWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  cubeIcon: {
    width: 22,
    height: 22,
  },
  stepContainer: {
    gap: 20,
  },
  stepCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  stepCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  stepCardContent: {
    padding: 22,
    zIndex: 1,
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
  stepIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  stepSubtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 24,
  },
  stepDescription: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.65)',
    lineHeight: 20,
    marginTop: 4,
  },
  questionInput: {
    marginTop: 4,
  },
  questionInputText: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 28,
    minHeight: 28,
  },
  optionsContainer: {
    gap: 0,
  },
  regenerateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 14,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  regenerateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  twinAddedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  twinAddedBlur: {
    backgroundColor: '#FFFFFF',
  },
  twinAddedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  twinAddedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  twinAddedName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  removeTwinButton: {
    padding: 4,
  },
  addTwinCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderStyle: 'dashed',
  },
  addTwinBlur: {
    backgroundColor: 'rgba(20, 18, 30, 0.3)',
  },
  addTwinContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  addTwinText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  collaboratorSection: {
    position: 'relative',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Airbuds style card
  airbudsCard: {
    width: 200,
    height: 200,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  airbudsGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  airbudsInner: {
    alignItems: 'center',
    gap: 16,
  },
  airbudsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  airbudsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  twinAddedIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  reviewBlur: {
    backgroundColor: '#FFFFFF',
  },
  reviewContent: {
    padding: 16,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  reviewLabelSpaced: {
    marginTop: 20,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 24,
    fontFamily: Fonts.secondary.bold,
  },
  reviewOption: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  reviewOptionNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  reviewOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 22,
    fontFamily: Fonts.secondary.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalOverlayKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalBlur: {
    backgroundColor: '#FFFFFF',
  },
  modalInner: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: Fonts.secondary.bold,
  },
  recentTwinsSection: {
    marginBottom: 20,
  },
  recentTwinsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  recentTwinsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
  },
  recentTwinsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentTwinChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentTwinName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  recentTwinCode: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  modalButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  modalButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  // Loading screen styles
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingSafeArea: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  orbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  orbOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  orbInner: {
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
  orbEmoji: {
    fontSize: 48,
  },
  cubeShadowWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  loadingCubeIcon: {
    width: 60,
    height: 60,
    opacity: 0.9,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Fonts.secondary.bold,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBlur: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
});
