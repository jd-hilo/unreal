import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Image, Modal, ActivityIndicator, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { SwipeableOptionCard } from '@/components/SwipeableOptionCard';
import { ArrowLeft, ChevronRight, X, UserPlus, Clock, Sparkles, Check } from 'lucide-react-native';
import { insertDecision, updateDecisionPrediction, getUserByTwinCode, addDecisionParticipant } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { ProgressBar } from '@/components/ProgressBar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const TOTAL_STEPS = 4;

export default function NewDecisionScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const questionInputRef = useRef<TextInput>(null);
  
  // Form data
  const [question, setQuestion] = useState('');
  const [derivedOptions, setDerivedOptions] = useState<string[]>([]);
  const [isDerivingOptions, setIsDerivingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    loadRecentTwins();
    
    // Keyboard listeners for modal positioning
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-focus question input when on step 1
  useEffect(() => {
    if (currentStep === 1) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        questionInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

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
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>What's your decision?</Text>
        </View>

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
        />
      </View>
    );
  }

  // Step 2: Review Options
  function renderStep2() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Your options</Text>
        </View>

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
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Add someone else's twin</Text>
          <Text style={styles.stepDescription}>
            Get another perspective on your decision
          </Text>
        </View>

        {addedTwins.length > 0 ? (
          <View style={styles.twinAddedCard}>
            <BlurView intensity={30} tint="dark" style={styles.twinAddedBlur}>
              <View style={styles.twinAddedContent}>
                <View style={styles.twinAddedInfo}>
                  <Check size={20} color="#22C55E" />
                  <Text style={styles.twinAddedName}>{addedTwins[0].name}'s twin added</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleRemoveTwin(addedTwins[0].userId)}
                  style={styles.removeTwinButton}
                >
                  <X size={20} color="rgba(200, 200, 200, 0.75)" />
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        ) : (
          <View style={styles.collaboratorSection}>
            <TouchableOpacity
              onPress={() => setShowTwinModal(true)}
              style={styles.addTwinCardEnhanced}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(135, 206, 250, 0.15)', 'rgba(135, 206, 250, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addTwinGradient}
              >
                <BlurView intensity={20} tint="dark" style={styles.addTwinBlurEnhanced}>
                  <View style={styles.addTwinContentEnhanced}>
                    <View style={styles.iconCircle}>
                      <UserPlus size={28} color="rgba(135, 206, 250, 0.9)" />
                    </View>
                    <View style={styles.addTwinTextContainer}>
                      <Text style={styles.addTwinTextEnhanced}>Add Another Twin</Text>
                      <Text style={styles.addTwinSubtext}>Collaborate on this decision</Text>
                    </View>
                    <ChevronRight size={24} color="rgba(135, 206, 250, 0.6)" />
                  </View>
                </BlurView>
              </LinearGradient>
            </TouchableOpacity>

            {/* Mannequin Image */}
            <Image 
              source={require('@/app/man.png')}
              style={styles.mannequinCollaborator}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    );
  }

  // Step 4: Review & Submit
  function renderStep4() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Review</Text>
        </View>

        <View style={styles.reviewCard}>
          <BlurView intensity={30} tint="dark" style={styles.reviewBlur}>
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
          </BlurView>
        </View>
      </View>
    );
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          <Text style={styles.title}>New Decision</Text>
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

        {/* Floating Action Button */}
        <View style={styles.floatingButtonContainer}>
        {currentStep === 3 && (
          <TouchableOpacity
            onPress={() => goToStep(4)}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        <View style={styles.floatingButtonWrapper}>
          <BlurView intensity={80} tint="dark" style={[
            styles.floatingButton,
            !canProceed && styles.floatingButtonDisabled
          ]}>
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
              style={[
                styles.floatingButtonInner,
                !canProceed && { opacity: 0.6 }
              ]}
            >
              {currentStep === 4 && (
                <Image 
                  source={require('@/assets/images/cube.png')}
                  style={[
                    styles.cubeIcon,
                    !canProceed && styles.cubeIconDisabled
                  ]}
                  resizeMode="contain"
                />
              )}
              <Text style={[
                styles.floatingButtonText,
                !canProceed && styles.floatingButtonTextDisabled
              ]}>
                {getButtonLabel()}
              </Text>
              {!loading && !isDerivingOptions && <ChevronRight size={20} color={canProceed ? "#FFFFFF" : "rgba(200, 200, 200, 0.5)"} />}
            </TouchableOpacity>
          </BlurView>
        </View>
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
            <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
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
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  Enter someone's unreal# — it is listed on their profile page. They will be included in the decision.
                </Text>

                {recentTwins.length > 0 && (
                  <View style={styles.recentTwinsSection}>
                    <View style={styles.recentTwinsHeader}>
                      <Clock size={14} color="rgba(200, 200, 200, 0.75)" />
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
                  <LinearGradient
                    colors={twinCode.length === 6 && !lookingUpTwin ? ['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)'] : ['rgba(100, 100, 100, 0.5)', 'rgba(80, 80, 80, 0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButton}
                  >
                    {lookingUpTwin ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalButtonText}>Add Twin</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
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
            <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
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
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <FloatingLabelInput
                  label="Option text"
                  value={editingOptionText}
                  onChangeText={setEditingOptionText}
                  multiline
                  showCharCount
                  maxCharCount={200}
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
                  <LinearGradient
                    colors={editingOptionText.trim() ? ['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)'] : ['rgba(100, 100, 100, 0.5)', 'rgba(80, 80, 80, 0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButton}
                  >
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </GestureHandlerRootView>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(135, 206, 250, 0.2)',
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
  stepHeader: {
    marginBottom: 4,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
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
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    borderRadius: 12,
    padding: 14,
  },
  regenerateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  twinAddedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  twinAddedBlur: {
    backgroundColor: 'rgba(20, 18, 30, 0.3)',
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
    color: '#FFFFFF',
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
  },
  addTwinCardEnhanced: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    marginBottom: 20,
  },
  addTwinGradient: {
    borderRadius: 18,
  },
  addTwinBlurEnhanced: {
    backgroundColor: 'rgba(20, 18, 30, 0.4)',
    overflow: 'hidden',
  },
  addTwinContentEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  addTwinTextContainer: {
    flex: 1,
  },
  addTwinTextEnhanced: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  addTwinSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(200, 200, 200, 0.7)',
  },
  mannequinCollaborator: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 180,
    height: 180,
    opacity: 0.3,
    zIndex: -1,
  },
  reviewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  reviewBlur: {
    backgroundColor: 'rgba(20, 18, 30, 0.3)',
  },
  reviewContent: {
    padding: 16,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reviewLabelSpaced: {
    marginTop: 20,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  reviewOption: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  reviewOptionNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  reviewOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(135, 206, 250, 0.2)',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    fontWeight: '600',
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
  floatingButtonTextDisabled: {
    color: 'rgba(200, 200, 200, 0.5)',
  },
  cubeIcon: {
    width: 22,
    height: 22,
  },
  cubeIconDisabled: {
    opacity: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  modalBlur: {
    backgroundColor: 'rgba(20, 18, 30, 0.95)',
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
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.85)',
    lineHeight: 20,
    marginBottom: 20,
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
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentTwinsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentTwinChip: {
    backgroundColor: 'rgba(20, 30, 50, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentTwinName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recentTwinCode: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  modalButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    marginTop: 8,
    shadowColor: 'rgba(135, 206, 250, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  modalButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
