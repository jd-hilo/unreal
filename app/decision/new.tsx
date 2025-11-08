import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { ArrowLeft, Sparkles, ChevronRight } from 'lucide-react-native';
import { insertDecision, updateDecisionPrediction } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { LinearGradient } from 'expo-linear-gradient';

export default function NewDecisionScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [question, setQuestion] = useState('');
  const [derivedOptions, setDerivedOptions] = useState<string[]>([]);
  const [isDerivingOptions, setIsDerivingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDerivedOptions, setShowDerivedOptions] = useState(false);

  async function handleDeriveOptions() {
    if (!question.trim()) return;

    setIsDerivingOptions(true);
    setShowDerivedOptions(false);

    try {
      const { deriveDecisionOptions } = await import('@/lib/ai');
      const options = await deriveDecisionOptions(question.trim());
      setDerivedOptions(options);
      setShowDerivedOptions(true);
    } catch (error) {
      console.error('Option derivation error:', error);
      alert('Failed to analyze your question. Please try again.');
    } finally {
      setIsDerivingOptions(false);
    }
  }

  async function handleSubmit() {
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
      console.log('Building Core Pack and Relevance Pack...');
      
      const corePack = await buildCorePack(user.id);
      const relevancePack = await buildRelevancePack(user.id, question);
      
      console.log('Core pack length:', corePack.length);
      console.log('Relevance pack length:', relevancePack.length);
      console.log('Calling AI predictDecision...');

      const prediction = await predictDecision({
        corePack,
        relevancePack,
        question: question.trim(),
        options: derivedOptions,
      });

      console.log('AI prediction received:', {
        prediction: prediction.prediction,
        probs: prediction.probs,
        uncertainty: prediction.uncertainty,
      });

      console.log('Saving prediction to database...');
      await updateDecisionPrediction(decision.id, prediction);

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
              <Sparkles size={20} color={canAnalyze ? "#B795FF" : "rgba(183, 149, 255, 0.5)"} />
              <Text style={[
                styles.analyzeButtonText,
                !canAnalyze && styles.analyzeButtonTextDisabled
              ]}>
                {isDerivingOptions ? 'Analyzing...' : 'Analyze Question'}
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

      {/* Floating Action Button */}
      <View style={styles.floatingButtonContainer}>
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
            <Sparkles size={22} color="#FFFFFF" />
            <Text style={styles.floatingButtonText}>
              {loading ? 'Analyzing...' : 'Get AI Prediction'}
            </Text>
            {!loading && <ChevronRight size={20} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 24,
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
    marginBottom: 4,
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
    paddingTop: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(183, 149, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(183, 149, 255, 0.4)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 8,
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
});
