import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { Building2 } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

export default function CompanyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [company, setCompany] = useState('');

  useEffect(() => {
    if (params.company) {
      setCompany(params.company as string);
    }
  }, [params.company]);

  const handleNext = () => {
    router.push({
      pathname: '/career-sim/04-salary',
      params: {
        timeHorizon: params.timeHorizon as string,
        currentRole: params.currentRole as string,
        company: company.trim(),
      },
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <OnboardingScreen
      title="Your Company"
      subtitle="Where do you currently work?"
      progress={0.75}
      onNext={handleNext}
      onBack={handleBack}
      canContinue={company.trim().length > 0}
      nextLabel="Continue"
    >
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Building2 size={18} color={Colors.textSecondary} strokeWidth={2} />
          </View>
          <Input
            placeholder="Company (e.g., TechCorp)"
            value={company}
            onChangeText={setCompany}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
            containerStyle={styles.inputContainer}
            placeholderTextColor={Colors.textTertiary}
          />
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
});
