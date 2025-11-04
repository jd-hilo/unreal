import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getDecision, updateDecisionPrediction } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { formatFactors } from '@/lib/factorFormatter';
import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { ArrowLeft, Sparkles } from 'lucide-react-native';

export default function DecisionResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      loadDecision();
    }
  }, [id, user]);

  useEffect(() => {
    // Lazy-load suggestions after decision loads
    if (decision && decision.prediction && user) {
      loadSuggestions();
    }
  }, [decision?.id, decision?.prediction]);

  async function loadDecision() {
    if (!id || typeof id !== 'string' || !user) return;

    try {
      const decisionData = await getDecision(id);
      
      if (!decisionData) {
        setLoading(false);
        return;
      }

      setDecision(decisionData);

      // Always generate prediction on result screen if decision is not a draft
      // This ensures AI is called when viewing the result
      if (decisionData.status !== 'draft' && !decisionData.prediction) {
        await generatePrediction(decisionData);
      }
    } catch (error) {
      console.error('Failed to load decision:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function generatePrediction(decisionData: any) {
    if (!user || !decisionData) {
      console.warn('Cannot generate prediction: missing user or decision data');
      return;
    }

    setPredicting(true);
    console.log('Generating AI prediction for decision:', decisionData.id);

    try {
      console.log('Building core pack and relevance pack...');
      const corePack = await buildCorePack(user.id);
      const relevancePack = await buildRelevancePack(user.id, decisionData.question);
      
      console.log('Core pack length:', corePack.length);
      console.log('Relevance pack length:', relevancePack.length);
      
      const options = Array.isArray(decisionData.options) 
        ? decisionData.options 
        : JSON.parse(decisionData.options || '[]');

      console.log('Calling predictDecision AI function...');
      const prediction = await predictDecision({
        corePack,
        relevancePack,
        question: decisionData.question,
        options,
      });

      console.log('AI prediction received:', {
        prediction: prediction.prediction,
        probs: prediction.probs,
        uncertainty: prediction.uncertainty,
      });

      console.log('Saving prediction to database...');
      await updateDecisionPrediction(decisionData.id, prediction);

      // Reload the decision to get the updated prediction
      const updatedDecision = await getDecision(decisionData.id);
      setDecision(updatedDecision);
      console.log('Prediction saved and decision updated');
      
      // Reload suggestions after new prediction
      loadSuggestions();
    } catch (error) {
      console.error('Failed to generate prediction:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Failed to generate prediction. Please try again.');
    } finally {
      setPredicting(false);
    }
  }

  async function loadSuggestions() {
    if (!decision?.id || !decision?.prediction || !user) return;
    
    setLoadingSuggestions(true);
    try {
      const { getDecisionSuggestions } = await import('@/lib/decisionsApi');
      const data = await getDecisionSuggestions(
        decision.id,
        user.id,
        decision.question,
        Array.isArray(decision.options) ? decision.options : JSON.parse(decision.options || '[]'),
        decision.prediction.probs,
        decision.prediction.factors || []
      );
      if (data) {
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleSimulate() {
    if (!user || !decision) return;
    
    // Navigate to simulation page
    router.push(`/decision/simulate/${decision.id}` as any);
  }

  if (loading || predicting) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Decision Result</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>
            {predicting ? 'Generating prediction...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!decision) {
    return (
      <View style={styles.container}>
        <Text>Decision not found</Text>
      </View>
    );
  }

  const prediction = decision.prediction;
  // Confidence should match the highest probability percentage
  const confidence = prediction && prediction.probs 
    ? Math.max(...Object.values(prediction.probs as Record<string, number>)) * 100 
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Decision Result</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.question}>{decision.question}</Text>

        {!prediction && decision.status !== 'draft' && user && (
          <View style={styles.noPredictionContainer}>
            <Text style={styles.noPredictionText}>
              Get an AI-powered prediction for your decision
            </Text>
            <Button
              title="Get Prediction"
              onPress={() => generatePrediction(decision)}
              loading={predicting}
              size="large"
              style={styles.generateButton}
            />
          </View>
        )}

        {prediction && (
          <>
            <Card style={styles.predictionCard} variant="elevated">
              <CardContent>
                <Text style={styles.predictionLabel}>Recommended</Text>
                <Text style={styles.predictionValue}>{prediction.prediction}</Text>
                <Text style={styles.confidence}>
                  {confidence.toFixed(0)}% confidence
                </Text>
              </CardContent>
            </Card>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why this choice?</Text>
              <Text style={styles.rationale}>{prediction.rationale}</Text>
            </View>

            {prediction.probs && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Options</Text>
                {Object.entries(prediction.probs as Record<string, number>).map(
                  ([option, prob]) => (
                    <View key={option} style={styles.optionRow}>
                      <Text style={styles.optionName}>{option}</Text>
                      <View style={styles.probContainer}>
                        <View
                          style={[
                            styles.probBar,
                            { width: `${(prob as number) * 100}%` },
                          ]}
                        />
                        <Text style={styles.probText}>
                          {((prob as number) * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  )
                )}
              </View>
            )}

            {prediction.factors && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Factors</Text>
                {formatFactors(prediction.factors).map((formattedFactor: string, index: number) => (
                  <Text key={index} style={styles.factor}>
                    {formattedFactor}
                  </Text>
                ))}
              </View>
            )}

            {/* If things were different Section */}
            {decision.prediction && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={20} color="#000000" />
                  <Text style={styles.sectionTitle}>If things were different…</Text>
                </View>
                {loadingSuggestions ? (
                  <ActivityIndicator size="small" color="#666666" style={styles.sectionLoader} />
                ) : suggestions?.suggestions ? (
                  <View style={styles.suggestionsContainer}>
                    {suggestions.suggestions.map((suggestion: any, index: number) => (
                      <View key={index} style={styles.suggestionCard}>
                        <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                        {suggestion.probs && (
                          <View style={styles.suggestionProbs}>
                            {Object.entries(suggestion.probs).map(([option, prob]: [string, any]) => {
                              const currentProb = decision.prediction.probs[option] || 0;
                              const delta = prob - currentProb;
                              return (
                                <View key={option} style={styles.suggestionProbRow}>
                                  <Text style={styles.suggestionOption}>{option}</Text>
                                  <Text style={styles.suggestionProb}>{(prob * 100).toFixed(0)}%</Text>
                                  {delta !== 0 && (
                                    <Text style={[styles.suggestionDelta, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                                      {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                        {suggestion.delta && (
                          <Text style={styles.suggestionDeltaText}>{suggestion.delta}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyStateText}>
                    No suggestions available at this time.
                  </Text>
                )}
              </View>
            )}

            {user && (
              <Button
                title="Regenerate Prediction"
                onPress={() => generatePrediction(decision)}
                loading={predicting}
                variant="outline"
                size="medium"
                style={styles.regenerateButton}
              />
            )}

            <Button
              title="Simulate"
              onPress={handleSimulate}
              variant="primary"
              size="large"
              style={styles.simulateButton}
            />
          </>
        )}
      </ScrollView>
    </View>
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
    paddingBottom: 40,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
  },
  predictionCard: {
    backgroundColor: '#F5F5F5',
    marginBottom: 32,
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  predictionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  rationale: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  optionRow: {
    marginBottom: 16,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  probContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  probBar: {
    height: 8,
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  probText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    minWidth: 40,
  },
  factor: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 8,
    lineHeight: 22,
  },
  simulateButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  noPredictionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noPredictionText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  generateButton: {
    width: '100%',
  },
  regenerateButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLoader: {
    marginVertical: 16,
  },
  aggregateContainer: {
    gap: 16,
  },
  aggregateSubtext: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  groupCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  groupProbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupOption: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  groupProb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  consensusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  consensusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  suggestionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  suggestionProbs: {
    gap: 8,
  },
  suggestionProbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  suggestionOption: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  suggestionProb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    minWidth: 40,
  },
  suggestionDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionDeltaText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
