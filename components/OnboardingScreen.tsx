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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Progress Header */}
      <View style={styles.header}>
        <ProgressBar progress={progress} showLabel={false} />
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
            (!canContinue || loading || isProcessing) && styles.floatingButtonDisabled
          ]}
        >
          <LinearGradient
            colors={canContinue && !loading && !isProcessing ? ['#B795FF', '#8A5CFF', '#6E3DF0'] : ['rgba(59, 37, 109, 0.5)', 'rgba(59, 37, 109, 0.5)']}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
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
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: '#0C0C10',
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#B795FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
