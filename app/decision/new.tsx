import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Image, Modal, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { ArrowLeft, ChevronRight, X, UserPlus, Clock } from 'lucide-react-native';
import { insertDecision, updateDecisionPrediction, getUserByTwinCode, addDecisionParticipant } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function NewDecisionScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [question, setQuestion] = useState('');
  const [derivedOptions, setDerivedOptions] = useState<string[]>([]);
  const [isDerivingOptions, setIsDerivingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDerivedOptions, setShowDerivedOptions] = useState(false);
  const [showTwinModal, setShowTwinModal] = useState(false);
  const [twinCode, setTwinCode] = useState('');
  const [twinCodeError, setTwinCodeError] = useState('');
  const [lookingUpTwin, setLookingUpTwin] = useState(false);
  const [addedTwins, setAddedTwins] = useState<Array<{ userId: string; name: string; code: string }>>([]);
  const [recentTwins, setRecentTwins] = useState<Array<{ userId: string; name: string; code: string }>>([]);

  useEffect(() => {
    loadRecentTwins();
  }, []);

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
      // Remove duplicates and add to front
      const filtered = recentTwins.filter(t => t.userId !== twin.userId);
      const updated = [twin, ...filtered].slice(0, 5); // Keep max 5 recent
      setRecentTwins(updated);
      await AsyncStorage.setItem('recentTwins', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent twin:', error);
    }
  }

  async function handleDeriveOptions() {
    Keyboard.dismiss();
    if (!question.trim()) return;

    setIsDerivingOptions(true);
    setShowDerivedOptions(false);

    try {
      const { deriveDecisionOptionsWithContext } = await import('@/lib/ai');
      
      // Build context from all added twins if any
      let context = '';
      if (addedTwins.length > 0 && user) {
        const allUserIds = [user.id, ...addedTwins.map(t => t.userId)];
        const { buildCorePack } = await import('@/lib/relevance');
        context = await buildCorePack(user.id, allUserIds);
      }
      
      const options = await deriveDecisionOptionsWithContext(question.trim(), context);
      setDerivedOptions(options);
      setShowDerivedOptions(true);
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

    // Limit to 1 added twin
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

      // Replace the list (only allow 1 twin)
      setAddedTwins([newTwin]);

      // Save to recent twins
      await saveRecentTwin(newTwin);

      // Close modal and reset
      setShowTwinModal(false);
      setTwinCode('');
      setTwinCodeError('');

      // Regenerate options if we already have some, to include the new twin's perspective
      if (derivedOptions.length > 0) {
        await handleDeriveOptions();
      }
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

    // Replace the list (only allow 1 twin)
    setAddedTwins([twin]);

    // Close modal and reset
    setShowTwinModal(false);
    setTwinCode('');
    setTwinCodeError('');

    // Regenerate options if we already have some
    if (derivedOptions.length > 0) {
      await handleDeriveOptions();
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
      
      // Track decision created
      trackEvent(MixpanelEvents.DECISION_CREATED, {
        decision_id: decision.id,
        num_options: derivedOptions.length,
        has_participants: addedTwins.length > 0,
        num_participants: addedTwins.length
      });
      
      // Add participants to the decision
      if (addedTwins.length > 0) {
        console.log('Adding participants to decision...');
        for (const twin of addedTwins) {
          await addDecisionParticipant(decision.id, twin.userId, user.id);
        }
      }

      console.log('Building Core Pack and Relevance Pack...');
      
      // Collect all user IDs (decision owner + added twins)
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

      // Track decision analyzed
      trackEvent(MixpanelEvents.DECISION_ANALYZED, {
        decision_id: decision.id,
        predicted_option: prediction.prediction,
        confidence: Math.max(...Object.values(prediction.probs)),
        num_participants: addedTwins.length
      });

      console.log('Prediction saved. Navigating to result page...');
      router.push(`/decision/${decision.id}`);
    } catch (error) {
      console.error('Decision error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Failed to process decision. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = question.trim().length > 10 && !isDerivingOptions;
  const canSubmit = derivedOptions.length >= 2 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>New Decision</Text>
          <Text style={styles.subtitle}>Let your AI twin help you decide</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question Card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What's your decision?</Text>
          <View style={styles.questionCard}>
        <Input
              placeholder="E.g., Should I take the new job offer? or What should I do about my career?"
          value={question}
              onChangeText={(text) => {
                setQuestion(text);
                setShowDerivedOptions(false);
                setDerivedOptions([]);
              }}
          multiline
              numberOfLines={4}
          style={styles.questionInput}
              containerStyle={styles.inputContainer}
            />
          </View>
          
          {!showDerivedOptions && (
            <TouchableOpacity
              onPress={handleDeriveOptions}
              disabled={!canAnalyze}
              style={[
                styles.analyzeButton,
                !canAnalyze && styles.analyzeButtonDisabled
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.analyzeButtonText,
                !canAnalyze && styles.analyzeButtonTextDisabled
              ]}>
                {isDerivingOptions ? 'Generating...' : 'Generate Options'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Derived Options Section */}
        {showDerivedOptions && derivedOptions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Your options</Text>
              <TouchableOpacity onPress={handleDeriveOptions}>
                <Text style={styles.refreshText}>↻ Regenerate</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
              {derivedOptions.map((option, index) => (
              <View key={index} style={styles.optionCard}>
                <View style={styles.optionNumber}>
                  <Text style={styles.optionNumberText}>{index + 1}</Text>
                </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionText}>{option}</Text>
                    </View>
          </View>
        ))}
          </View>
              </View>
          )}

        {/* Helper Text */}
        <View style={styles.helperCard}>
          <Text style={styles.helperText}>
            {!showDerivedOptions 
              ? '✨ AI will automatically understand your question and identify the options for you'
              : '💡 Your Twin will analyze each path based on your values, goals, and past decisions'}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtonContainer}>
        {/* Add Twin Button / Display */}
        {addedTwins.length > 0 ? (
          <View style={styles.addedTwinDisplay}>
            <Text style={styles.addedTwinDisplayText}>
              {addedTwins[0].name}'s digital twin added
            </Text>
            <TouchableOpacity 
              onPress={() => handleRemoveTwin(addedTwins[0].userId)}
              style={styles.removeTwinButtonSmall}
            >
              <X size={16} color="rgba(200, 200, 200, 0.75)" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowTwinModal(true)}
            style={styles.addTwinButton}
            activeOpacity={0.7}
          >
            <UserPlus size={16} color="rgba(200, 200, 200, 0.75)" />
            <Text style={styles.addTwinButtonText}>+ add a twin</Text>
          </TouchableOpacity>
        )}

        {/* Ask My Twin Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.9}
          style={[
            styles.floatingButton,
            (!canSubmit || loading) && styles.floatingButtonDisabled
          ]}
        >
          <LinearGradient
            colors={canSubmit && !loading ? ['#B795FF', '#8A5CFF', '#6E3DF0'] : ['rgba(59, 37, 109, 0.5)', 'rgba(59, 37, 109, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingButtonGradient}
          >
            <Image 
              source={require('@/assets/images/cube.png')}
              style={[
                styles.cubeIcon,
                (!canSubmit || loading) && styles.cubeIconDisabled
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.floatingButtonText,
              (!canSubmit || loading) && styles.floatingButtonTextDisabled
            ]}>
              {loading ? 'Asking...' : (addedTwins.length > 0 ? 'Ask Our Twins' : 'Ask My Twin')}
            </Text>
            {!loading && <ChevronRight size={20} color={canSubmit ? "#FFFFFF" : "rgba(200, 200, 200, 0.5)"} />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Twin Code Modal */}
      <Modal
        visible={showTwinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTwinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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

            {/* Recent Twins */}
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

            <Input
              placeholder=""
              value={twinCode}
              onChangeText={(text) => {
                setTwinCode(text);
                setTwinCodeError('');
              }}
              maxLength={6}
              keyboardType="number-pad"
              autoFocus={true}
              style={styles.twinCodeInput}
            />

            {twinCodeError ? (
              <Text style={styles.errorText}>{twinCodeError}</Text>
            ) : null}

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
                colors={twinCode.length === 6 && !lookingUpTwin ? ['#B795FF', '#8A5CFF', '#6E3DF0'] : ['rgba(59, 37, 109, 0.5)', 'rgba(59, 37, 109, 0.5)']}
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
        </View>
      </Modal>
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
    paddingBottom: 21,
    gap: 16,
    backgroundColor: '#0C0C10',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
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
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 21,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.6)',
  },
  questionCard: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 16,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 0,
  },
  questionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  analyzeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(183, 149, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(183, 149, 255, 0.4)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  analyzeButtonDisabled: {
    backgroundColor: 'rgba(59, 37, 109, 0.2)',
    borderColor: 'rgba(59, 37, 109, 0.3)',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B795FF',
  },
  analyzeButtonTextDisabled: {
    color: 'rgba(183, 149, 255, 0.5)',
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B795FF',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  optionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(183, 149, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B795FF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  helperCard: {
    backgroundColor: 'rgba(183, 149, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(200, 200, 200, 0.85)',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: '#0C0C10',
  },
  floatingButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#B795FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
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
  addedTwinsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
  },
  addedTwinsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 8,
  },
  addedTwinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  addedTwinInfo: {
    flex: 1,
  },
  addedTwinName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  addedTwinCode: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  removeTwinButton: {
    padding: 4,
  },
  addTwinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  addTwinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  addedTwinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.3)',
    marginBottom: 12,
  },
  addedTwinDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B795FF',
  },
  removeTwinButtonSmall: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 24,
    paddingTop: 100,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(20, 18, 30, 0.98)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
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
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 16,
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
    backgroundColor: 'rgba(59, 37, 109, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.3)',
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
    color: '#B795FF',
  },
  twinCodeInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 8,
    marginBottom: 8,
  },
  modalButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
