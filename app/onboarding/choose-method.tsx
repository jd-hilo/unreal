import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTypewriter } from '@/hooks/useTypewriter';

const TITLE_LINES = [
  "let's build your twin",
  "We recommend you call with our AI Twin Builder, Sol. But if you can't talk right now then select you rather complete manually.",
];

export default function ChooseOnboardingMethod() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<'ai' | 'manual' | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Animation values
  const titleOpacity = useSharedValue(0);
  const questionOpacity = useSharedValue(0);
  const primaryCardOpacity = useSharedValue(0);
  const primaryCardScale = useSharedValue(0.9);
  const primaryCardGlow = useSharedValue(0);
  const secondaryCardOpacity = useSharedValue(0);
  const secondaryCardScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);
  const backgroundPulse = useSharedValue(0);

  // Typewriter for title (slower)
  const { displayedLines: titleLines, isComplete: titleComplete } = useTypewriter(
    [TITLE_LINES[0]],
    {
      speed: 40, // Same as welcome screen
      pauseBetweenLines: 0,
      onLineStart: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        titleOpacity.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      },
      onCharTyped: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    }
  );

  // Typewriter for question (faster and smaller) - starts after title completes
  const [startQuestion, setStartQuestion] = useState(false);
  const { displayedLines: questionLines, isComplete: questionComplete } = useTypewriter(
    startQuestion ? [TITLE_LINES[1]] : [],
    {
      speed: 30, // Faster than title
      pauseBetweenLines: 0,
      onLineStart: () => {
        questionOpacity.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      },
    }
  );

  // Start question after title completes
  useEffect(() => {
    if (titleComplete && !startQuestion) {
      setTimeout(() => {
        setStartQuestion(true);
      }, 500);
    }
  }, [titleComplete, startQuestion]);

  const allComplete = titleComplete && questionComplete;

  // Show options after all text completes
  useEffect(() => {
    if (allComplete) {
      setTimeout(() => {
        setShowOptions(true);
        // Animate primary card
        primaryCardOpacity.value = withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.ease),
        });
        primaryCardScale.value = withSpring(1.0, {
          damping: 15,
          stiffness: 150,
        });
        primaryCardGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );

        // Animate secondary card after delay
        setTimeout(() => {
          secondaryCardOpacity.value = withTiming(1, {
            duration: 600,
            easing: Easing.out(Easing.ease),
          });
          secondaryCardScale.value = withSpring(1.0, {
            damping: 15,
            stiffness: 150,
          });
        }, 300);

        // Show button after cards
        setTimeout(() => {
          setShowButton(true);
          buttonOpacity.value = withTiming(1, {
            duration: 500,
            easing: Easing.out(Easing.ease),
          });
          buttonScale.value = withSpring(1.0, {
            damping: 15,
            stiffness: 150,
          });
        }, 800);
      }, 1000);
    }
  }, [allComplete]);

  // Background pulse effect
  useEffect(() => {
    backgroundPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  function handleSelectMethod(method: 'ai' | 'manual') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMethod(method);
  }

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedMethod === 'ai') {
      console.log('🎯 CHOOSE METHOD: User selected AI, REPLACING with /ai-onboarding/call');
      router.push('/ai-onboarding/call');
    } else if (selectedMethod === 'manual') {
      console.log('🎯 CHOOSE METHOD: User selected manual, navigating to /onboarding/00-name');
      router.push('/onboarding/00-name');
    }
  }

  // Animated styles
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const questionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
  }));

  const primaryCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: primaryCardOpacity.value,
    transform: [{ scale: primaryCardScale.value }],
  }));

  const primaryCardGlowStyle = useAnimatedStyle(() => ({
    opacity: primaryCardGlow.value * 0.3,
  }));

  const secondaryCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: secondaryCardOpacity.value,
    transform: [{ scale: secondaryCardScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const backgroundPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + backgroundPulse.value * 0.1,
  }));

  return (
    <LinearGradient
      colors={['#09090A', '#0F0F11', '#0C0C10']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Animated background pulse */}
      <Animated.View style={[styles.backgroundPulse, backgroundPulseStyle]}>
        <LinearGradient
          colors={['rgba(135, 206, 250, 0.3)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Animated.View style={titleAnimatedStyle}>
            <Text style={styles.title}>
              {titleLines[0] || ''}
            </Text>
          </Animated.View>
          <Animated.View style={questionAnimatedStyle}>
            <Text style={styles.question}>
              {questionLines[0] || ''}
            </Text>
          </Animated.View>
        </View>

        {showOptions && (
          <View style={styles.options}>
            {/* AI Voice Option - Emphasized */}
            <Animated.View style={[styles.cardWrapper, primaryCardAnimatedStyle]}>
              <Animated.View style={[styles.glowEffect, primaryCardGlowStyle]} />
              <TouchableOpacity
                style={[
                  styles.primaryCard,
                  selectedMethod === 'ai' && styles.primaryCardSelected,
                ]}
                onPress={() => handleSelectMethod('ai')}
                activeOpacity={0.8}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.primaryTitle}>Yes, let's talk</Text>
                </View>
                <View style={styles.radioOuter}>
                  {selectedMethod === 'ai' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Manual Option - De-emphasized */}
            <Animated.View style={secondaryCardAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.secondaryCard,
                  selectedMethod === 'manual' && styles.secondaryCardSelected,
                ]}
                onPress={() => handleSelectMethod('manual')}
                activeOpacity={0.8}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.secondaryTitle}>I rather complete manually</Text>
                </View>
                <View style={styles.radioOuter}>
                  {selectedMethod === 'manual' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>

      {showButton && (
        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <Button
            title="Continue"
            onPress={handleContinue}
            size="large"
            disabled={!selectedMethod}
          />
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardWrapper: {
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 44,
    backgroundColor: 'rgba(135, 206, 250, 0.9)',
    shadowColor: 'rgba(135, 206, 250, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
    zIndex: 0,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 0,
    letterSpacing: -0.8,
    textAlign: 'left',
    fontFamily: Platform.select({
      ios: 'Inter-Bold',
      android: 'Inter-Bold',
      default: 'Inter',
    }),
  },
  question: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'left',
    marginTop: 12,
    fontFamily: Platform.select({
      ios: 'Inter-Bold',
      android: 'Inter-Bold',
      default: 'Inter',
    }),
  },
  options: {
    gap: 16,
    marginTop: 40,
  },
  optionContent: {
    flex: 1,
  },
  // Primary option (AI Voice) - Emphasized
  primaryCard: {
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 250, 0.9)',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
    zIndex: 1,
  },
  primaryCardSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.25)',
    borderColor: 'rgba(135, 206, 250, 0.9)',
  },
  primaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Secondary option (Manual) - De-emphasized
  secondaryCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryCardSelected: {
    borderColor: 'rgba(135, 206, 250, 0.6)',
    backgroundColor: 'rgba(135, 206, 250, 0.1)',
  },
  secondaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(200, 200, 200, 0.7)',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 250, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4169E1',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
});

