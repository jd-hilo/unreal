import { View, Text, StyleSheet, Platform } from 'react-native';
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
import { ChevronRight } from 'lucide-react-native';

const TITLE_LINES = [
  "let's build your digital twin",
  "we'll ask you questions to understand who you are",
  "so we can create an accurate digital version of you",
  "then you can run it through simulations",
  "to help you make the best decisions",
  "please answer truthfully",
];

const LINE_FONT_SIZES = [32, 20, 20, 20, 20, 18];
const LIFT_AMOUNT = 0; // Don't lift lines - keep all visible
const LIFT_DURATION = 250; // ms

export default function ChooseOnboardingMethod() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  // Create shared values for each line's offset and opacity
  const lineOffsets = TITLE_LINES.map(() => useSharedValue(0));
  const lineOpacities = TITLE_LINES.map(() => useSharedValue(0));
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);
  const backgroundPulse = useSharedValue(0);

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

  const allComplete = isComplete;


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

  // Create animated styles for each line
  const lineAnimatedStyles = TITLE_LINES.map((_, index) =>
    useAnimatedStyle(() => {
      return {
        opacity: lineOpacities[index].value,
      };
    })
  );

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const backgroundPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + backgroundPulse.value * 0.1,
  }));

  return (
    <LinearGradient
      colors={['#050505', '#0F0F18', '#0D0D15', '#050505']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Animated background pulse */}
      <Animated.View style={[styles.backgroundPulse, backgroundPulseStyle]}>
        <LinearGradient
          colors={['rgba(65, 105, 225, 0.3)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.textContainer}>
          {TITLE_LINES.map((_, index) => {
            const fontSize = LINE_FONT_SIZES[index];
            const lineHeight = fontSize * 1.15;

            return (
              <Animated.View
                key={index}
                style={[
                  styles.lineWrapper,
                  lineAnimatedStyles[index],
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
                        ios: index === 0 ? 'Inter-Bold' : 'Inter-Regular',
                        android: index === 0 ? 'Inter-Bold' : 'Inter-Regular',
                        default: 'Inter',
                      }),
                      fontWeight: index === 0 ? '700' : '400',
                    },
                  ]}
                >
                  {displayedLines[index]}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {showButton && (
        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <Button
            title={isContinuing ? "Continuing" : "Continue"}
            onPress={handleContinue}
            size="large"
            disabled={isContinuing}
            icon={isContinuing ? <ChevronRight size={20} color="#FFFFFF" /> : <ChevronRight size={20} color="#FFFFFF" />}
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
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: -0.8,
    textAlign: 'left',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
});

