import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTypewriter } from '@/hooks/useTypewriter';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { trackEvent } from '@/lib/mixpanel';

const TITLE_LINES = [
  "let's build your digital twin",
  "we'll ask you questions to understand who you are",
  "so we can create an accurate digital version of you",
  "then we will understand your dream self",
  "to help you become that version of you",
  "please answer truthfully",
];

const LINE_FONT_SIZES = [32, 20, 20, 20, 20, 18];
const LIFT_AMOUNT = 0; // Don't lift lines - keep all visible
const LIFT_DURATION = 250; // ms

export default function ChooseOnboardingMethod() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - choose-method');
    }, [])
  );

  // Create shared values for each line's offset and opacity
  const lineOffsets = TITLE_LINES.map(() => useSharedValue(0));
  const lineOpacities = TITLE_LINES.map(() => useSharedValue(0));
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);

  const handleLineStart = (lineIndex: number) => {
    // Trigger haptic at start of each line
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade in current line
    lineOpacities[lineIndex].value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });

    // Don't lift previous lines - keep all visible
  };

  const handleCharTyped = () => {
    // Light haptic for each character typed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAllComplete = () => {
    // Success haptic after final line
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Show button after all text completes
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
    }, 1000);
  };

  const { displayedLines, isComplete } = useTypewriter(TITLE_LINES, {
    speed: 15, // Super fast typing for rapid haptics
    pauseBetweenLines: 600, // Delay between lines
    onLineStart: handleLineStart,
    onAllComplete: handleAllComplete,
    onCharTyped: handleCharTyped,
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const allComplete = isComplete;

  function handleContinue() {
    if (isContinuing) return; // Prevent double-clicks
    
    setIsContinuing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('🎯 CHOOSE METHOD: Navigating to /onboarding/00-name');
    
    // Small delay to show "Saving" state before navigation
    setTimeout(() => {
      router.push('/onboarding/00-name');
    }, 300);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.textContainer}>
          {TITLE_LINES.map((_, index) => (
            <TypewriterLine
              key={index}
              index={index}
              opacity={lineOpacities[index]}
              text={displayedLines[index]}
            />
          ))}
        </View>
      </View>

      {showButton && (
        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <Pressable
            onPress={handleContinue}
            disabled={isContinuing}
            style={({ pressed }) => [
              styles.buttonWrapper,
              {
                shadowColor: '#25729f',
                transform: [{ translateY: pressed ? 4 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 0 : 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: pressed ? 2 : 8,
              }
            ]}
          >
            <LinearGradient
              colors={['#25729f', '#62edb9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {isContinuing ? "Continuing" : "Continue"}
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function TypewriterLine({ index, opacity, text }: { index: number, opacity: any, text: string }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fontSize = LINE_FONT_SIZES[index];
  const lineHeight = fontSize * 1.15;

  return (
    <Animated.View
      style={[
        styles.lineWrapper,
        animatedStyle,
        { marginBottom: 20 }, // Spacing between lines
      ]}
    >
      <Text
        style={[
          styles.lineText,
          {
            fontSize,
            lineHeight,
            fontFamily: Platform.select({
              ios: index === 0 ? Fonts.primary.regular : Fonts.secondary.bold,
              android: index === 0 ? Fonts.primary.regular : Fonts.secondary.bold,
              default: index === 0 ? Fonts.fallback.primary : Fonts.fallback.secondary,
            }),
            fontWeight: index === 0 ? '400' : '700',
          },
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    justifyContent: 'flex-start',
  },
  textContainer: {
    alignItems: 'flex-start', // Left-aligned for consistency
  },
  lineWrapper: {
    marginBottom: 0,
  },
  lineText: {
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    textAlign: 'left',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  buttonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
    borderRadius: 24,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});

