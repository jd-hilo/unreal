import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, Users, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents, trackScreenView } from '@/lib/mixpanel';

export default function CompatibilityInfoScreen() {
  const router = useRouter();

  // Track screen view
  useFocusEffect(
    useCallback(() => {
      trackScreenView('Compatibility Info');
    }, [])
  );

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.COMPATIBILITY_INFO_CONTINUED);
    router.push('/compatibility/add-twin');
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Compatibility 🔮</Text>
            <Text style={styles.subtitle}>See how your twins match up ✨</Text>

            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Users size={24} color={Colors.gradients.turquoise[0]} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Compare Twins 👥</Text>
                  <Text style={styles.featureDescription}>
                    See where you align and where you differ.
                  </Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Sparkles size={24} color={Colors.gradients.turquoise[0]} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Get Insights 💡</Text>
                  <Text style={styles.featureDescription}>
                    Understand your dynamic and decision styles.
                  </Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Heart size={24} color={Colors.gradients.turquoise[0]} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Get Your Score 💯</Text>
                  <Text style={styles.featureDescription}>
                    Instant 0-100% match rating.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Continue Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.9}
              style={styles.continueButton}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.continueButtonText}>Start Test 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  featuresContainer: {
    gap: 32,
    marginBottom: 40,
    marginTop: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    fontFamily: Fonts.primary.regular,
  },
  featureDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: Colors.background,
  },
  continueButton: {
    width: '100%',
    height: 64,
    borderRadius: 32,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
});
