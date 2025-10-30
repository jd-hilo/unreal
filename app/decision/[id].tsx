import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecision, getSimulation, insertSimulation } from '@/lib/storage';
import { simulateOutcome } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react-native';

export default function DecisionResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const isPremium = useTwin((state) => state.isPremium);
  const [decision, setDecision] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadDecision();
  }, [id]);

  async function loadDecision() {
    if (!id || typeof id !== 'string') return;

    try {
      const decisionData = await getDecision(id);
      setDecision(decisionData);

      const simulationData = await getSimulation(id);
      setSimulation(simulationData);
    } catch (error) {
      console.error('Failed to load decision:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate() {
    if (!user || !decision || !isPremium) {
      alert('Simulation is a premium feature');
      return;
    }

    setSimulating(true);

    try {
      const corePack = await buildCorePack(user.id);
      const prediction = decision.prediction;

      const scenario = await simulateOutcome(
        corePack,
        prediction.prediction,
        90
      );

      const scenarios = {
        [prediction.prediction]: scenario,
      };

      const simulationData = await insertSimulation(
        user.id,
        decision.id,
        scenarios,
        scenario.notes
      );

      setSimulation(simulationData);
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Failed to run simulation');
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
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
  const confidence = prediction ? (1 - prediction.uncertainty) * 100 : 0;

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
                {prediction.factors.map((factor: string, index: number) => (
                  <Text key={index} style={styles.factor}>
                    • {factor}
                  </Text>
                ))}
              </View>
            )}

            {!simulation && (
              <Button
                title={isPremium ? 'Simulate 90 Days' : 'Upgrade to Simulate'}
                onPress={handleSimulate}
                variant={isPremium ? 'primary' : 'outline'}
                size="large"
                loading={simulating}
                style={styles.simulateButton}
              />
            )}

            {simulation && simulation.scenarios && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>90-Day Simulation</Text>
                {Object.entries(simulation.scenarios).map(([option, scenario]: [string, any]) => (
                  <View key={option}>
                    <Text style={styles.scenarioTitle}>{option}</Text>
                    <View style={styles.metrics}>
                      {Object.entries(scenario.deltas).map(([metric, delta]: [string, any]) => (
                        <View key={metric} style={styles.metricCard}>
                          <View style={styles.metricHeader}>
                            {delta > 0 ? (
                              <TrendingUp size={20} color="#10B981" />
                            ) : (
                              <TrendingDown size={20} color="#EF4444" />
                            )}
                            <Text style={styles.metricName}>
                              {metric.charAt(0).toUpperCase() + metric.slice(1)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.metricValue,
                              { color: delta > 0 ? '#10B981' : '#EF4444' },
                            ]}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {scenario.notes && (
                      <Text style={styles.notes}>{scenario.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
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
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    color: '#666666',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  notes: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
});
