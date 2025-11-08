import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Weight, Heart, DollarSign, MapPin, Smile, Coffee } from 'lucide-react-native';

export default function WhatIfResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [whatIf, setWhatIf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Floating animations for biometrics
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadWhatIf();
    
    // Start floating animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim3, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim3, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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

        {whatIf.biometrics && (
          <View style={styles.biometricsSection}>
            <Text style={styles.biometricsTitle}>Life Changes</Text>
            <View style={styles.biometricsContainer}>
              <Image 
                source={require('@/app/profileman.png')}
                style={styles.profileManImage}
                resizeMode="contain"
              />
              
              {whatIf.biometrics.weight && (
                <Animated.View style={[styles.biometricBubble, styles.bubble1, {
                  transform: [{ translateY: floatAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }]
                }]}>
                  <Weight size={16} color="#B795FF" />
                  <Text style={styles.biometricText}>{whatIf.biometrics.weight.change}</Text>
                </Animated.View>
              )}
              
              {whatIf.biometrics.relationshipStatus && (
                <Animated.View style={[styles.biometricBubble, styles.bubble2, {
                  transform: [{ translateY: floatAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }]
                }]}>
                  <Heart size={16} color="#EF4444" />
                  <Text style={styles.biometricText}>{whatIf.biometrics.relationshipStatus.alternate}</Text>
                </Animated.View>
              )}
              
              {whatIf.biometrics.netWorth && (
                <Animated.View style={[styles.biometricBubble, styles.bubble3, {
                  transform: [{ translateY: floatAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }]
                }]}>
                  <DollarSign size={16} color="#10B981" />
                  <Text style={styles.biometricText}>{whatIf.biometrics.netWorth.percentChange}</Text>
                </Animated.View>
              )}
              
              {whatIf.biometrics.location && (
                <Animated.View style={[styles.biometricBubble, styles.bubble4, {
                  transform: [{ translateY: floatAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }]
                }]}>
                  <MapPin size={16} color="#F59E0B" />
                  <Text style={styles.biometricText} numberOfLines={1}>{whatIf.biometrics.location.alternate.split(',')[0]}</Text>
                </Animated.View>
              )}
              
              {whatIf.biometrics.hobby && (
                <Animated.View style={[styles.biometricBubble, styles.bubble5, {
                  transform: [{ translateY: floatAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }]
                }]}>
                  <Coffee size={16} color="#8B5CF6" />
                  <Text style={styles.biometricText}>{whatIf.biometrics.hobby.alternate}</Text>
                </Animated.View>
              )}
              
              {whatIf.biometrics.mood && (
                <Animated.View style={[styles.biometricBubble, styles.bubble6, {
                  transform: [{ translateY: floatAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }]
                }]}>
                  <Smile size={16} color="#34D399" />
                  <Text style={styles.biometricText}>{whatIf.biometrics.mood.alternate}</Text>
                </Animated.View>
              )}
            </View>
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
  biometricsSection: {
    marginTop: 32,
    marginBottom: 20,
  },
  biometricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  biometricsContainer: {
    position: 'relative',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileManImage: {
    width: 180,
    height: 180,
    opacity: 0.4,
  },
  biometricBubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 18, 30, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(183, 149, 255, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#B795FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bubble1: {
    top: 20,
    left: 20,
  },
  bubble2: {
    top: 40,
    right: 15,
  },
  bubble3: {
    top: 120,
    left: 10,
  },
  bubble4: {
    top: 140,
    right: 10,
  },
  bubble5: {
    bottom: 80,
    left: 25,
  },
  bubble6: {
    bottom: 70,
    right: 20,
  },
  biometricText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 100,
  },
});
