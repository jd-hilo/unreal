import { View, Text, StyleSheet, Platform, Pressable, Modal } from 'react-native';
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
  "let's learn more about you",
];

const LINE_FONT_SIZES = [26];
const LIFT_AMOUNT = 0; // Don't lift lines - keep all visible
const LIFT_DURATION = 250; // ms

export default function ChooseOnboardingMethod() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showAnthropicModal, setShowAnthropicModal] = useState(false);

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
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAnthropicModal(true);
  }

  function handleModalContinue() {
    setIsContinuing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAnthropicModal(false);
    console.log('🎯 CHOOSE METHOD: Navigating to /onboarding/00-name');
    
    // Small delay to show "Saving" state before navigation
    setTimeout(() => {
      router.push('/onboarding/00-name');
    }, 300);
  }

  function handleModalNoThanks() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAnthropicModal(false);
    // Modal closes, user stays on the same page (effectively restarts)
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

      <Modal
        visible={showAnthropicModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalNoThanks}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI-Powered Analysis</Text>
            <Text style={styles.modalBody}>
              We use Anthropic's AI to analyze your responses and build your personalized digital twin. Anthropic does not store or train on your data.
            </Text>
            
            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleModalNoThanks}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Text style={styles.modalButtonTextSecondary}>No Thanks</Text>
              </Pressable>
              
              <Pressable
                onPress={handleModalContinue}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <LinearGradient
                  colors={['#25729f', '#62edb9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonTextPrimary}>Continue</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    borderRadius: 16,
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.semibold,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});

