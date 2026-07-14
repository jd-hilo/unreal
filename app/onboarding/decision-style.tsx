import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const OPTIONS: { id: string; title: string; value: string }[] = [
  { id: 'gut', title: 'Trust my gut', value: 'I usually trust my gut and decide quickly when something feels right or wrong.' },
  { id: 'research', title: 'Research first', value: 'I like to research options, compare facts, and decide when I feel informed.' },
  { id: 'people', title: 'Ask people I trust', value: 'I talk to people I trust and weigh their input before I decide.' },
  { id: 'reflect', title: 'Need time to reflect', value: 'I need time alone to think things through before I commit to a choice.' },
];

export default function DecisionStyleOnboardingScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - decision-style');
    }, [])
  );

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const profile = await getProfile(user.id);
        const existing = profile?.core_json?.onboarding_responses?.['04-style'];
        if (typeof existing === 'string' && existing.trim()) {
          const match = OPTIONS.find((o) => o.value === existing || existing.includes(o.title));
          if (match) setSelectedId(match.id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  async function handleNext() {
    if (!user || !selectedId) return;
    const opt = OPTIONS.find((o) => o.id === selectedId);
    if (!opt) return;
    try {
      await saveOnboardingResponse(user.id, '04-style', opt.value);
      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'decision-style',
        step_name: 'Decision Style',
      });
    } catch (e) {
      console.error('Failed to save decision style:', e);
    }
    router.push('/onboarding/dream-intro');
  }

  return (
    <OnboardingScreen
      title="How do you usually decide?"
      subtitle="Pick what fits you best"
      progress={0.61}
      onNext={handleNext}
      canContinue={!!selectedId}
      nextLabel="Continue"
    >
      <View style={styles.list}>
        {OPTIONS.map((o) => {
          const on = selectedId === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              style={[styles.card, on && styles.cardSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedId(o.id);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.cardTitle, on && styles.cardTitleSelected]}>{o.title}</Text>
              <Text style={styles.cardHint}>{o.value}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardSelected: {
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  cardTitleSelected: { color: Colors.gradients.turquoise[0] },
  cardHint: {
    fontSize: 13,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
