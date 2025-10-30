import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { X, Plus, ArrowLeft } from 'lucide-react-native';
import { insertDecision, updateDecisionPrediction } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';

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
      const decision = await insertDecision(user.id, {
        question: question.trim(),
        options: validOptions,
        status: 'pending',
      });

      const corePack = await buildCorePack(user.id);
      const relevancePack = await buildRelevancePack(user.id, question);

      const prediction = await predictDecision(corePack, relevancePack, question, validOptions);

      await updateDecisionPrediction(decision.id, prediction);

      router.push(`/decision/${decision.id}`);
    } catch (error) {
      console.error('Decision error:', error);
      alert('Failed to process decision. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>What should I choose?</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="What's the decision?"
          placeholder="Should I take the new job?"
          value={question}
          onChangeText={setQuestion}
          multiline
          numberOfLines={3}
          style={styles.questionInput}
        />

        <Text style={styles.sectionTitle}>Options</Text>

        {options.map((option, index) => (
          <View key={index} style={styles.optionRow}>
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChangeText={(value) => updateOption(index, value)}
              containerStyle={styles.optionInput}
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => removeOption(index)}
                style={styles.removeButton}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {options.length < 4 && (
          <Button
            title="Add Option"
            onPress={addOption}
            variant="outline"
            size="small"
            style={styles.addButton}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Get Prediction"
          onPress={handleSubmit}
          loading={loading}
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          size="large"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  questionInput: {
    minHeight: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButton: {
    marginTop: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});
