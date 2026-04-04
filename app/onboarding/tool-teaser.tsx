import { useCallback, useRef, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, Text, Animated, Dimensions } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { MessageCircle, GitBranch, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent } from '@/lib/mixpanel';

const { width: SCREEN_W } = Dimensions.get('window');

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'The Architect',
    description: 'Chat with your twin that knows you and tells it straight.',
    gradient: ['#25729f', '#62edb9'] as const,
    emoji: '🧠',
  },
  {
    icon: GitBranch,
    title: 'Life Simulations',
    description: 'Run scenarios on big decisions and see outcomes before you commit.',
    gradient: ['#7468ec', '#8a98ea'] as const,
    emoji: '🔮',
  },
  {
    icon: Sparkles,
    title: 'Clarity Engine',
    description: 'See exactly what changes when you change — no guesswork.',
    gradient: ['#f97316', '#facc15'] as const,
    emoji: '✨',
  },
];

export default function ToolTeaserScreen() {
  const router = useRouter();

  const anim0Opacity = useRef(new Animated.Value(0)).current;
  const anim0TranslateY = useRef(new Animated.Value(30)).current;
  const anim0Scale = useRef(new Animated.Value(0.95)).current;
  const anim1Opacity = useRef(new Animated.Value(0)).current;
  const anim1TranslateY = useRef(new Animated.Value(30)).current;
  const anim1Scale = useRef(new Animated.Value(0.95)).current;
  const anim2Opacity = useRef(new Animated.Value(0)).current;
  const anim2TranslateY = useRef(new Animated.Value(30)).current;
  const anim2Scale = useRef(new Animated.Value(0.95)).current;

  const cardAnims = [
    { opacity: anim0Opacity, translateY: anim0TranslateY, scale: anim0Scale },
    { opacity: anim1Opacity, translateY: anim1TranslateY, scale: anim1Scale },
    { opacity: anim2Opacity, translateY: anim2TranslateY, scale: anim2Scale },
  ];

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - tool-teaser');

      cardAnims.forEach((anim) => {
        anim.opacity.setValue(0);
        anim.translateY.setValue(30);
        anim.scale.setValue(0.95);
      });

      const animations = cardAnims.map((anim, i) =>
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 500,
            delay: 200 + i * 180,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            delay: 200 + i * 180,
            damping: 18,
            stiffness: 140,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            delay: 200 + i * 180,
            damping: 16,
            stiffness: 140,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.parallel(animations).start();
    }, [])
  );

  function handleNext() {
    router.replace({ pathname: '/premium-onboarding', params: { from: 'onboarding' } } as any);
  }

  return (
    <OnboardingScreen
      title="What's waiting for you"
      subtitle="Tools built to help you become who you want to be"
      progress={0.92}
      onNext={handleNext}
      nextLabel="Continue"
    >
      <View style={styles.content}>
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          const anim = cardAnims[i];
          return (
            <Animated.View
              key={i}
              style={[
                styles.card,
                {
                  opacity: anim.opacity,
                  transform: [
                    { translateY: anim.translateY },
                    { scale: anim.scale },
                  ],
                },
              ]}
            >
              <View style={styles.cardInner}>
                <View style={styles.iconContainer}>
                  <Icon size={24} color={Colors.textPrimary} strokeWidth={2} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{feature.title}</Text>
                  <Text style={styles.cardDescription}>{feature.description}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: { marginTop: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconGradient: {
    display: 'none',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.fallback.secondary,
    fontWeight: '400',
    lineHeight: 20,
  },
});
