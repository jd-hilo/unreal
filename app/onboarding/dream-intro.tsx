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
  "let's learn about who you want to become",
];

const LINE_FONT_SIZES = [26];

export default function DreamIntroScreen() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - dream-intro');
    }, [])
  );

  const lineOpacitiesReanimated = TITLE_LINES.map(() => useSharedValue(0));
  const buttonOpacityReanimated = useSharedValue(0);
  const buttonScaleReanimated = useSharedValue(0.96);

  const handleLineStart = (lineIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    lineOpacitiesReanimated[lineIndex].value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });
  };

  const handleCharTyped = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAllComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setShowButton(true);
      buttonOpacityReanimated.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      buttonScaleReanimated.value = withSpring(1.0, {
        damping: 15,
        stiffness: 150,
      });
    }, 1000);
  };

  const { displayedLines } = useTypewriter(TITLE_LINES, {
    speed: 15,
    pauseBetweenLines: 600,
    onLineStart: handleLineStart,
    onAllComplete: handleAllComplete,
    onCharTyped: handleCharTyped,
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacityReanimated.value,
    transform: [{ scale: buttonScaleReanimated.value }],
  }));

  function handleContinue() {
    if (isContinuing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsContinuing(true);
    setTimeout(() => {
      router.push('/onboarding/goals');
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
              opacity={lineOpacitiesReanimated[index]}
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

function TypewriterLine({ index, opacity, text }: { index: number; opacity: Animated.SharedValue<number>; text: string }) {
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
        { marginBottom: 20 },
      ]}
    >
      <Text
        style={[
          styles.lineText,
          {
            fontSize,
            lineHeight,
            fontFamily: Platform.select({
              ios: Fonts.primary.regular,
              android: Fonts.primary.regular,
              default: Fonts.fallback.primary,
            }),
            fontWeight: '400',
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
    paddingTop: 0,
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineWrapper: {
    marginBottom: 0,
  },
  lineText: {
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    textAlign: 'center',
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
