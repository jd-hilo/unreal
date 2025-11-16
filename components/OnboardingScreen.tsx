import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { ReactNode, useState } from 'react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
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
  buttonGradient = ['#4169E1', '#1E40AF', '#1E3A8A'],
  progressBarGradient = ['#4169E1', '#1E40AF', '#1E3A8A'],
  buttonShadowColor = '#4169E1',
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
        
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canContinue || loading || isProcessing}
          activeOpacity={0.9}
          style={[
            styles.floatingButton,
              { shadowColor: canContinue && !loading && !isProcessing ? buttonShadowColor : 'rgba(100, 100, 100, 0.3)' },
            (!canContinue || loading || isProcessing) && styles.floatingButtonDisabled
          ]}
        >
          <LinearGradient
              colors={canContinue && !loading && !isProcessing ? buttonGradient : ['rgba(100, 100, 100, 0.5)', 'rgba(80, 80, 80, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingButtonGradient}
          >
            <Text style={styles.floatingButtonText}>
              {loading || isProcessing ? 'Processing...' : nextLabel}
            </Text>
            {!loading && !isProcessing && <ChevronRight size={20} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
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
  floatingButton: {
    borderRadius: 24,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
