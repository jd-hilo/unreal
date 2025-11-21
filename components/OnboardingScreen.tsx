import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronRight, Sparkles } from 'lucide-react-native';

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
  backgroundGradient = ['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E'],
  buttonGradient = ['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)'],
  progressBarGradient = ['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)'],
  buttonShadowColor = 'rgba(135, 206, 250, 0.5)',
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
    
    // Set both immediately to prevent any race conditions
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      await onNext();
    } catch (error) {
      console.error('Error in handleNext:', error);
    } finally {
      // Keep disabled briefly to prevent double-tap
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 500);
    }
  }

  return (
    <LinearGradient
      colors={backgroundGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradientBackground}
    >
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Progress Header */}
      <View style={styles.header}>
          <ProgressBar progress={progress} showLabel={false} gradientColors={progressBarGradient} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
      <View style={styles.floatingButtonContainer}>
        {onSkip && (
          <TouchableOpacity
            onPress={onSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        
        <Animated.View 
          style={[
            styles.floatingButtonWrapper,
            animatedButton && canContinue && !loading && !isProcessing && {
              transform: [{ scale: pulseAnim }],
            }
          ]}
        >
          {animatedButton && canContinue && !loading && !isProcessing && (
            <Animated.View
              style={[
                styles.buttonGlow,
                {
                  opacity: glowOpacity,
                }
              ]}
              pointerEvents="none"
            />
          )}
          <BlurView intensity={animatedButton ? 40 : 80} tint="dark" style={[
            styles.floatingButton,
            (!canContinue || loading || isProcessing) && styles.floatingButtonDisabled,
            animatedButton && canContinue && !loading && !isProcessing && styles.floatingButtonAnimated
          ]}>
            {/* Animated gradient background for bright button */}
            {animatedButton && canContinue && !loading && !isProcessing ? (
              <LinearGradient
                colors={['rgba(135, 206, 250, 1)', 'rgba(100, 181, 246, 1)', 'rgba(135, 206, 250, 1)', 'rgba(147, 197, 253, 1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              >
                {/* Shimmer effect */}
                <Animated.View
                  style={[
                    styles.shimmer,
                    {
                      transform: [{ translateX: shimmerTranslateX }],
                    }
                  ]}
                  pointerEvents="none"
                />
              </LinearGradient>
            ) : (
              <>
                {/* Classic glass border */}
                <View style={styles.buttonGlassBorder} />
                {/* Subtle inner highlight */}
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGlassHighlight}
                  pointerEvents="none"
                />
              </>
            )}
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canContinue || loading || isProcessing || isProcessingRef.current}
              activeOpacity={0.9}
              style={styles.floatingButtonInner}
            >
              {loading || isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.processingSpinner} />
                  <Text style={styles.floatingButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Text style={[
                    styles.floatingButtonText,
                    animatedButton && canContinue && !loading && !isProcessing && styles.floatingButtonTextBright
                  ]}>{nextLabel}</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
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
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 24,
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
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    fontWeight: '600',
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 34,
    backgroundColor: 'rgba(135, 206, 250, 0.4)',
    shadowColor: 'rgba(135, 206, 250, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  floatingButton: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  floatingButtonAnimated: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'rgba(135, 206, 250, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 12,
  },
  floatingButtonDisabled: {
    opacity: 0.6,
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
    borderColor: 'rgba(135, 206, 250, 0.4)',
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
  },
  floatingButtonTextBright: {
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  processingSpinner: {
    marginRight: 0,
  },
});
