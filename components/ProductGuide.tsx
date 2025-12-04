import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { X, ChevronRight } from 'lucide-react-native';

interface ProductGuideProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  targetCardLayout?: { x: number; y: number; width: number; height: number };
  whatIfCardLayout?: { x: number; y: number; width: number; height: number };
  userId?: string;
  onStepChange?: (step: number) => void;
}

export function ProductGuide({ visible, onDismiss, onComplete, targetCardLayout, whatIfCardLayout, userId, onStepChange }: ProductGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const modalOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.9);
  const contentOpacity = useSharedValue(0);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (visible) {
      modalOpacity.value = withTiming(1, { duration: 300 });
      contentScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      contentOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 });
      contentScale.value = withTiming(0.9, { duration: 200 });
      contentOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Reset animation for next step
      contentOpacity.value = 0;
      contentScale.value = 0.9;
      setTimeout(() => {
        contentOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        contentScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }, 200);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  const steps = [
    {
      title: "stuck between choices and not sure what to do? ask your twin.",
      cardType: 'decision' as const,
    },
    {
      title: "ever wondered what your life would look like if you hadn't done that one thing? ask here.",
      cardType: 'whatif' as const,
    },
    {
      title: "build a deeper connection with your twin by completing your profile.",
      cardType: 'profile' as const,
    },
    {
      title: "share your daily experiences through journaling to keep your twin updated.",
      cardType: 'journal' as const,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
          <BlurView intensity={100} tint="dark" style={styles.modalContent}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassHighlight}
              pointerEvents="none"
            />
            <View style={styles.glassBorder} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.stepIndicator}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.stepDot,
                      index === currentStep && styles.stepDotActive,
                      index < currentStep && styles.stepDotCompleted,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{currentStepData.title}</Text>
              
              {/* Mini card preview */}
              <View style={styles.cardPreview}>
                {currentStepData.cardType === 'decision' ? (
                  <View style={styles.miniCard}>
                    <BlurView intensity={80} tint="dark" style={styles.miniCardBlur}>
                      <View style={styles.miniCardBorder} />
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.miniCardHighlight}
                        pointerEvents="none"
                      />
                      <View style={styles.miniCardContent}>
                        <View style={styles.miniIconCircle}>
                          <View style={styles.miniIconRotate}>
                            <Image 
                              source={require('@/assets/images/compass.png')}
                              style={styles.miniCompassIcon}
                              resizeMode="contain"
                            />
                          </View>
                        </View>
                        <View style={styles.miniCardText}>
                          <Text style={styles.miniCardTitle}>What Should{"\n"}I Choose?</Text>
                          <Text style={styles.miniCardSubtitle}>
                            Compare options{"\n"}simulate outcomes
                          </Text>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                ) : currentStepData.cardType === 'whatif' ? (
                  <View style={styles.miniCard}>
                    <BlurView intensity={80} tint="dark" style={styles.miniCardBlur}>
                      <View style={styles.miniCardBorder} />
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.miniCardHighlight}
                        pointerEvents="none"
                      />
                      <View style={styles.miniCardContent}>
                        <View style={styles.miniIconCircle}>
                          <Image 
                            source={require('@/assets/images/star.png')}
                            style={styles.miniStarIcon}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.miniCardText}>
                          <Text style={styles.miniCardTitle}>What If?</Text>
                          <Text style={styles.miniCardSubtitle}>
                            Explore alternate realities
                          </Text>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                ) : currentStepData.cardType === 'profile' ? (
                  <View style={styles.miniProgressCard}>
                    <BlurView intensity={80} tint="dark" style={styles.miniCardBlur}>
                      <View style={styles.miniCardBorder} />
                      <LinearGradient
                        colors={['rgba(135, 206, 250, 0.2)', 'rgba(100, 181, 246, 0.3)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.miniProgressGradient}
                        pointerEvents="none"
                      />
                      <View style={styles.miniProgressContent}>
                        <View style={styles.miniProgressHeader}>
                          <Image 
                            source={require('@/assets/images/cube.png')}
                            style={styles.miniCubeIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.miniProgressTitle}>Twin's Understanding</Text>
                          <Text style={styles.miniProgressPercent}>45%</Text>
                        </View>
                        <View style={styles.miniProgressBar}>
                          <LinearGradient
                            colors={['rgba(173, 216, 230, 0.95)', 'rgba(100, 149, 237, 0.9)', 'rgba(65, 105, 225, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.miniProgressFill, { width: '45%' }]}
                          />
                        </View>
                      </View>
                    </BlurView>
                  </View>
                ) : (
                  <View style={styles.miniJournalCard}>
                    <BlurView intensity={80} tint="dark" style={styles.miniCardBlur}>
                      <View style={styles.miniCardBorder} />
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.miniCardHighlight}
                        pointerEvents="none"
                      />
                      <View style={styles.miniJournalContent}>
                        <View style={styles.miniJournalRow}>
                          <View style={styles.miniJournalIcon}>
                            <Text style={styles.miniJournalEmoji}>📖</Text>
                          </View>
                          <Text style={styles.miniJournalText}>Complete your daily journal</Text>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                style={styles.nextButton}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['rgba(65, 105, 225, 0.95)', 'rgba(30, 144, 255, 0.9)', 'rgba(0, 71, 171, 0.85)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {isLastStep ? 'Got it' : 'Next'}
                  </Text>
                  {!isLastStep && <ChevronRight size={20} color="#FFFFFF" />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.95)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: 'rgba(65, 105, 225, 0.9)',
  },
  stepDotCompleted: {
    backgroundColor: 'rgba(65, 105, 225, 0.6)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  cardPreview: {
    width: '100%',
    alignItems: 'center',
  },
  miniCard: {
    width: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniCardBlur: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  miniCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
  },
  miniCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  miniCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  miniIconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconRotate: {
    transform: [{ rotate: '-30deg' }],
  },
  miniCompassIcon: {
    width: 32,
    height: 32,
  },
  miniStarIcon: {
    width: 32,
    height: 32,
  },
  miniCardText: {
    flex: 1,
  },
  miniCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 2,
  },
  miniCardSubtitle: {
    fontSize: 11,
    color: 'rgba(200, 200, 200, 0.7)',
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  nextButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(65, 105, 225, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  miniProgressCard: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniProgressGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  miniProgressContent: {
    padding: 10,
    zIndex: 1,
  },
  miniProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  miniCubeIcon: {
    width: 16,
    height: 16,
  },
  miniProgressTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  miniProgressPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  miniJournalCard: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniJournalContent: {
    padding: 10,
    zIndex: 1,
  },
  miniJournalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniJournalIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniJournalEmoji: {
    fontSize: 16,
  },
  miniJournalText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
