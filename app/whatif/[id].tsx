import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

export default function WhatIfResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [whatIf, setWhatIf] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWhatIf();
  }, [id]);

  async function loadWhatIf() {
    if (!id || typeof id !== 'string') return;

    try {
      const { data, error } = await supabase
        .from('what_if')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setWhatIf(data);
    } catch (error) {
      console.error('Failed to load what-if:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!whatIf) {
    return (
      <View style={styles.container}>
        <Text>What-if scenario not found</Text>
      </View>
    );
  }

  const metrics = whatIf.metrics || {};
  const metricNames = ['happiness', 'money', 'relationship', 'freedom', 'growth'];

  function getMetricIcon(current: number, alternate: number) {
    const diff = alternate - current;
    if (Math.abs(diff) < 0.3) return <Minus size={20} color="#999999" />;
    if (diff > 0) return <TrendingUp size={20} color="#10B981" />;
    return <TrendingDown size={20} color="#EF4444" />;
  }

  function getMetricColor(current: number, alternate: number) {
    const diff = alternate - current;
    if (Math.abs(diff) < 0.3) return '#999999';
    if (diff > 0) return '#10B981';
    return '#EF4444';
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>What If Result</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.question}>{whatIf.payload?.question || 'What-if scenario'}</Text>

        <View style={styles.metricsGrid}>
          {metricNames.map((metricName) => {
            const metric = metrics[metricName];
            if (!metric) return null;

            const { current, alternate } = metric;
            const diff = alternate - current;

            return (
              <Card key={metricName} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  {getMetricIcon(current, alternate)}
                  <Text style={styles.metricName}>
                    {metricName.charAt(0).toUpperCase() + metricName.slice(1)}
                  </Text>
                </View>

                <View style={styles.metricValues}>
                  <View style={styles.metricValue}>
                    <Text style={styles.metricLabel}>Current</Text>
                    <Text style={styles.metricNumber}>{current.toFixed(1)}</Text>
                  </View>
                  <View style={styles.metricValue}>
                    <Text style={styles.metricLabel}>Alternate</Text>
                    <Text
                      style={[
                        styles.metricNumber,
                        { color: getMetricColor(current, alternate) },
                      ]}
                    >
                      {alternate.toFixed(1)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.metricDiff,
                    { color: getMetricColor(current, alternate) },
                  ]}
                >
                  {diff > 0 ? '+' : ''}
                  {diff.toFixed(1)}
                </Text>
              </Card>
            );
          })}
        </View>

        {whatIf.summary && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Analysis</Text>
            <Text style={styles.summaryText}>{whatIf.summary}</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    marginBottom: 32,
    lineHeight: 28,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  metricCard: {
    width: '48%',
    padding: 16,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metricName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricValue: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricDiff: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  summary: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(200, 200, 200, 0.85)',
  },
});
