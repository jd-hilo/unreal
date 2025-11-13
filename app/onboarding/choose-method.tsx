import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';

export default function ChooseOnboardingMethod() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<'ai' | 'manual' | null>(null);

  function handleContinue() {
    if (selectedMethod === 'ai') {
      router.push('/ai-onboarding/call');
    } else if (selectedMethod === 'manual') {
      router.push('/onboarding/00-name');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Build Your Twin</Text>
          <Text style={styles.question}>
            Are you in a quiet place to have a conversation with our Digital Twin Builder Sol?
          </Text>
        </View>

        <View style={styles.options}>
          {/* AI Voice Option - Emphasized */}
          <TouchableOpacity
            style={[
              styles.primaryCard,
              selectedMethod === 'ai' && styles.primaryCardSelected,
            ]}
            onPress={() => setSelectedMethod('ai')}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <Text style={styles.primaryTitle}>Yes, let's talk</Text>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === 'ai' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Manual Option - De-emphasized */}
          <TouchableOpacity
            style={[
              styles.secondaryCard,
              selectedMethod === 'manual' && styles.secondaryCardSelected,
            ]}
            onPress={() => setSelectedMethod('manual')}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <Text style={styles.secondaryTitle}>I rather complete manually</Text>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === 'manual' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          size="large"
          disabled={!selectedMethod}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  question: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '500',
  },
  options: {
    gap: 16,
    marginTop: 40,
  },
  optionContent: {
    flex: 1,
  },
  // Primary option (AI Voice) - Emphasized
  primaryCard: {
    backgroundColor: 'rgba(183, 149, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#B795FF',
    borderRadius: 18,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#B795FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryCardSelected: {
    backgroundColor: 'rgba(183, 149, 255, 0.25)',
    borderColor: '#FFFFFF',
  },
  primaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Secondary option (Manual) - De-emphasized
  secondaryCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryCardSelected: {
    borderColor: 'rgba(183, 149, 255, 0.5)',
    backgroundColor: 'rgba(183, 149, 255, 0.05)',
  },
  secondaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(200, 200, 200, 0.7)',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(200, 200, 200, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#B795FF',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
});

