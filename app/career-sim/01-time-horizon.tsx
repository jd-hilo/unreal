import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const TIME_HORIZONS = [
  { value: 5, label: '5 Years', desc: 'Near-term outlook', icon: '🎯' },
  { value: 10, label: '10 Years', desc: 'Mid-career view', icon: '🚀' },
  { value: 15, label: '15 Years', desc: 'Long-term vision', icon: '🔮' },
] as const;

export default function TimeHorizonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [timeHorizon, setTimeHorizon] = useState<5 | 10 | 15>(
    (params.timeHorizon ? parseInt(params.timeHorizon as string) : 10) as 5 | 10 | 15
  );

  const handleTimeHorizonPress = (value: 5 | 10 | 15) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeHorizon(value);
  };

  const handleNext = () => {
    router.push({
      pathname: '/career-sim/02-current-role',
      params: {
        timeHorizon: timeHorizon.toString(),
      },
    });
  };

  return (
    <OnboardingScreen
      title="Time Horizon"
      subtitle="How far into the future would you like to simulate?"
      progress={0.25}
      onNext={handleNext}
      canContinue={true}
      nextLabel="Continue"
    >
      <View style={styles.container}>
        <View style={styles.timeHorizonGrid}>
          {TIME_HORIZONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeCard,
                timeHorizon === option.value && styles.timeCardSelected
              ]}
              onPress={() => handleTimeHorizonPress(option.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.timeCardEmoji}>{option.icon}</Text>
              <Text style={[
                styles.timeCardLabel,
                timeHorizon === option.value && styles.timeCardLabelSelected
              ]}>
                {option.label}
              </Text>
              <Text style={styles.timeCardDesc}>{option.desc}</Text>
              {timeHorizon === option.value && (
                <View style={styles.selectedIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  timeHorizonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  timeCardSelected: {
    borderColor: Colors.gradients.purple[1],
    backgroundColor: 'rgba(192, 132, 252, 0.02)',
  },
  timeCardEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  timeCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  timeCardLabelSelected: {
    color: Colors.gradients.purple[1],
  },
  timeCardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gradients.purple[1],
  },
});
