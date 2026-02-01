import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useState, useCallback, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { Compass, Briefcase, TrendingUp, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const { width } = Dimensions.get('window');

export default function SimulateTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuth((state) => state.user);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // Disable swipe-to-go-back gesture
      navigation.setOptions({
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      });

      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        });
      }

      // Fade in animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }).start();

      return () => {
        navigation.setOptions({
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        });
        if (parent) {
          parent.setOptions({
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          });
        }
      };
    }, [fadeAnim, navigation])
  );

  const handleCareerSimPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/career-sim/setup');
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView 
          style={[styles.scrollView, { opacity: fadeAnim }]} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.titleRow}>
                <Compass size={32} color={Colors.textPrimary} strokeWidth={2} />
                <Text style={styles.title}>Simulate</Text>
              </View>
              <Text style={styles.subtitle}>Experience possible futures</Text>
            </View>
          </View>

          {/* Career Simulation Hero Card */}
          <TouchableOpacity
            onPress={handleCareerSimPress}
            activeOpacity={0.9}
            style={styles.heroCard}
          >
            <LinearGradient 
              colors={Colors.gradients.purple} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroIcon}>
                  <Briefcase size={28} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.heroTitle}>Simulate Your Career</Text>
                <Text style={styles.heroSubtitle}>
                  See where your career could take you in 5, 10, or 15 years
                </Text>
                <View style={styles.heroFeatures}>
                  <View style={styles.featureItem}>
                    <TrendingUp size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                    <Text style={styles.featureText}>Realistic projections</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Sparkles size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                    <Text style={styles.featureText}>Multiple scenarios</Text>
                  </View>
                </View>
                <View style={styles.startButton}>
                  <Text style={styles.startButtonText}>Start Simulation</Text>
                </View>
              </View>
              <View style={styles.heroImageContainer}>
                <View style={styles.heroDecoration} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What you'll discover</Text>
            <View style={styles.infoCards}>
              <View style={styles.infoCard}>
                <View style={styles.infoCardIcon}>
                  <Text style={styles.infoCardEmoji}>💰</Text>
                </View>
                <Text style={styles.infoCardTitle}>Compensation</Text>
                <Text style={styles.infoCardDesc}>Expected salary and total comp trajectory</Text>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoCardIcon}>
                  <Text style={styles.infoCardEmoji}>📈</Text>
                </View>
                <Text style={styles.infoCardTitle}>Growth Path</Text>
                <Text style={styles.infoCardDesc}>Promotions, skills, and career milestones</Text>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoCardIcon}>
                  <Text style={styles.infoCardEmoji}>⚖️</Text>
                </View>
                <Text style={styles.infoCardTitle}>Work-Life</Text>
                <Text style={styles.infoCardDesc}>Hours, flexibility, and burnout risk</Text>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoCardIcon}>
                  <Text style={styles.infoCardEmoji}>🔮</Text>
                </View>
                <Text style={styles.infoCardTitle}>Day-in-Life</Text>
                <Text style={styles.infoCardDesc}>Realistic glimpses into your future</Text>
              </View>
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  safeArea: { 
    flex: 1 
  },
  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: 24, 
    paddingBottom: 120 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 32 
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  title: { 
    fontSize: 32, 
    fontFamily: Fonts.primary.regular, 
    color: Colors.textPrimary 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    fontFamily: Fonts.secondary.regular,
    marginTop: 4,
  },
  heroCard: { 
    borderRadius: 32, 
    overflow: 'hidden', 
    marginBottom: 40,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  heroGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 32,
    minHeight: 280,
  },
  heroContent: { 
    flex: 1, 
    zIndex: 2 
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    fontFamily: Fonts.primary.regular, 
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.9)', 
    marginBottom: 20,
    lineHeight: 24,
    fontFamily: Fonts.secondary.regular,
  },
  heroFeatures: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
  },
  startButton: { 
    backgroundColor: '#FFF', 
    alignSelf: 'flex-start', 
    paddingVertical: 14, 
    paddingHorizontal: 28, 
    borderRadius: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: { 
    color: Colors.gradients.purple[1], 
    fontWeight: '700',
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
  },
  heroImageContainer: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 180,
    height: 180,
    opacity: 0.15,
  },
  heroDecoration: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    backgroundColor: '#FFFFFF',
  },
  infoSection: {
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 20,
  },
  infoCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoCard: {
    width: (width - 72) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  infoCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoCardEmoji: {
    fontSize: 24,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 6,
  },
  infoCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 18,
  },
});
