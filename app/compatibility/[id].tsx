import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Share, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { ArrowLeft, Share as ShareIcon, Users, Heart, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getProfile, getUserInterests } from '@/lib/storage';
import { getCompatibilityTest } from '@/lib/compatibility';
import { computeTwinAlignment } from '@/lib/relevance';
import { buildCorePack } from '@/lib/relevance';
import { generateCompatibilityScenarios } from '@/lib/ai';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import type { CompatibilityBreakdown } from '@/lib/compatibility';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CompatibilityResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [twin1Profile, setTwin1Profile] = useState<any>(null);
  const [twin2Profile, setTwin2Profile] = useState<any>(null);
  const [twin1Accuracy, setTwin1Accuracy] = useState<number | null>(null);
  const [twin2Accuracy, setTwin2Accuracy] = useState<number | null>(null);
  const [scenarios, setScenarios] = useState<{ friends: string; dating: string; enemies: string } | null>(null);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const scenariosLoadedRef = useRef(false);
  
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
      loadTwin1Accuracy();
      loadTwin2Accuracy();
      // Only load scenarios once
      if (!scenariosLoadedRef.current) {
        scenariosLoadedRef.current = true;
        loadScenarios();
      }
      
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
      trackEvent(MixpanelEvents.COMPATIBILITY_REPORT_RECEIVED, {
        test_id: id,
        compatibility_score: testData.compatibility_score,
        twin_user_id: otherUserId,
      });
    } catch (error) {
      console.error('Failed to load compatibility test:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function loadTwin1Accuracy() {
    if (!user) return;
    try {
      const accuracy = await computeTwinAlignment(user.id);
      setTwin1Accuracy(accuracy);
    } catch (error) {
      console.error('Failed to compute twin1 accuracy:', error);
      setTwin1Accuracy(50); 
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

  async function loadScenarios() {
    if (!user || !twin1Profile || !twin2Profile || !test) return;
    
    setLoadingScenarios(true);
    try {
      const otherUserId = test.user_id_1 === user.id ? test.user_id_2 : test.user_id_1;
      const [corePack1, corePack2] = await Promise.all([
        buildCorePack(user.id),
        buildCorePack(otherUserId),
      ]);
      
      const compatibilityScenarios = await generateCompatibilityScenarios(
        corePack1,
        corePack2,
        test.compatibility_score || 50
      );
      
      setScenarios(compatibilityScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoadingScenarios(false);
    }
  }

  async function handleShare() {
    if (!test || !twin1Profile || !twin2Profile) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const breakdown = test.breakdown as CompatibilityBreakdown;
    const score = test.compatibility_score;
    const twin1Name = twin1Profile?.first_name || 'You';
    const twin2Name = twin2Profile?.first_name || 'Someone';
    const scoreBadge = score >= 70 ? 'Perfect Match' : score >= 50 ? 'Good Vibes' : 'Needs Work';
    
    const sharedValues = (twin1Profile?.values_json || [])
      .filter((v: string) => (twin2Profile?.values_json || []).some((v2: string) => v2.toLowerCase() === v.toLowerCase()))
      .slice(0, 6);

    let shareMessage = `Compatibility Test Results 🔮\n\n`;
    shareMessage += `${twin1Name} & ${twin2Name}\n\n`;
    shareMessage += `Match Score: ${score}% - ${scoreBadge}\n\n`;
    shareMessage += `Breakdown:\n`;
    shareMessage += `• Values: ${breakdown.valuesAlignment}%\n`;
    shareMessage += `• Experience: ${breakdown.corePackSimilarity}%\n`;
    
    if (breakdown.interestsAlignment !== undefined) {
      shareMessage += `• Interests: ${breakdown.interestsAlignment}%\n`;
    }
    
    if (breakdown.decisionStyleMatch !== undefined) {
      shareMessage += `• Decision Style: ${breakdown.decisionStyleMatch}%\n`;
    }
    
    if (sharedValues.length > 0) {
      shareMessage += `\nShared Values: ${sharedValues.join(', ')}\n`;
    }
    
    if (breakdown.insights && breakdown.insights.length > 0) {
      shareMessage += `\nInsights:\n`;
      breakdown.insights.slice(0, 3).forEach((insight: string) => {
        shareMessage += `• ${insight}\n`;
      });
    }
    
    if (scenarios) {
      shareMessage += `\nAs Friends: ${scenarios.friends.slice(0, 100)}...\n`;
    }
    
    shareMessage += `\nCompare your digital twins with mora\n`;
    shareMessage += `https://apps.apple.com/us/app/mora-simulate-your-life/id6754901842`;

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

  const sharedValues = (twin1Profile?.values_json || [])
    .filter((v: string) => (twin2Profile?.values_json || []).some((v2: string) => v2.toLowerCase() === v.toLowerCase()))
    .slice(0, 6);

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
          <View style={styles.titleContainer}>
            <Text style={styles.pageTitle}>Compatibility 🔮</Text>
            <View style={styles.presentedByContainer}>
              <Text style={styles.presentedByText}>presented by</Text>
              <Image 
                source={require('@/assets/images/unreallogo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

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
            <View style={styles.scoreCardWrapper}>
              <LinearGradient
                colors={score >= 70 ? ['#8B5CF6', '#EC4899'] : score >= 50 ? ['#F59E0B', '#FCD34D'] : ['#EF4444', '#F87171']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scoreCardGradient}
              />
              <View style={styles.scoreCardContent}>
                <Text style={styles.scoreLabel}>Compatibility Score</Text>
                <Text style={styles.scoreValue}>{score}%</Text>
                
                <View style={styles.avatarsContainer}>
                  <View style={styles.avatarWrapper}>
                    <Text style={styles.avatarName}>{twin1Name}</Text>
                    <Image 
                      source={require('@/assets/images/manwhite.png')} 
                      style={styles.avatarImage}
                      resizeMode="contain"
                    />
                  </View>
                  
                  <View style={styles.connector} />
                  
                  <View style={styles.avatarWrapper}>
                    <Text style={styles.avatarName}>{twin2Name}</Text>
                    <Image 
                      source={require('@/assets/images/manwhite.png')} 
                      style={[styles.avatarImage, styles.avatarImageFlipped]}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <View style={styles.scoreBadge}>
                  <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.scoreBadgeText}>
                    {score >= 70 ? 'Perfect Match' : score >= 50 ? 'Good Vibes' : 'Needs Work'}
                  </Text>
                </View>
              </View>
              {/* Decorative Elements */}
              <View style={[styles.decorativeCircle, { top: -20, right: -20, width: 100, height: 100, opacity: 0.2 }]} />
              <View style={[styles.decorativeCircle, { bottom: -30, left: -30, width: 140, height: 140, opacity: 0.15 }]} />
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
            <Text style={styles.sectionTitle}>The Matchup</Text>
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
                  <Text style={styles.accuracyValue}>
                    {twin1Accuracy !== null ? `${twin1Accuracy}%` : '...'}
                  </Text>
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

              {breakdown.interestsAlignment !== undefined && (
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownIcon}>
                    <Sparkles size={18} color={Colors.gradients.turquoise[0]} />
                  </View>
                  <View style={styles.breakdownContent}>
                    <Text style={styles.breakdownLabel}>Interests</Text>
                    <View style={styles.breakdownBarContainer}>
                      <View style={styles.breakdownBarBackground}>
                        <LinearGradient
                          colors={Colors.gradients.turquoise}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.breakdownBar, { width: `${breakdown.interestsAlignment}%` }]}
                        />
                      </View>
                      <Text style={styles.breakdownValue}>{breakdown.interestsAlignment}%</Text>
                    </View>
                  </View>
                </View>
              )}

              {breakdown.decisionStyleMatch !== undefined && (
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownIcon}>
                    <Users size={18} color={Colors.gradients.turquoise[0]} />
                  </View>
                  <View style={styles.breakdownContent}>
                    <Text style={styles.breakdownLabel}>Decision Style</Text>
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

          {/* Shared Values */}
          {sharedValues.length > 0 && (
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
              <Text style={styles.sectionTitle}>Shared Values 🤝</Text>
              <View style={styles.sharedValuesContainer}>
                {sharedValues.map((value: string, index: number) => (
                  <View key={index} style={styles.valueChip}>
                    <Text style={styles.valueChipText}>{value}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Different Lives */}
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
            <Text style={styles.sectionTitle}>Different Lives 🌍</Text>
            {loadingScenarios ? (
              <View style={styles.loadingScenariosContainer}>
                <ActivityIndicator size="large" color={Colors.gradients.turquoise[0]} />
                <Text style={styles.loadingScenariosText}>Generating scenarios...</Text>
              </View>
            ) : scenarios ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scenariosScrollContent}
                  style={styles.scenariosScrollView}
                  onScroll={(event) => {
                    const offsetX = event.nativeEvent.contentOffset.x;
                    const cardWidth = SCREEN_WIDTH - 40;
                    const index = Math.round(offsetX / cardWidth);
                    setCurrentScenarioIndex(index);
                  }}
                  snapToInterval={SCREEN_WIDTH - 40}
                  decelerationRate="fast"
                  scrollEventThrottle={16}
                >
                  <View style={styles.scenarioCard}>
                    <View style={styles.scenarioHeader}>
                      <Heart size={24} color={Colors.gradients.turquoise[0]} />
                      <Text style={styles.scenarioTitle}>As Friends</Text>
                    </View>
                    <Text style={styles.scenarioText}>{scenarios.friends}</Text>
                  </View>
                  
                  <View style={styles.scenarioCard}>
                    <View style={styles.scenarioHeader}>
                      <Sparkles size={24} color={Colors.gradients.turquoise[0]} />
                      <Text style={styles.scenarioTitle}>Dating</Text>
                    </View>
                    <Text style={styles.scenarioText}>{scenarios.dating}</Text>
                  </View>
                  
                  <View style={styles.scenarioCard}>
                    <View style={styles.scenarioHeader}>
                      <Users size={24} color="#EF4444" />
                      <Text style={styles.scenarioTitle}>Enemies</Text>
                    </View>
                    <Text style={styles.scenarioText}>{scenarios.enemies}</Text>
                  </View>
                </ScrollView>
                <View style={styles.paginationContainer}>
                  {[0, 1, 2].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        currentScenarioIndex === index && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : null}
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
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.inviteButtonContent}>
                <ShareIcon size={24} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Share Report 🚀</Text>
              </View>
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
  titleContainer: {
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  presentedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 16,
  },
  presentedByText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    textTransform: 'lowercase',
  },
  logoImage: {
    height: 16,
    width: 60,
  },
  pageSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 24,
  },
  scoreCardWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 200,
    justifyContent: 'center',
  },
  scoreCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scoreCardContent: {
    alignItems: 'center',
    padding: 32,
    zIndex: 1,
  },
  scoreLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Fonts.secondary.bold,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 80,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    fontFamily: Fonts.primary.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  avatarImageFlipped: {
    transform: [{ scaleX: -1 }],
  },
  connector: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginBottom: 32, // Align with center of avatars
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scoreBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    zIndex: 0,
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
    fontFamily: Fonts.secondary.bold,
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
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  inviteButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  inviteButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  sharedValuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  valueChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  valueChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  scenariosScrollView: {
    marginHorizontal: -20,
  },
  scenariosScrollContent: {
    paddingHorizontal: 20,
  },
  scenarioCard: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  scenarioTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  scenarioText: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 28,
    fontFamily: Fonts.secondary.regular,
  },
  loadingScenariosContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    minHeight: 200,
  },
  loadingScenariosText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    fontFamily: Fonts.secondary.bold,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 32,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.gradients.turquoise[0],
  },
});
