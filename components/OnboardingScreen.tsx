import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { ReactNode, useState } from 'react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronRight, Sparkles } from 'lucide-react-native';

interface OnboardingScreenProps {
  title: string;
  subtitle?: string;
  progress: number;
  onNext: () => void;
  onSkip?: () => void;
  children: ReactNode;
  nextLabel?: string;
  loading?: boolean;
  canContinue?: boolean;
  backgroundGradient?: string[];
  buttonGradient?: string[];
  progressBarGradient?: string[];
  buttonShadowColor?: string;
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
}: OnboardingScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleNext() {
    if (isProcessing || !canContinue || loading) return;
    
    setIsProcessing(true);
    try {
      await onNext();
    } finally {
      // Keep disabled briefly to prevent double-tap
      setTimeout(() => setIsProcessing(false), 500);
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
        <Text style={styles.title}>{title}</Text>
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
        
        <View style={styles.floatingButtonWrapper}>
          <BlurView intensity={80} tint="dark" style={[
            styles.floatingButton,
            (!canContinue || loading || isProcessing) && styles.floatingButtonDisabled
          ]}>
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
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canContinue || loading || isProcessing}
              activeOpacity={0.9}
              style={styles.floatingButtonInner}
            >
              <Text style={styles.floatingButtonText}>
                {loading || isProcessing ? 'Processing...' : nextLabel}
              </Text>
              {!loading && !isProcessing && <ChevronRight size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </BlurView>
        </View>
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
    lineHeight: 40,
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
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingButton: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  floatingButtonDisabled: {
    opacity: 0.6,
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
});
