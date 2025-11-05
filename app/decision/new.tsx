import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { X, Plus, ArrowLeft, Sparkles, ChevronRight } from 'lucide-react-native';
import { insertDecision, updateDecisionPrediction } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { LinearGradient } from 'expo-linear-gradient';

export default function NewDecisionScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);

  function addOption() {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  }

  async function handleSubmit() {
    if (!user || !question.trim()) return;

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) return;

    setLoading(true);

    try {
      console.log('Creating decision...');
      const decision = await insertDecision(user.id, {
        question: question.trim(),
        options: validOptions,
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
        options: validOptions,
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

  const validOptions = options.filter((o) => o.trim());
  const canSubmit = question.trim() && validOptions.length >= 2;

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
              placeholder="E.g., Should I take the new job offer?"
          value={question}
          onChangeText={setQuestion}
          multiline
              numberOfLines={4}
          style={styles.questionInput}
              containerStyle={styles.inputContainer}
            />
          </View>
        </View>

        {/* Options Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Your options</Text>
            <Text style={styles.sectionHint}>{validOptions.length} of 4</Text>
          </View>

          <View style={styles.optionsContainer}>
        {options.map((option, index) => (
              <View key={index} style={styles.optionCard}>
                <View style={styles.optionNumber}>
                  <Text style={styles.optionNumberText}>{index + 1}</Text>
                </View>
            <Input
                  placeholder={index === 0 ? "Accept the job" : index === 1 ? "Stay at current job" : `Option ${index + 1}`}
              value={option}
              onChangeText={(value) => updateOption(index, value)}
                  containerStyle={styles.optionInputContainer}
                  style={styles.optionInput}
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => removeOption(index)}
                style={styles.removeButton}
              >
                    <View style={styles.removeButtonInner}>
                      <X size={16} color="rgba(200, 200, 200, 0.75)" />
                    </View>
              </TouchableOpacity>
            )}
          </View>
        ))}
          </View>

        {options.length < 4 && (
            <TouchableOpacity
            onPress={addOption}
              style={styles.addOptionButton}
              activeOpacity={0.7}
            >
              <View style={styles.addOptionIcon}>
                <Plus size={20} color="#B795FF" />
              </View>
              <Text style={styles.addOptionText}>Add another option</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Helper Text */}
        <View style={styles.helperCard}>
          <Text style={styles.helperText}>
            💡 Add at least 2 options. Your Twin will analyze each path based on your values, goals, and past decisions.
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
  optionInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  optionInput: {
    minHeight: 20,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 37, 109, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 8,
  },
  addOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(183, 149, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B795FF',
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
