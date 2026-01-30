import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';

const TITLE_LINES = [
  "let's build your dream self",
  "we'll define who you want to become",
  "so the architect can map your path",
  "every daily task will bridge the gap",
  "to help you become that version of you",
  "dream big, be specific",
];

const LINE_FONT_SIZES = [32, 20, 20, 20, 20, 18];

export default function DreamSelfWelcome() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [showButton, setShowButton] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  // Create shared values for each line's opacity
  const lineOpacities = TITLE_LINES.map(() => useSharedValue(0));
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);

  const handleLineStart = (lineIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    lineOpacities[lineIndex].value = withTiming(1, {
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
      buttonOpacity.value = withTiming(1, { duration: 500 });
      buttonScale.value = withSpring(1.0, { damping: 15, stiffness: 150 });
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
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }]
  }));

  async function handleContinue() {
    if (isContinuing) return;
    setIsContinuing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if we have the necessary "Current Self" data
    if (user) {
      try {
        const profile = await getProfile(user.id);
        const hasNetWorth = !!profile?.net_worth;
        const hasHealth = !!profile?.current_health?.status?.length;
        const hasRelDetails = !!profile?.relationship_details?.status;

        // Reset progress if it's still the old numeric format (though migration handles it)
        const progress = profile?.dream_self_progress || {};
        const isNewFormat = typeof progress === 'object' && !Array.isArray(progress);
        
        if (!hasNetWorth || !hasHealth || !hasRelDetails) {
          // Missing data, route to onboarding to fill gaps
          router.push('/onboarding/01-now-group?fromDreamSelf=true');
          return;
        }
      } catch (error) {
        console.error('Error checking profile for gaps:', error);
      }
    }

    router.push('/onboarding/dream-self/01-net-worth');
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
    <Animated.View style={[styles.lineWrapper, animatedStyle, { marginBottom: 20 }]}>
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
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 120, justifyContent: 'flex-start' },
  textContainer: { alignItems: 'flex-start' },
  lineWrapper: { marginBottom: 0 },
  lineText: { color: Colors.textPrimary, letterSpacing: -0.8, textAlign: 'left' },
  footer: { padding: 24, paddingBottom: 40 },
  buttonWrapper: { borderRadius: 24, overflow: 'hidden' },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 32, gap: 10, borderRadius: 24 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
});
