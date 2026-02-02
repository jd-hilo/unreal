import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { DollarSign } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

export default function SalaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [salary, setSalary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.salary) {
      setSalary(params.salary as string);
    }
  }, [params.salary]);

  const handleNext = async () => {
    if (!salary.trim()) return;
    
    setLoading(true);
    // Navigate to generating screen which will call the API and then navigate to result
    router.push({
      pathname: '/career-sim/generating',
      params: {
        timeHorizon: params.timeHorizon as string,
        currentRole: params.currentRole as string,
        company: params.company as string,
        salary: salary.trim(),
        pathType: 'stay',
      },
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <OnboardingScreen
      title="Your Current Salary"
      subtitle="What is your current annual salary?"
      progress={1.0}
      onNext={handleNext}
      onBack={handleBack}
      canContinue={salary.trim().length > 0}
      nextLabel={loading ? 'Running...' : 'Run Simulation'}
      loading={loading}
    >
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <DollarSign size={18} color={Colors.textSecondary} strokeWidth={2} />
          </View>
          <Input
            placeholder="Current Salary (e.g., 150000)"
            value={salary}
            onChangeText={setSalary}
            keyboardType="numeric"
            returnKeyType="done"
            style={styles.input}
            containerStyle={styles.inputContainer}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            We'll simulate your career trajectory based on industry data, typical progression patterns, and realistic assumptions.
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 0,
    fontFamily: Fonts.secondary.regular,
  },
  infoBox: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  infoBoxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
  },
});
