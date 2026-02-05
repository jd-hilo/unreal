import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { useState, useEffect, useRef, JSX } from 'react';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, TrendingUp, TrendingDown, Minus, Weight, Heart, DollarSign, MapPin, Smile, Coffee, Lock, Sparkles } from 'lucide-react-native';
import { useTwin } from '@/store/useTwin';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';

export default function WhatIfResultScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const { isPremium } = useTwin();
  const [whatIf, setWhatIf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Disable swipe-to-go-back gesture on both current and parent navigators
  useFocusEffect(() => {
    // Disable on current screen
    navigation.setOptions({
      gestureEnabled: false,
    });

    // Disable on parent navigator (to prevent swiping back to home)
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        gestureEnabled: false,
      });
    }

    return () => {
      // Re-enable on cleanup
      navigation.setOptions({
        gestureEnabled: true,
      });
      if (parent) {
        parent.setOptions({
          gestureEnabled: true,
        });
      }
    };
  });

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
      
      // Trigger fade-in animation after data loads
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to load what-if:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundGradient}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
                <Home size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  if (!whatIf) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundGradient}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
                <Home size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>What-if scenario not found</Text>
            </View>
          </SafeAreaView>
        </View>
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
    editRoute?: string;
  };

  const biometricsEntries: BiometricEntry[] = [];

  // Helper function to capitalize first letter
  const capitalize = (str: string) => {
    if (!str || str === '—') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Order: Relationship, Net Worth, Weight, Location, Hobby, Mood
  // Always show biometrics if they exist in the data, even without current values
  if (biometricsData.relationshipStatus) {
    biometricsEntries.push({
      key: 'relationshipStatus',
      label: 'Relationship Status',
      icon: <Heart size={18} color="#EF4444" />,
      primary: capitalize(biometricsData.relationshipStatus.alternate || '—'),
      secondary: biometricsData.relationshipStatus.current ? `Current: ${capitalize(biometricsData.relationshipStatus.current)}` : 'Update on Profile to view current',
      editRoute: '/profile/edit-context',
    });
  }

  if (biometricsData.netWorth) {
    biometricsEntries.push({
      key: 'netWorth',
      label: 'Net Worth',
      icon: <DollarSign size={18} color="#10B981" />,
      primary: biometricsData.netWorth.alternate || '—',
      secondary: biometricsData.netWorth.current ? `Current: ${biometricsData.netWorth.current}` : 'Update on Profile to view current',
      detail: biometricsData.netWorth.percentChange,
      editRoute: '/profile/edit-networth',
    });
  }

  if (biometricsData.weight) {
    biometricsEntries.push({
      key: 'weight',
      label: 'Weight',
      icon: <Weight size={18} color="rgba(135, 206, 250, 0.9)" />,
      primary: biometricsData.weight.alternate || '—',
      secondary: biometricsData.weight.current ? `Current: ${biometricsData.weight.current}` : 'Update on Profile to view current',
      detail: biometricsData.weight.change,
    });
  }

  if (biometricsData.location) {
    biometricsEntries.push({
      key: 'location',
      label: 'Location',
      icon: <MapPin size={18} color="#F59E0B" />,
      primary: biometricsData.location.alternate || '—',
      secondary: biometricsData.location.current ? `Current: ${biometricsData.location.current}` : 'Update on Profile to view current',
      editRoute: '/profile/edit-location',
    });
  }

  if (biometricsData.hobby) {
    biometricsEntries.push({
      key: 'hobby',
      label: 'Hobby',
      icon: <Coffee size={18} color="rgba(100, 181, 246, 0.8)" />,
      primary: capitalize(biometricsData.hobby.alternate || '—'),
      secondary: biometricsData.hobby.current ? `Current: ${capitalize(biometricsData.hobby.current)}` : 'Update on Profile to view current',
    });
  }

  if (biometricsData.mood) {
    biometricsEntries.push({
      key: 'mood',
      label: 'Mood',
      icon: <Smile size={18} color="#34D399" />,
      primary: capitalize(biometricsData.mood.alternate || '—'),
      secondary: biometricsData.mood.current ? `Current: ${capitalize(biometricsData.mood.current)}` : 'Update on Profile to view current',
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
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
              <Home size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Animated.ScrollView 
            style={[styles.content, { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]} 
            contentContainerStyle={styles.contentContainer}
          >
            {/* Main Header */}
            <View style={styles.headerCard}>
              <View style={styles.headerCardBlur}>
                <Text style={styles.headerLabel}>Scenario</Text>
                <Text style={styles.headerText}>
                  {whatIf.payload?.question || 'What-if scenario'}
                </Text>
              </View>
            </View>

        {/* New Obsession */}
        {whatIf.payload?.newObsession && (
          <View style={styles.obsessionSectionTop}>
            <View style={styles.obsessionCard}>
              <Text style={styles.obsessionLabel}>Your New Obsession</Text>
              <Text style={styles.obsessionText}>{whatIf.payload.newObsession}</Text>
            </View>
          </View>
        )}

        <View style={styles.metricsGrid}>
          {metricNames.map((metricName) => {
            const metric = metrics[metricName];
            if (!metric) return null;

            const { current, alternate } = metric;
            const diff = alternate - current;

            return (
              <View key={metricName} style={styles.metricCard}>
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
              </View>
            );
          })}
        </View>

        {whatIf.summary && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>A look into your life</Text>
            <Text style={styles.summaryText}>{whatIf.summary}</Text>
          </View>
        )}

        {typeof whatIf.twin_alignment_score === 'number' && (
          <View style={styles.alignmentCard}>
            <Text style={styles.alignmentTitle}>Twin Alignment Score</Text>
            <Text style={styles.alignmentPercent}>
              {Math.round(whatIf.twin_alignment_score)}%
            </Text>
            <Text style={styles.alignmentNote}>
              100% means your twin mirrors you perfectly; 0% means completely different.
            </Text>
          </View>
        )}

        {/* <TouchableOpacity
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
        </TouchableOpacity> */}

        {/* Always show biometrics section */}
        <View style={styles.biometricsSection}>
          <View style={styles.biometricsCard}>
            <Text style={styles.biometricsTitle}>Bio Metrics</Text>

            <View style={styles.biometricsCardContent}>
              {biometricsEntries.length === 0 ? (
                <View style={styles.biometricEmptyContainer}>
                  <Text style={styles.biometricEmptyText}>Update on Profile to view biometrics</Text>
                </View>
              ) : (
                biometricsEntries.map((item, index) => (
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
                          item.secondary.includes('Update on Profile') && item.editRoute ? (
                            <TouchableOpacity 
                              onPress={() => router.push(item.editRoute as any)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.biometricUpdateLink}>{item.secondary}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.biometricSecondary}>{item.secondary}</Text>
                          )
                        )}
                        {item.detail && (
                          <Text style={getDetailStyle(item.detail)}>{item.detail}</Text>
                            )}
                          </>
                        ) : (
                          <View style={styles.biometricLockContainer}>
                            <View style={styles.biometricBlur}>
                              <View style={styles.biometricLockContent}>
                                <View style={styles.biometricLockIcon}>
                                  <Lock size={16} color="#F59E0B" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.biometricLockText}>Reveal with mora+</Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
              )}
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
          </View>
        </View>

        <TouchableOpacity
          style={styles.askAnotherButton}
          onPress={() => router.push('/whatif/new')}
          activeOpacity={0.7}
        >
          <Text style={styles.askAnotherButtonText}>Ask Another What If</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/home')}
          activeOpacity={0.7}
          style={styles.goHomeTextContainer}
        >
          <Text style={styles.goHomeText}>Go to Home</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerText}>
            This trajectory is generated through simulations based on your unique profile. Use it as a thought experiment, not a prediction.
          </Text>
        </View>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  headerCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerCardBlur: {
    padding: 18,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    fontFamily: Fonts.secondary.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
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
    color: Colors.textPrimary,
    flex: 1,
    flexShrink: 1,
    fontFamily: Fonts.secondary.bold,
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
    color: Colors.textTertiary,
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  metricDiff: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Fonts.secondary.bold,
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 18,
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  alignmentCard: {
    marginTop: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  alignmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
  },
  alignmentPercent: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 6,
    fontFamily: Fonts.secondary.bold,
  },
  alignmentNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
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
    fontFamily: Fonts.secondary.bold,
  },
  biometricsSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  biometricsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 18,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  biometricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
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
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  biometricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
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
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: Fonts.secondary.bold,
  },
  biometricPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flexShrink: 1,
    fontFamily: Fonts.secondary.bold,
  },
  biometricSecondary: {
    fontSize: 13,
    color: Colors.textSecondary,
    flexShrink: 1,
    fontFamily: Fonts.secondary.bold,
  },
  biometricUpdateLink: {
    fontSize: 13,
    color: Colors.textSecondary,
    flexShrink: 1,
    textDecorationLine: 'underline',
    fontFamily: Fonts.secondary.bold,
  },
  biometricDetail: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  biometricDetailPositive: {
    color: '#10B981',
  },
  biometricDetailNegative: {
    color: '#EF4444',
  },
  biometricEmptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  biometricEmptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
  },
  biometricLockContainer: {
    marginTop: 4,
  },
  biometricBlur: {
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
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
    color: '#F59E0B',
    fontFamily: Fonts.secondary.bold,
  },
  unlockBiometricsButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
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
    fontFamily: Fonts.secondary.bold,
  },
  disclaimerSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  disclaimerText: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Fonts.secondary.bold,
  },
  extrasSection: {
    marginTop: 16,
    gap: 12,
  },
  obsessionSectionTop: {
    marginBottom: 24,
  },
  chaosCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 18,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  chaosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chaosLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  chaosValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: Fonts.secondary.bold,
  },
  chaosBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chaosBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  obsessionCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 20,
    padding: 18,
  },
  obsessionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  obsessionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 24,
    fontFamily: Fonts.secondary.bold,
  },
  askAnotherButton: {
    marginTop: 0,
    marginBottom: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  askAnotherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  goHomeTextContainer: {
    marginTop: 0,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  goHomeText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
});
