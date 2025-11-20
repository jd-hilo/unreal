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

const WELCOME_LINES = [
  'welcome to unreal',
  'we help you make sense of big life decisions',
  '(and the small ones too, like what movie to watch tonight)',
  'we build a digital twin of you and run it through alternate lifelines',
  'so you can choose the best path',
  'ready to begin?',
];

const LINE_FONT_SIZES = [23, 23, 20, 23, 23, 25];
const LIFT_AMOUNT = 8; // pixels to lift previous lines
const LIFT_DURATION = 250; // ms

export default function WelcomeScreen() {
  const router = useRouter();
  const [buttonVisible, setButtonVisible] = useState(false);
  
  // Create shared values for each line's offset and opacity
  const lineOffsets = WELCOME_LINES.map(() => useSharedValue(0));
  const lineOpacities = WELCOME_LINES.map(() => useSharedValue(0));
  const lastLineOpacity = useSharedValue(1); // For fading out "ready to begin?"
  const lastLineTranslateY = useSharedValue(0); // For moving "ready to begin?" up
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);

  const handleLineStart = (lineIndex: number) => {
    // Trigger haptic at start of each line
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade in current line
    lineOpacities[lineIndex].value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });

    // Lift previous lines
    if (lineIndex > 0) {
      for (let i = 0; i < lineIndex; i++) {
        lineOffsets[i].value = withTiming(
          lineOffsets[i].value.value - LIFT_AMOUNT,
          {
            duration: LIFT_DURATION,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }
        );
      }
    }
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

    // Wait before showing logo and button (give user time to read all text)
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
    }, 1500); // Show logo and button after 1.5 seconds, keeping all text visible
  };

  const { displayedLines, isComplete } = useTypewriter(WELCOME_LINES, {
    speed: 40, // 30-50ms per character
    pauseBetweenLines: 500, // 400-600ms pause
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
      const isLastLine = index === WELCOME_LINES.length - 1;
      return {
        transform: [
          { translateY: lineOffsets[index].value + (isLastLine ? lastLineTranslateY.value : 0) }
        ],
        opacity: isLastLine 
          ? Math.min(lineOpacities[index].value, lastLineOpacity.value)
          : lineOpacities[index].value,
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
      colors={['#09090A', '#0F0F11']}
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
                  { marginBottom: index === 2 ? 12 : 0 }, // Extra spacing for parenthetical line
                ]}
              >
                <Text
                  style={[
                    styles.lineText,
                    {
                      fontSize,
                      lineHeight,
                      fontFamily: Platform.select({
                        ios: 'Inter-Bold',
                        android: 'Inter-Bold',
                        default: 'Inter',
                      }),
                      fontWeight: '700',
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
            <BlurView intensity={80} tint="dark" style={styles.button}>
              {/* Classic glass border */}
              <View style={styles.glassBorder} />
              {/* Subtle inner highlight */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.glassHighlight}
                pointerEvents="none"
              />
              <TouchableOpacity
                onPress={handleGetStarted}
                activeOpacity={0.9}
                style={styles.buttonInner}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </BlurView>
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
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: -0.8,
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
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

