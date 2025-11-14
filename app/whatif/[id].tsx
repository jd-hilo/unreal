import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Weight, Heart, DollarSign, MapPin, Smile, Coffee, Lock, Sparkles } from 'lucide-react-native';
import { useTwin } from '@/store/useTwin';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function WhatIfResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isPremium } = useTwin();
  const [whatIf, setWhatIf] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWhatIf();
  }, [id]);

  // Track biometrics viewed or blocked
  useEffect(() => {
    if (whatIf && whatIf.biometrics) {
      if (isPremium) {
        trackEvent(MixpanelEvents.BIOMETRICS_VIEWED, {
          what_if_id: id
        });
      } else {
        trackEvent(MixpanelEvents.BIOMETRICS_BLOCKED, {
          what_if_id: id
        });
      }
    }
  }, [whatIf, isPremium]);

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
  const biometricsData = whatIf.biometrics || {};

  type BiometricEntry = {
    key: string;
    label: string;
    icon: JSX.Element;
    primary?: string;
    secondary?: string;
    detail?: string;
  };

  const biometricsEntries: BiometricEntry[] = [];

  // Helper function to capitalize first letter
  const capitalize = (str: string) => {
    if (!str || str === '—') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Order: Relationship, Net Worth, Weight, Location, Hobby, Mood
  if (biometricsData.relationshipStatus) {
    biometricsEntries.push({
      key: 'relationshipStatus',
      label: 'Relationship Status',
      icon: <Heart size={18} color="#EF4444" />,
      primary: capitalize(biometricsData.relationshipStatus.alternate || biometricsData.relationshipStatus.current || '—'),
      secondary: biometricsData.relationshipStatus.current ? `Current: ${capitalize(biometricsData.relationshipStatus.current)}` : undefined,
    });
  }

  if (biometricsData.netWorth) {
    biometricsEntries.push({
      key: 'netWorth',
      label: 'Net Worth',
      icon: <DollarSign size={18} color="#10B981" />,
      primary: biometricsData.netWorth.alternate || biometricsData.netWorth.current || '—',
      secondary: biometricsData.netWorth.current ? `Current: ${biometricsData.netWorth.current}` : undefined,
      detail: biometricsData.netWorth.percentChange,
    });
  }

  if (biometricsData.weight) {
    biometricsEntries.push({
      key: 'weight',
      label: 'Weight',
      icon: <Weight size={18} color="#B795FF" />,
      primary: biometricsData.weight.alternate || biometricsData.weight.current || '—',
      secondary: biometricsData.weight.current ? `Current: ${biometricsData.weight.current}` : undefined,
      detail: biometricsData.weight.change,
    });
  }

  if (biometricsData.location) {
    biometricsEntries.push({
      key: 'location',
      label: 'Location',
      icon: <MapPin size={18} color="#F59E0B" />,
      primary: biometricsData.location.alternate || biometricsData.location.current || '—',
      secondary: biometricsData.location.current ? `Current: ${biometricsData.location.current}` : undefined,
    });
  }

  if (biometricsData.hobby) {
    biometricsEntries.push({
      key: 'hobby',
      label: 'Hobby',
      icon: <Coffee size={18} color="#8B5CF6" />,
      primary: capitalize(biometricsData.hobby.alternate || biometricsData.hobby.current || '—'),
      secondary: biometricsData.hobby.current ? `Current: ${capitalize(biometricsData.hobby.current)}` : undefined,
    });
  }

  if (biometricsData.mood) {
    biometricsEntries.push({
      key: 'mood',
      label: 'Mood',
      icon: <Smile size={18} color="#34D399" />,
      primary: capitalize(biometricsData.mood.alternate || biometricsData.mood.current || '—'),
      secondary: biometricsData.mood.current ? `Current: ${capitalize(biometricsData.mood.current)}` : undefined,
    });
  }

  function getDetailStyle(detail?: string) {
    if (!detail) return styles.biometricDetail;
    const trimmed = detail.trim();
    if (trimmed.startsWith('+')) return [styles.biometricDetail, styles.biometricDetailPositive];
    if (trimmed.startsWith('-')) return [styles.biometricDetail, styles.biometricDetailNegative];
    return styles.biometricDetail;
  }

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

        {typeof whatIf.twin_alignment_score === 'number' && (
          <Card style={styles.alignmentCard}>
            <Text style={styles.alignmentTitle}>Twin Alignment Score</Text>
            <Text style={styles.alignmentPercent}>
              {Math.round(whatIf.twin_alignment_score)}%
            </Text>
            <Text style={styles.alignmentNote}>
              100% means your twin mirrors you perfectly; 0% means completely different.
            </Text>
          </Card>
        )}

        <TouchableOpacity
          style={styles.chatTwinButton}
          onPress={() => router.push(`/whatif/chat/${whatIf.id}` as any)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#5B3DF5', '#8E6BFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chatTwinGradient}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.chatTwinText}>Chat with your Twin today</Text>
          </LinearGradient>
        </TouchableOpacity>

        {whatIf.biometrics && (
          <View style={styles.biometricsSection}>
            <View style={styles.biometricsCardWrapper}>
              <Image 
                source={require('@/app/profileman.png')}
                style={styles.biometricsHeadImage}
                resizeMode="contain"
              />
              <LinearGradient
                colors={['rgba(15, 10, 30, 0.95)', 'rgba(25, 15, 45, 0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.biometricsCard}
              >
                <Text style={styles.biometricsTitle}>Bio Metrics</Text>

                <View style={styles.biometricsCardContent}>
                  {biometricsEntries.length === 0 && (
                    <Text style={styles.biometricEmptyText}>No biometric changes available.</Text>
                  )}

                  {biometricsEntries.map((item, index) => (
                    <View
                      key={item.key}
                      style={[
                        styles.biometricRow,
                        index !== biometricsEntries.length - 1 && styles.biometricRowDivider,
                      ]}
                    >
                      <View style={styles.biometricIcon}>
                        {item.icon}
                      </View>
                      <View style={styles.biometricContent}>
                        <Text style={styles.biometricLabel}>{item.label}</Text>
                        {isPremium ? (
                          <>
                        {item.primary && (
                          <Text style={styles.biometricPrimary}>{item.primary}</Text>
                        )}
                        {item.secondary && (
                          <Text style={styles.biometricSecondary}>{item.secondary}</Text>
                        )}
                        {item.detail && (
                          <Text style={getDetailStyle(item.detail)}>{item.detail}</Text>
                            )}
                          </>
                        ) : (
                          <View style={styles.biometricLockContainer}>
                            <BlurView intensity={40} tint="dark" style={styles.biometricBlur}>
                              <View style={styles.biometricLockContent}>
                                <View style={styles.biometricLockIcon}>
                                  <Lock size={16} color="#FFD700" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.biometricLockText}>Locked</Text>
                              </View>
                            </BlurView>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Premium Unlock Button */}
                {!isPremium && (
                  <TouchableOpacity 
                    style={styles.unlockBiometricsButton}
                    onPress={() => router.push('/premium' as any)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500', '#FF8C00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.unlockBiometricsGradient}
                    >
                      <Lock size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.unlockBiometricsText}>Unlock Biometrics</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
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
  alignmentCard: {
    marginTop: 16,
    padding: 20,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 16,
  },
  alignmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  alignmentPercent: {
    fontSize: 32,
    fontWeight: '800',
    color: '#B795FF',
    marginBottom: 6,
  },
  alignmentNote: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.65)',
  },
  chatTwinButton: {
    marginTop: 16,
  },
  chatTwinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  chatTwinText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  biometricsSection: {
    marginTop: 40,
    marginBottom: 32,
  },
  biometricsCardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  biometricsHeadImage: {
    width: 220,
    height: 220,
    opacity: 0.55,
  },
  biometricsCard: {
    width: '100%',
    marginTop: -80,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 24,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: '#6E3DF0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  biometricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-SemiBold',
  },
  biometricsCardContent: {
    gap: 16,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 12,
  },
  biometricRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.25)',
  },
  biometricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(110, 61, 240, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricContent: {
    flex: 1,
    gap: 4,
  },
  biometricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  biometricPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  biometricSecondary: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.7)',
  },
  biometricDetail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B795FF',
  },
  biometricDetailPositive: {
    color: '#10B981',
  },
  biometricDetailNegative: {
    color: '#EF4444',
  },
  biometricEmptyText: {
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 0.65)',
    fontSize: 13,
    paddingVertical: 12,
  },
  biometricLockContainer: {
    marginTop: 4,
  },
  biometricBlur: {
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  biometricLockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biometricLockIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricLockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },
  unlockBiometricsButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  unlockBiometricsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  unlockBiometricsText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
