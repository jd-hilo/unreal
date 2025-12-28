import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Share } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ArrowLeft, Share as ShareIcon, Users, Heart, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getProfile } from '@/lib/storage';
import { getCompatibilityTest } from '@/lib/compatibility';
import { computeTwinAlignment } from '@/lib/relevance';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import type { CompatibilityBreakdown } from '@/lib/compatibility';

export default function CompatibilityResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const { twinAccuracy } = useTwin();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [twin1Profile, setTwin1Profile] = useState<any>(null);
  const [twin2Profile, setTwin2Profile] = useState<any>(null);
  const [twin2Accuracy, setTwin2Accuracy] = useState<number | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scoreCardAnim = useRef(new Animated.Value(0)).current;
  const twinsAnim = useRef(new Animated.Value(0)).current;
  const breakdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user && id) {
      loadTest();
    }
  }, [id, user]);

  useEffect(() => {
    if (test && twin1Profile && twin2Profile) {
      loadTwin2Accuracy();
      
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
        Animated.timing(scoreCardAnim, {
          toValue: 1,
          duration: 600,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(twinsAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(breakdownAnim, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [test, twin1Profile, twin2Profile]);

  async function loadTest() {
    if (!id || typeof id !== 'string' || !user) return;

    try {
      const testData = await getCompatibilityTest(id);
      if (!testData) {
        router.back();
        return;
      }

      setTest(testData);

      const isUser1 = testData.user_id_1 === user.id;
      const otherUserId = isUser1 ? testData.user_id_2 : testData.user_id_1;

      const [profile1, profile2] = await Promise.all([
        getProfile(user.id),
        getProfile(otherUserId),
      ]);

      setTwin1Profile(profile1);
      setTwin2Profile(profile2);

      trackEvent(MixpanelEvents.COMPATIBILITY_TEST_VIEWED, {
        test_id: id,
        compatibility_score: testData.compatibility_score,
      });
    } catch (error) {
      console.error('Failed to load compatibility test:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function loadTwin2Accuracy() {
    if (!test || !user) return;

    const otherUserId = test.user_id_1 === user.id ? test.user_id_2 : test.user_id_1;
    try {
      const accuracy = await computeTwinAlignment(otherUserId);
      setTwin2Accuracy(accuracy);
    } catch (error) {
      console.error('Failed to compute twin2 accuracy:', error);
      setTwin2Accuracy(50); 
    }
  }

  async function handleShare() {
    if (!test || !twin1Profile || !twin2Profile) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const breakdown = test.breakdown as CompatibilityBreakdown;
    const shareMessage = `Compatibility Test Results 🔮\n\n` +
      `Match Score: ${test.compatibility_score}%\n\n` +
      `Values: ${breakdown.valuesAlignment}%\n` +
      `Experience: ${breakdown.corePackSimilarity}%\n\n` +
      `${breakdown.insights.slice(0, 2).join('\n')}\n\n` +
      `Compare your digital twins with mora\n` +
      `https://apps.apple.com/us/app/mora-simulate-your-life/id6754901842`;

    try {
      await Share.share({ message: shareMessage });
      trackEvent(MixpanelEvents.COMPATIBILITY_TEST_SHARED, {
        test_id: test.id,
        compatibility_score: test.compatibility_score,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  if (loading || !test || !twin1Profile || !twin2Profile) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const breakdown = test.breakdown as CompatibilityBreakdown;
  const twin1Name = twin1Profile?.first_name || 'You';
  const twin2Name = twin2Profile?.first_name || 'Someone';
  const score = test.compatibility_score;

  const getScoreColor = (score: number) => {
    if (score >= 70) return Colors.gradients.turquoise[0];
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const scoreColor = getScoreColor(score);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <ShareIcon size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          style={[styles.scrollView, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Compatibility 🔮</Text>
          <Text style={styles.pageSubtitle}>Results analysis 📊</Text>

          {/* Compatibility Score Card */}
          <Animated.View
            style={{
              opacity: scoreCardAnim,
              transform: [{
                translateY: scoreCardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            }}
          >
            <View style={styles.scoreCard}>
              <View style={styles.scoreCardContent}>
                <Text style={styles.scoreLabel}>Match Score</Text>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>
                  {score}%
                </Text>
                <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}15` }]}>
                  <Heart size={12} color={scoreColor} />
                  <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                    {score >= 70 ? 'High Match' : score >= 50 ? 'Moderate Match' : 'Low Match'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Twin Cards */}
          <Animated.View
            style={{
              opacity: twinsAnim,
              transform: [{
                translateY: twinsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            }}
          >
            <Text style={styles.sectionTitle}>The Matchup 🆚</Text>
            <View style={styles.twinsContainer}>
              {/* Twin 1 Card */}
              <View style={styles.twinCard}>
                <View style={styles.twinCardHeader}>
                  <View style={styles.twinIcon}>
                    <Users size={20} color={Colors.gradients.turquoise[0]} />
                  </View>
                  <View style={styles.twinInfo}>
                    <Text style={styles.twinName}>{twin1Name}</Text>
                    <Text style={styles.twinLabel}>You</Text>
                  </View>
                </View>
                <View style={styles.accuracyRow}>
                  <Text style={styles.accuracyLabel}>Accuracy</Text>
                  <Text style={styles.accuracyValue}>{twinAccuracy}%</Text>
                </View>
              </View>

              {/* Twin 2 Card */}
              <View style={styles.twinCard}>
                <View style={styles.twinCardHeader}>
                  <View style={styles.twinIcon}>
                    <Users size={20} color={Colors.gradients.turquoise[0]} />
                  </View>
                  <View style={styles.twinInfo}>
                    <Text style={styles.twinName}>{twin2Name}</Text>
                    <Text style={styles.twinLabel}>Them</Text>
                  </View>
                </View>
                <View style={styles.accuracyRow}>
                  <Text style={styles.accuracyLabel}>Accuracy</Text>
                  <Text style={styles.accuracyValue}>
                    {twin2Accuracy !== null ? `${twin2Accuracy}%` : '...'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Breakdown Section */}
          <Animated.View
            style={{
              opacity: breakdownAnim,
              transform: [{
                translateY: breakdownAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            }}
          >
            <Text style={styles.sectionTitle}>Analysis 🧬</Text>
            
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownIcon}>
                  <Heart size={18} color={Colors.gradients.turquoise[0]} />
                </View>
                <View style={styles.breakdownContent}>
                  <Text style={styles.breakdownLabel}>Values</Text>
                  <View style={styles.breakdownBarContainer}>
                    <View style={styles.breakdownBarBackground}>
                      <LinearGradient
                        colors={Colors.gradients.turquoise}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.breakdownBar, { width: `${breakdown.valuesAlignment}%` }]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>{breakdown.valuesAlignment}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownIcon}>
                  <Sparkles size={18} color={Colors.gradients.turquoise[0]} />
                </View>
                <View style={styles.breakdownContent}>
                  <Text style={styles.breakdownLabel}>Experience</Text>
                  <View style={styles.breakdownBarContainer}>
                    <View style={styles.breakdownBarBackground}>
                      <LinearGradient
                        colors={Colors.gradients.turquoise}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.breakdownBar, { width: `${breakdown.corePackSimilarity}%` }]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>{breakdown.corePackSimilarity}%</Text>
                  </View>
                </View>
              </View>

              {breakdown.decisionStyleMatch !== undefined && (
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownIcon}>
                    <Users size={18} color={Colors.gradients.turquoise[0]} />
                  </View>
                  <View style={styles.breakdownContent}>
                    <Text style={styles.breakdownLabel}>Decisions</Text>
                    <View style={styles.breakdownBarContainer}>
                      <View style={styles.breakdownBarBackground}>
                        <LinearGradient
                          colors={Colors.gradients.turquoise}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.breakdownBar, { width: `${breakdown.decisionStyleMatch}%` }]}
                        />
                      </View>
                      <Text style={styles.breakdownValue}>{breakdown.decisionStyleMatch}%</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Insights */}
          {breakdown.insights && breakdown.insights.length > 0 && (
            <Animated.View
              style={{
                opacity: breakdownAnim,
                transform: [{
                  translateY: breakdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                }],
              }}
            >
              <Text style={styles.sectionTitle}>Insights 💡</Text>
              <View style={styles.insightsCard}>
                {breakdown.insights.map((insight, index) => (
                  <View key={index} style={styles.insightRow}>
                    <View style={styles.insightDot} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Invite Button */}
          <Animated.View
            style={{
              opacity: breakdownAnim,
              transform: [{
                translateY: breakdownAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            }}
          >
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.9}
              style={styles.inviteButton}
            >
              <LinearGradient
                colors={Colors.gradients.turquoise}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <ShareIcon size={20} color="#FFFFFF" />
              <Text style={styles.inviteButtonText}>Share Result 🚀</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  backButtonHeader: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  shareButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 24,
  },
  scoreCard: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: 32,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  scoreCardContent: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: Fonts.primary.regular,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    fontFamily: Fonts.primary.regular,
  },
  twinsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  twinCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  twinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  twinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twinInfo: {
    flex: 1,
  },
  twinName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
    fontFamily: Fonts.secondary.bold,
  },
  twinLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  accuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  accuracyLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  accuracyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gradients.turquoise[0],
    fontFamily: Fonts.primary.regular,
  },
  breakdownCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 20,
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownContent: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  breakdownBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 40,
    fontFamily: Fonts.secondary.bold,
  },
  insightsCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 16,
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gradients.turquoise[0],
    marginTop: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: Fonts.secondary.bold,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: Colors.gradients.turquoise[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  inviteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
