import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, Dimensions } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Sparkles, Users } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { trackEvent, MixpanelEvents, trackScreenView } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const { width } = Dimensions.get('window');

export default function AddTwinScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mockupFadeAnim = useRef(new Animated.Value(0)).current;
  const mockupSlideAnim = useRef(new Animated.Value(30)).current;

  // Track screen view
  useFocusEffect(
    useCallback(() => {
      trackScreenView('Compatibility Add Twin Landing');
    }, [])
  );

  // Pulse animation for button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Mockup fade and slide animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(mockupFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(mockupSlideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.COMPATIBILITY_INFO_CONTINUED);
    router.push('/compatibility/add-twin-form');
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Check Compatibility
            </Text>
            <Text style={styles.heroSubtitle}>
              See how your twin vibes with others
            </Text>
          </View>

          {/* Interactive Demo Mockup */}
          <Animated.View
            style={[
              styles.mockupContainer,
              {
                opacity: mockupFadeAnim,
                transform: [{ translateY: mockupSlideAnim }],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.mockupTouchable}
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
            <View style={styles.iphoneFrame}>
              <View style={styles.iphoneScreen}>
                <View style={styles.iphoneNotch} />
                <ScrollView style={styles.mockScroll} contentContainerStyle={styles.mockScrollContent}>
                  <View style={styles.mockHeader}>
                    <Text style={styles.mockHeaderTitle}>Compatibility</Text>
                    <View style={styles.mockHeaderBadge}>
                      <Text style={styles.mockHeaderBadgeText}>NEW</Text>
                    </View>
                  </View>
                  
                  <View style={styles.mockScoreCard}>
                    <LinearGradient
                      colors={['#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.mockScoreLabel}>Compatibility Score</Text>
                    <Text style={styles.mockScoreValue}>87%</Text>
                    
                    <View style={styles.mockAvatarsRow}>
                      <View style={styles.mockAvatarWrapper}>
                        <Text style={styles.mockAvatarName}>You</Text>
                        <Image 
                          source={require('@/assets/images/manwhite.png')} 
                          style={styles.mockAvatarImage}
                          resizeMode="contain"
                        />
                      </View>
                      
                      <View style={styles.mockConnector} />
                      
                      <View style={styles.mockAvatarWrapper}>
                        <Text style={styles.mockAvatarName}>Friend</Text>
                        <Image 
                          source={require('@/assets/images/manwhite.png')} 
                          style={[styles.mockAvatarImage, styles.mockAvatarImageFlipped]}
                          resizeMode="contain"
                        />
                      </View>
                    </View>

                    <View style={styles.mockScoreBadge}>
                      <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.mockScoreBadgeText}>Perfect Match</Text>
                    </View>
                  </View>

                  {/* Analysis Breakdown */}
                  <View style={styles.mockBreakdownCard}>
                    <View style={styles.mockBreakdownRow}>
                      <View style={styles.mockBreakdownIcon}>
                        <Heart size={12} color={Colors.gradients.turquoise[0]} />
                      </View>
                      <View style={styles.mockBreakdownContent}>
                        <Text style={styles.mockBreakdownLabel}>Values</Text>
                        <View style={styles.mockBreakdownBarContainer}>
                          <View style={styles.mockBreakdownBarBackground}>
                            <LinearGradient
                              colors={Colors.gradients.turquoise}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.mockBreakdownBar, { width: '92%' }]}
                            />
                          </View>
                          <Text style={styles.mockBreakdownValue}>92%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.mockBreakdownRow}>
                      <View style={styles.mockBreakdownIcon}>
                        <Sparkles size={12} color={Colors.gradients.turquoise[0]} />
                      </View>
                      <View style={styles.mockBreakdownContent}>
                        <Text style={styles.mockBreakdownLabel}>Experience</Text>
                        <View style={styles.mockBreakdownBarContainer}>
                          <View style={styles.mockBreakdownBarBackground}>
                            <LinearGradient
                              colors={Colors.gradients.turquoise}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.mockBreakdownBar, { width: '85%' }]}
                            />
                          </View>
                          <Text style={styles.mockBreakdownValue}>85%</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Insights */}
                  <View style={styles.mockInsightCard}>
                    <View style={styles.mockInsightHeader}>
                      <Text style={styles.mockInsightTitle}>Insights</Text>
                    </View>
                    <View style={styles.mockInsightRow}>
                      <View style={styles.mockInsightDot} />
                      <Text style={styles.mockInsightText}>
                        You both prioritize growth and authenticity.
                      </Text>
                    </View>
                    <View style={styles.mockInsightRow}>
                      <View style={styles.mockInsightDot} />
                      <Text style={styles.mockInsightText}>
                        Decision styles complement each other well.
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View 
            style={[
              styles.continueButtonWrapper,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 60,
  },
  
  // Hero
  heroSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
    marginTop: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    textAlign: 'left',
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    textAlign: 'left',
    lineHeight: 24,
  },

  // Mockup
  mockupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  mockupTouchable: {
    width: '100%',
    alignItems: 'center',
  },
  iphoneFrame: {
    width: 240,
    height: 420,
    backgroundColor: '#1a1a1a',
    borderRadius: 36,
    padding: 8,
    borderWidth: 3,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iphoneScreen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  iphoneNotch: {
    width: 100,
    height: 18,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -50,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  mockScroll: {
    flex: 1,
  },
  mockScrollContent: {
    padding: 16,
    paddingTop: 32,
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mockHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  mockHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#A855F7',
    borderRadius: 8,
  },
  mockHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  mockScoreCard: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mockScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  mockScoreValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: -2,
  },
  mockAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockAvatarWrapper: {
    alignItems: 'center',
  },
  mockAvatarName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  mockAvatarImage: {
    width: 32,
    height: 32,
  },
  mockAvatarImageFlipped: {
    transform: [{ scaleX: -1 }],
  },
  mockConnector: {
    width: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  mockScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  mockScoreBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  
  // Breakdown
  mockBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  mockBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockBreakdownIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockBreakdownContent: {
    flex: 1,
  },
  mockBreakdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  mockBreakdownBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockBreakdownBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mockBreakdownBar: {
    height: '100%',
    borderRadius: 3,
  },
  mockBreakdownValue: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 28,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'right',
  },

  // Insight
  mockInsightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  mockInsightHeader: {
    marginBottom: 8,
  },
  mockInsightTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  mockInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  mockInsightDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gradients.turquoise[0],
    marginTop: 6,
  },
  mockInsightText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },

  // Button
  continueButtonWrapper: {
    marginBottom: 16,
  },
  continueButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
