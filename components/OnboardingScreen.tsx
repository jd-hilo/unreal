import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ReactNode } from 'react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

interface OnboardingScreenProps {
  title: string;
  progress: number;
  onNext: () => void;
  onSkip?: () => void;
  children: ReactNode;
  nextLabel?: string;
  loading?: boolean;
}

export function OnboardingScreen({
  title,
  progress,
  onNext,
  onSkip,
  children,
  nextLabel = 'Continue',
  loading = false,
}: OnboardingScreenProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <ProgressBar progress={progress} showLabel={false} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.body}>{children}</View>
      </ScrollView>

      <View style={styles.footer}>
        {onSkip && (
          <Button
            title="Skip"
            onPress={onSkip}
            variant="outline"
            size="medium"
            style={styles.skipButton}
          />
        )}
        <Button
          title={nextLabel}
          onPress={onNext}
          variant="primary"
          size="large"
          style={styles.nextButton}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
    lineHeight: 36,
  },
  body: {
    marginBottom: 32,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  skipButton: {
    marginBottom: 8,
  },
  nextButton: {
    width: '100%',
  },
});
