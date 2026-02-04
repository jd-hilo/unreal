import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Colors, Fonts } from '@/constants/Theme';
import { Users, Zap, TrendingUp } from 'lucide-react-native';
import { trackEvent } from '@/lib/mixpanel';

export default function MotivateStatsScreen() {
  const router = useRouter();
  const [displayCount, setDisplayCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - motivate-stats');
    }, [])
  );

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate counter
    let current = 0;
    const target = 20000;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayCount(target);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  function handleContinue() {
    router.push('/onboarding/04-style');
  }

  return (
    <OnboardingScreen
      title={
        <Text style={styles.customTitle}>Join the Movement</Text>
      }
      subtitle="Thousands are already making smarter decisions"
      subtitleStyle={styles.customSubtitle}
      onNext={handleContinue}
      nextLabel="Continue"
      progress={0.60}
      showProgress={false}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.statCard, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconContainer}>
            <Zap size={40} color="#F59E0B" fill="#F59E0B" />
          </View>
          <Text style={styles.statNumber}>{displayCount.toLocaleString()}+</Text>
          <Text style={styles.statLabel}>decisions made with mora</Text>
          <Text style={styles.statDescription}>
            People just like you exploring their future possibilities
          </Text>
        </Animated.View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Users size={20} color={Colors.gradients.purple[1]} />
            </View>
            <Text style={styles.featureText}>Trusted by decision-makers worldwide</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <TrendingUp size={20} color={Colors.gradients.purple[1]} />
            </View>
            <Text style={styles.featureText}>95% report better decision confidence</Text>
          </View>
        </View>
      </Animated.View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  customTitle: {
    fontSize: 32,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  customSubtitle: {
    textAlign: 'center',
    alignSelf: 'center',
    fontFamily: Fonts.secondary.regular,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 12,
  },
  statDescription: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  featuresContainer: {
    marginTop: 40,
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    padding: 16,
    borderRadius: 16,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
});
