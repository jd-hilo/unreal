import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Input } from '@/components/Input';
import { Briefcase } from 'lucide-react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

export default function CurrentRoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const [currentRole, setCurrentRole] = useState('');

  useEffect(() => {
    if (params.currentRole) {
      setCurrentRole(params.currentRole as string);
    } else {
      loadProfileData();
    }
  }, [params.currentRole]);

  const loadProfileData = async () => {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.core_json?.primary_role) {
        setCurrentRole(profile.core_json.primary_role);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleNext = () => {
    router.push({
      pathname: '/career-sim/03-company',
      params: {
        timeHorizon: params.timeHorizon as string,
        currentRole: currentRole.trim(),
      },
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <OnboardingScreen
      title="Your Current Role"
      subtitle="Tell us about your current position"
      progress={0.5}
      onNext={handleNext}
      onBack={handleBack}
      canContinue={currentRole.trim().length > 0}
      nextLabel="Continue"
    >
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Briefcase size={18} color={Colors.textSecondary} strokeWidth={2} />
          </View>
          <Input
            placeholder="Current Role (e.g., Senior Software Engineer)"
            value={currentRole}
            onChangeText={setCurrentRole}
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
