import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ArrowLeft } from 'lucide-react-native';
import { insertWhatIf } from '@/lib/storage';
import { runWhatIf } from '@/lib/ai';
import { getProfile } from '@/lib/storage';

export default function NewWhatIfScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [whatIfText, setWhatIfText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!user || !whatIfText.trim()) return;

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const baselineSummary = profile?.narrative_summary || 'No profile data available';

      const result = await runWhatIf(baselineSummary, whatIfText);

      const whatIfData = await insertWhatIf(user.id, {
        counterfactual_type: 'general',
        payload: { question: whatIfText },
        metrics: result.metrics,
        summary: result.summary,
      });

      router.push(`/whatif/${whatIfData.id}`);
    } catch (error) {
      console.error('What-if error:', error);
      alert('Failed to process what-if scenario');
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
        <Text style={styles.title}>What if?</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Explore how your life might be different if you had made a different choice
        </Text>

        <Input
          label="What would you like to explore?"
          placeholder="What if I had gone to a different university?&#10;What if I had taken that job offer?&#10;What if I had moved to a different city?"
          value={whatIfText}
          onChangeText={setWhatIfText}
          multiline
          numberOfLines={6}
          style={styles.input}
        />

        <View style={styles.examples}>
          <Text style={styles.examplesTitle}>Examples:</Text>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setWhatIfText('What if I had studied engineering instead?')}
          >
            <Text style={styles.exampleText}>Different major</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setWhatIfText('What if I had stayed in my hometown?')}
          >
            <Text style={styles.exampleText}>Different location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setWhatIfText('What if I had started my own business?')}
          >
            <Text style={styles.exampleText}>Career path</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Explore Timeline"
          onPress={handleSubmit}
          loading={loading}
          disabled={!whatIfText.trim()}
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
  description: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 24,
  },
  input: {
    minHeight: 150,
  },
  examples: {
    marginTop: 24,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
  },
  exampleChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  exampleText: {
    fontSize: 14,
    color: '#000000',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});
