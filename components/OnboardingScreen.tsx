import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Pressable, Animated } from 'react-native';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

interface OnboardingScreenProps {
  title: string | ReactNode;
  subtitle?: string;
  progress: number;
  onNext: () => void;
  onSkip?: () => void;
  children: ReactNode;
  nextLabel?: string;
  loading?: boolean;
  canContinue?: boolean;
  backgroundGradient?: readonly [string, string, ...string[]];
  buttonGradient?: readonly [string, string, ...string[]];
  progressBarGradient?: readonly [string, string, ...string[]];
  buttonShadowColor?: string;
  animatedButton?: boolean;
}

export function OnboardingScreen({
  title,
  subtitle,
  progress,
  onNext,
  onSkip,
  children,
  nextLabel = 'Continue',
  loading = false,
  canContinue = true,
  backgroundGradient = [Colors.background, Colors.background, Colors.background, Colors.background],
  buttonGradient = Colors.gradients.turquoise,
  progressBarGradient = Colors.gradients.turquoise,
  buttonShadowColor = 'rgba(0, 0, 0, 0.1)',
  animatedButton = false,
}: OnboardingScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  
  // Animation values for bright animated button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (animatedButton && canContinue && !loading && !isProcessing) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
      
      // Shimmer animation
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      shimmerAnim.setValue(0);
    }
  }, [animatedButton, canContinue, loading, isProcessing]);
  
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-300, 0, 300],
  });

  async function handleNext() {
    // Prevent double-clicks using both state and ref for immediate blocking
    if (isProcessingRef.current || isProcessing || !canContinue || loading) return;
    
    // Haptic feedback on button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Set both immediately to prevent any race conditions
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      await onNext();
      // Reset after successful navigation (with small delay to prevent double-tap)
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 300);
    } catch (error) {
      console.error('Error in handleNext:', error);
      // Reset immediately on error so user can try again
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }

  return (
    <View style={styles.gradientBackground}>
      <StatusBar style="dark" />
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Progress Header */}
      <View style={styles.header}>
          <ProgressBar progress={progress} showLabel={false} height={4} gradientColors={progressBarGradient} trackColor="rgba(0,0,0,0.05)" />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          {typeof title === 'string' ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <View style={styles.title}>{title}</View>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {/* Content */}
        <View style={styles.body}>{children}</View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.floatingButtonContainer} pointerEvents="box-none">
        {onSkip && (
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [
              styles.skipButton,
              pressed && { opacity: 0.7 }
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}
        
        <Pressable
          onPress={handleNext}
          disabled={!canContinue || loading || isProcessing}
          delayPressIn={0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.floatingButtonWrapper,
            (!canContinue || loading || isProcessing) && styles.floatingButtonDisabled,
            pressed && !(!canContinue || loading || isProcessing) && { opacity: 0.9 }
          ]}
        >
          <View
            style={[
              styles.floatingButton,
              canContinue && !loading && !isProcessing && styles.floatingButtonActive,
              (!canContinue || loading || isProcessing) && styles.floatingButtonDisabled
            ]}
          >
            {canContinue && !loading && !isProcessing ? (
              <LinearGradient
                colors={buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text style={[
              styles.floatingButtonText,
              (!canContinue || loading || isProcessing) && styles.floatingButtonTextDisabled
            ]}>{loading || isProcessing ? "Continuing" : nextLabel}</Text>
            <ChevronRight 
              size={20} 
              color={(!canContinue || loading || isProcessing) ? Colors.textTertiary : "#FFFFFF"} 
            />
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 36,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontFamily: Fonts.secondary.bold,
  },
  body: {
    gap: 16,
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 34,
    backgroundColor: 'rgba(132, 250, 176, 0.2)',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
  floatingButtonActive: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  floatingButtonAnimated: {
    borderRadius: 24,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderWidth: 0,
  },
  floatingButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  shimmer: {
    position: 'absolute',
    top: -50,
    bottom: -50,
    width: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  buttonGlassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(65, 105, 225, 0.4)',
    pointerEvents: 'none',
  },
  buttonGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  floatingButtonTextBright: {
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
