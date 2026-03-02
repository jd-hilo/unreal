import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { getProfile, saveOnboardingResponse, updateProfileFields } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors, Fonts } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

const OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function GenderScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selected, setSelected] = useState('');
  const [otherText, setOtherText] = useState('');
  const otherInputRef = useRef<TextInput>(null);
  const otherHeight = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - gender');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const stored = profile?.core_json?.onboarding_responses?.['gender'] ?? profile?.gender;
      if (stored) {
        if (stored === 'Male' || stored === 'Female') {
          setSelected(stored);
        } else if (stored) {
          setSelected('Other');
          setOtherText(stored);
        }
      }
    } catch (e) {
      console.error('Failed to load gender:', e);
    }
  }

  function handleSelect(option: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(option);
    if (option === 'Other') {
      Animated.spring(otherHeight, { toValue: 56, useNativeDriver: false, damping: 18, stiffness: 200 }).start();
      setTimeout(() => otherInputRef.current?.focus(), 200);
    } else {
      Animated.spring(otherHeight, { toValue: 0, useNativeDriver: false, damping: 18, stiffness: 200 }).start();
      otherInputRef.current?.blur();
    }
  }

  const finalValue = selected === 'Other' ? otherText.trim() : selected;
  const canContinue = selected === 'Other' ? otherText.trim().length > 0 : selected.length > 0;

  async function handleNext() {
    if (user && finalValue) {
      try {
        await saveOnboardingResponse(user.id, 'gender', finalValue);
        await updateProfileFields(user.id, { gender: finalValue });
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '00-gender',
          step_name: 'Gender',
        });
      } catch (e) {
        console.error('Failed to save gender:', e);
      }
    }
    router.push('/onboarding/motivate-reviews');
  }

  return (
    <OnboardingScreen
      title="What is your gender?"
      progress={0.33}
      onNext={handleNext}
      canContinue={canContinue}
    >
      <View style={styles.container}>
        {OPTIONS.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleSelect(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option}
              </Text>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <Animated.View style={[styles.otherInputWrap, { height: otherHeight, overflow: 'hidden' }]}>
          <TextInput
            ref={otherInputRef}
            style={styles.otherInput}
            placeholder="Describe your gender…"
            placeholderTextColor={Colors.textTertiary}
            value={otherText}
            onChangeText={setOtherText}
            maxLength={60}
            returnKeyType="done"
          />
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.07)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  optionSelected: {
    borderColor: '#25729f',
    borderBottomColor: '#25729f',
    backgroundColor: 'rgba(37,114,159,0.04)',
  },
  optionText: {
    fontSize: 17,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '700',
    color: '#25729f',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#25729f',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#25729f',
  },
  otherInputWrap: {
    marginTop: 4,
  },
  otherInput: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
  },
});
