import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Book } from 'lucide-react-native';

interface ProductGuideProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  targetCardLayout?: { x: number; y: number; width: number; height: number };
  whatIfCardLayout?: { x: number; y: number; width: number; height: number };
  journalCardLayout?: { x: number; y: number; width: number; height: number };
  twinCardLayout?: { x: number; y: number; width: number; height: number };
  userId?: string;
  onStepChange?: (step: number) => void;
}

const { width, height } = Dimensions.get('window');

export function ProductGuide({ 
  visible, 
  onDismiss, 
  onComplete, 
  onStepChange,
  targetCardLayout,
  whatIfCardLayout,
  journalCardLayout,
  twinCardLayout
}: ProductGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const steps = [
    {
      id: 'decision',
      title: "Make Better Decisions",
      description: "Stuck? Your Twin simulates outcomes based on your values to help you choose wisely.",
      layout: targetCardLayout,
      icon: require('@/assets/images/compass.png'),
      cardTitle: "Decide",
      cardSubtitle: "Make a choice, simulate the outcomes"
    },
    {
      id: 'whatif',
      title: "See Your Alternate Life",
      description: "Curious about the road not taken? Explore alternate realities to see how different choices shape your future.",
      layout: whatIfCardLayout,
      icon: require('@/assets/images/star.png'),
      cardTitle: "Explore",
      cardSubtitle: "See your alternate life"
    },
    {
      id: 'journal',
      title: "Stay in Sync",
      description: "Daily journaling keeps your Twin updated on your life, feelings, and evolving perspective.",
      layout: journalCardLayout,
      isIconComponent: true,
      IconComponent: Book,
      cardTitle: "Journal",
      cardSubtitle: "Daily reflection"
    },
    {
      id: 'twin',
      title: "Train Your Twin",
      description: "The more you share, the smarter your Twin becomes. Watch it grow from 0% to fully trained.",
      layout: twinCardLayout,
      icon: require('@/assets/images/cube.png'),
      cardTitle: "My Twin",
      cardSubtitle: "Training..."
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 400 });
      startStepAnimation();
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      startStepAnimation();
    }
  }, [currentStep]);

  const startStepAnimation = () => {
    // Reset values
    cardScale.value = 1;
    textOpacity.value = 0;
    textTranslateY.value = 20;

    // Animate card pulse
    cardScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Animate text in
    textOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    textTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  // If layout is missing, fallback to center or skip (for safety)
  const layout = currentStepData.layout || { x: width / 2 - 80, y: height / 2 - 100, width: 160, height: 180 };
  
  // Adjust vertical position to align perfectly with home screen elements
  // Subtracting a small offset to account for potential status bar/safe area discrepancies
  const verticalOffset = Platform.OS === 'ios' ? 48 : 0;
  const adjustedY = layout.y - verticalOffset;

  // Determine text position (above or below card)
  const isTopHalf = adjustedY < height / 2;
  const textPosition = isTopHalf 
    ? { top: adjustedY + layout.height + 24 } 
    : { bottom: height - (adjustedY) + 24 };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        {/* Dark Overlay */}
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.dimmer} />
        </Animated.View>

        {/* Highlighted Card Clone */}
        <Animated.View 
          style={[
            styles.cardCloneWrapper,
            {
              left: layout.x,
              top: adjustedY,
              width: layout.width,
              height: layout.height,
              zIndex: 10,
            },
            cardAnimatedStyle
          ]}
        >
           <View style={styles.cardClone}>
              <BlurView intensity={80} tint="dark" style={styles.cardBlur}>
                 <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                       {currentStepData.isIconComponent && currentStepData.IconComponent ? (
                          <currentStepData.IconComponent size={32} color="#FFFFFF" strokeWidth={1.5} />
                       ) : (
                          <Image 
                            source={currentStepData.icon}
                            style={styles.iconImage}
                            resizeMode="contain"
                          />
                       )}
                    </View>
                    <Text style={styles.cardTitle}>{currentStepData.cardTitle}</Text>
                    <Text style={styles.cardSubtitle}>{currentStepData.cardSubtitle}</Text>
                 </View>
              </BlurView>
              {/* Glow effect */}
              <LinearGradient
                colors={['rgba(135, 206, 250, 0.15)', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
              />
           </View>
        </Animated.View>

        {/* Guide Text & Controls */}
        <Animated.View style={[styles.textContainer, textPosition, textAnimatedStyle]}>
           <BlurView intensity={80} tint="dark" style={styles.textBubble}>
              <Text style={styles.guideTitle}>{currentStepData.title}</Text>
              <Text style={styles.guideDescription}>{currentStepData.description}</Text>
              
              <View style={styles.footer}>
                <View style={styles.indicators}>
                  {steps.map((_, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.dot, 
                        index === currentStep && styles.dotActive
                      ]} 
                    />
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.nextButton}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextText}>{isLastStep ? 'Get Started' : 'Next'}</Text>
                  {!isLastStep && <ChevronRight size={16} color="#000" />}
                </TouchableOpacity>
              </View>
           </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  cardCloneWrapper: {
    position: 'absolute',
    borderRadius: 32,
  },
  cardClone: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  cardBlur: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 32,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginBottom: 16,
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  iconImage: {
    width: 48,
    height: 48,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  textContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  textBubble: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  guideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  guideDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#87CEFA',
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#87CEFA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
  },
  nextText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
