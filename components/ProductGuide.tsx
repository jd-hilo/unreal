import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions } from 'react-native';
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
import { ChevronRight, Zap, Compass, Star, Book, User } from 'lucide-react-native';

interface ProductGuideProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  targetCardLayout?: { x: number; y: number; width: number; height: number };
  whatIfCardLayout?: { x: number; y: number; width: number; height: number };
  userId?: string;
  onStepChange?: (step: number) => void;
}

const { width } = Dimensions.get('window');

export function ProductGuide({ visible, onDismiss, onComplete, onStepChange }: ProductGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const modalOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);
  const contentScale = useSharedValue(0.95);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (visible) {
      modalOpacity.value = withTiming(1, { duration: 300 });
      contentTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      contentScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 });
      contentTranslateY.value = withTiming(50, { duration: 200 });
      contentScale.value = withTiming(0.95, { duration: 200 });
    }
  }, [visible]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
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
    transform: [
      { translateY: contentTranslateY.value },
      { scale: contentScale.value }
    ],
  }));

  const steps = [
    {
      title: "Make Better Decisions",
      description: "Stuck between choices? Your Twin simulates outcomes based on your values to help you choose wisely.",
      color: '#87CEFA', // App Blue
      cardType: 'decision',
    },
    {
      title: "Explore 'What Ifs'",
      description: "Curious about the road not taken? Simulate alternate realities to see how different choices shape your future.",
      color: '#87CEFA', // App Blue
      cardType: 'whatif',
    },
    {
      title: "Train Your Twin",
      description: "The more you share in your Profile, the smarter and more accurate your Twin becomes.",
      color: '#87CEFA', // App Blue
      cardType: 'profile',
    },
    {
      title: "Stay in Sync",
      description: "Daily journaling keeps your Twin updated on your life, feelings, and evolving perspective.",
      color: '#87CEFA', // App Blue
      cardType: 'journal',
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const renderPreview = () => {
    switch (currentStepData.cardType) {
      case 'decision':
        return (
          <View style={styles.miniCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)']}
              style={styles.miniCardContent}
            >
              <View style={styles.miniHeader}>
                <Compass size={20} color="#87CEFA" />
                <Text style={styles.miniTitle}>Should I move?</Text>
              </View>
              <View style={styles.miniOption}>
                <Text style={styles.miniLabel}>San Francisco</Text>
                <View style={styles.miniBarBg}>
                  <LinearGradient colors={['#87CEFA', '#5CA8FF']} style={[styles.miniBarFill, { width: '75%' }]} />
                </View>
              </View>
              <View style={styles.miniOption}>
                <Text style={styles.miniLabel}>Stay in London</Text>
                <View style={styles.miniBarBg}>
                  <View style={[styles.miniBarFill, { width: '25%', backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                </View>
              </View>
            </LinearGradient>
          </View>
        );
      case 'whatif':
        return (
          <View style={styles.miniCard}>
             <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)']}
              style={styles.miniCardContent}
            >
              <View style={styles.miniHeader}>
                <Star size={20} color="#87CEFA" />
                <Text style={styles.miniTitle}>Taken that job...</Text>
              </View>
              <View style={styles.miniMetricRow}>
                <Text style={styles.miniMetricLabel}>Income</Text>
                <Text style={[styles.miniMetricValue, { color: '#87CEFA' }]}>+45%</Text>
              </View>
              <View style={styles.miniMetricRow}>
                <Text style={styles.miniMetricLabel}>Happiness</Text>
                <Text style={[styles.miniMetricValue, { color: '#EF4444' }]}>-12%</Text>
              </View>
              <View style={styles.miniMetricRow}>
                <Text style={styles.miniMetricLabel}>Free Time</Text>
                <Text style={[styles.miniMetricValue, { color: '#EF4444' }]}>-30%</Text>
              </View>
            </LinearGradient>
          </View>
        );
      case 'profile':
        return (
           <View style={styles.miniCard}>
             <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)']}
              style={styles.miniCardContent}
            >
              <View style={styles.miniProfileHeader}>
                <View style={styles.miniAvatar}>
                   <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.miniCube}
                      resizeMode="contain"
                   />
                </View>
                <View>
                  <Text style={styles.miniTitle}>Digital Twin</Text>
                  <Text style={styles.miniSubtitle}>Level 4</Text>
                </View>
              </View>
              <View style={styles.miniProgressSection}>
                <Text style={styles.miniLabel}>Understanding</Text>
                <View style={styles.miniBarBg}>
                  <LinearGradient colors={['#87CEFA', '#5CA8FF']} style={[styles.miniBarFill, { width: '68%' }]} />
                </View>
              </View>
            </LinearGradient>
          </View>
        );
      case 'journal':
        return (
          <View style={styles.miniCard}>
             <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)']}
              style={styles.miniCardContent}
            >
              <View style={styles.miniHeader}>
                 <Book size={20} color="#87CEFA" />
                 <Text style={styles.miniTitle}>Today</Text>
                 <Text style={styles.miniDate}>Oct 24</Text>
              </View>
              <View style={styles.miniJournalText}>
                <View style={[styles.textLine, { width: '100%' }]} />
                <View style={[styles.textLine, { width: '90%' }]} />
                <View style={[styles.textLine, { width: '95%' }]} />
                 <View style={[styles.textLine, { width: '60%' }]} />
              </View>
            </LinearGradient>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        {/* Dimmed overlay for focus */}
        <View style={styles.dimOverlay} />

        <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
          <LinearGradient
            colors={['#1a1d26', '#101216']}
            style={styles.card}
          >
            {/* Top Image Area */}
            <View style={styles.imageArea}>
              <LinearGradient
                colors={[currentStepData.color + '20', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              
              {/* Render dynamic preview instead of icon */}
              <View style={styles.previewContainer}>
                {renderPreview()}
              </View>

              {/* Decorative elements */}
              <View style={[styles.decorativeDot, { top: 20, right: 40, backgroundColor: currentStepData.color, opacity: 0.4 }]} />
              <View style={[styles.decorativeDot, { bottom: 30, left: 30, width: 6, height: 6, backgroundColor: currentStepData.color, opacity: 0.3 }]} />
            </View>

            {/* Content Area */}
            <View style={styles.textArea}>
              <Text style={styles.title}>{currentStepData.title}</Text>
              <Text style={styles.description}>{currentStepData.description}</Text>
              
              {/* Progress Indicators */}
              <View style={styles.indicators}>
                {steps.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.dot, 
                      index === currentStep && { backgroundColor: currentStepData.color, width: 20 },
                      index > currentStep && styles.dotInactive
                    ]} 
                  />
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.nextButton, { backgroundColor: currentStepData.color }]} 
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={[styles.nextText, { color: '#000' }]}>
                  {isLastStep ? 'Get Started' : 'Next'}
                </Text>
                {!isLastStep && <ChevronRight size={18} color="#000" />}
              </TouchableOpacity>
            </View>
          </LinearGradient>
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
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contentContainer: {
    width: width * 0.85,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#15171E',
  },
  imageArea: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  miniCard: {
    width: '80%',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  miniCardContent: {
    padding: 16,
    gap: 12,
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  miniProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniCube: {
    width: 24,
    height: 24,
  },
  miniTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  miniSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  miniDate: {
    marginLeft: 'auto',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  miniOption: {
    gap: 4,
  },
  miniLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  miniBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  miniMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniMetricLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  miniMetricValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniProgressSection: {
    gap: 6,
  },
  miniJournalText: {
    gap: 8,
  },
  textLine: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  decorativeDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textArea: {
    padding: 24,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    height: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    display: 'none',
  },
  skipText: {
    display: 'none',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
