import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { useTypewriter } from '@/hooks/useTypewriter';
import { setHasSeenWelcome } from '@/lib/welcomeStorage';
import { Colors, Fonts } from '@/constants/Theme';

const WELCOME_LINES = [
  'welcome to mora',
  'we help you make sense of big life decisions',
  '(and the small ones too, like what movie to watch tonight)',
  'we build a digital twin of you and run it through alternate lifelines',
  'so you can choose the best path',
  'ready to begin?',
];

const LINE_FONT_SIZES = [23, 20, 20, 20, 20, 20]; // Same size for all except first line
const LIFT_AMOUNT = 0; // Don't lift lines - keep all visible
const LIFT_DURATION = 250; // ms

export default function WelcomeScreen() {
  const router = useRouter();
  const [buttonVisible, setButtonVisible] = useState(false);
  
  // Create shared values for each line's opacity
  const lineOpacities = WELCOME_LINES.map(() => useSharedValue(0));
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);

  const handleLineStart = (lineIndex: number) => {
    // Trigger haptic at start of each line
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade in current line and keep it visible
    lineOpacities[lineIndex].value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });

    // Don't lift previous lines - keep all visible
  };

  const handleLineComplete = (lineIndex: number) => {
    // No haptic here, only at start
  };

  const handleCharTyped = () => {
    // Light haptic for each character typed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAllComplete = () => {
    // Success haptic after final line
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Wait 4 seconds after "ready to begin?" shows, then fade out all text
    setTimeout(() => {
      // Fade out all text lines
      WELCOME_LINES.forEach((_, index) => {
        lineOpacities[index].value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.ease),
        });
      });

      // After text fades out, fade in logo and button
    setTimeout(() => {
      // Fade in logo in the middle
      logoOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      });
      logoScale.value = withSpring(1.0, {
        damping: 15,
        stiffness: 150,
      });

      // Show button at bottom at the same time
      setButtonVisible(true);
      buttonOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      buttonScale.value = withSpring(1.0, {
        damping: 15,
        stiffness: 150,
      });
      }, 500); // Wait for text fade out to complete
    }, 4000); // Wait 4 seconds after "ready to begin?" shows
  };

  const { displayedLines, isComplete } = useTypewriter(WELCOME_LINES, {
    speed: 30, // Slower typing speed
    pauseBetweenLines: 400, // Pause between lines
    onLineStart: handleLineStart,
    onLineComplete: handleLineComplete,
    onAllComplete: handleAllComplete,
    onCharTyped: handleCharTyped,
  });

  const handleGetStarted = async () => {
    // Impact haptic on button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Mark welcome as seen
    await setHasSeenWelcome();

    // Navigate to auth
    router.replace('/auth');
  };

  // Create animated styles for each line (must be at top level)
  const lineAnimatedStyles = WELCOME_LINES.map((_, index) =>
    useAnimatedStyle(() => {
      return {
        opacity: lineOpacities[index].value,
      };
    })
  );

  // Logo animated style
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value }, { translateY: -30 }],
    };
  });

  // Button animated style
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          {WELCOME_LINES.map((_, index) => {
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
                        ios: index === 0 
                          ? Fonts.primary.regular 
                          : Fonts.secondary.bold,
                        android: index === 0 
                          ? Fonts.primary.regular 
                          : Fonts.secondary.bold,
                        default: index === 0 
                          ? Fonts.fallback.primary 
                          : Fonts.fallback.secondary,
                      }),
                      fontWeight: index === 0 ? '400' : '700',
                      color: Colors.textPrimary,
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

      {/* Logo in the middle */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/unreallogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Button at the bottom */}
      {buttonVisible && (
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.9}
              style={styles.buttonInner}
            >
              <LinearGradient
                colors={Colors.gradients.peach}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <ChevronRight size={20} color={Colors.textPrimary} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 120, // Slightly above midpoint for cinematic spacing
    justifyContent: 'flex-start',
  },
  textContainer: {
    alignItems: 'flex-start', // Left-aligned for "system boot" feel
  },
  lineWrapper: {
    marginBottom: 0,
  },
  lineText: {
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'left',
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    width: '100%',
  },
  buttonWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(255, 154, 158, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonInner: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
    borderRadius: 28,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
  },
});

