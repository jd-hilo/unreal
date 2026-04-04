import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { connectAppleHealth, isAppleHealthAvailable } from '@/lib/integrations/health';
import { Heart } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';

type HealthMethod = 'apple_health' | 'preset';

const ACTIVITY_OPTIONS = [
  { id: 'h1', emoji: '🏃', label: 'Very active' },
  { id: 'h2', emoji: '🚶', label: 'Somewhat active' },
  { id: 'h3', emoji: '🛋️', label: 'Mostly sedentary' },
];

const SLEEP_OPTIONS = [
  { id: 'h4', emoji: '😴', label: 'Poor sleep' },
  { id: 'h5', emoji: '🌙', label: 'Good sleep' },
];

const STRESS_OPTIONS = [
  { id: 'h6', emoji: '😰', label: 'High stress' },
  { id: 'h7', emoji: '😌', label: 'Low stress' },
];

const DIET_OPTIONS = [
  { id: 'h8', emoji: '🥗', label: 'Eat well' },
  { id: 'h9', emoji: '🍔', label: 'Could eat better' },
];

const ENERGY_OPTIONS = [
  { id: 'h10', emoji: '⚡', label: 'Low energy' },
  { id: 'h11', emoji: '💪', label: 'Feel strong' },
];

const ALL_HEALTH_OPTIONS = [
  ...ACTIVITY_OPTIONS,
  ...SLEEP_OPTIONS,
  ...STRESS_OPTIONS,
  ...DIET_OPTIONS,
  ...ENERGY_OPTIONS,
];

const SECTIONS = [
  { key: 'activity', title: 'Activity Level', items: ACTIVITY_OPTIONS },
  { key: 'sleep', title: 'Sleep', items: SLEEP_OPTIONS },
  { key: 'stress', title: 'Stress', items: STRESS_OPTIONS },
  { key: 'diet', title: 'Diet', items: DIET_OPTIONS },
  { key: 'energy', title: 'Energy', items: ENERGY_OPTIONS },
];

export default function HealthScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [method, setMethod] = useState<HealthMethod>('preset');
  const [appleHealthContent, setAppleHealthContent] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - health');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const raw = profile?.core_json?.onboarding_responses?.['health'];
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed?.method === 'apple_health' && parsed?.content) {
            setAppleHealthContent(parsed.content);
            setMethod('apple_health');
          } else if (parsed?.presetIds && Array.isArray(parsed.presetIds)) {
            setSelectedIds(parsed.presetIds);
            setMethod('preset');
          } else if (parsed?.content) {
            setMethod('preset');
            const labels = parsed.content.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean);
            const ids = ALL_HEALTH_OPTIONS.filter((o) => labels.some((l: string) => o.label.toLowerCase().includes(l.toLowerCase()))).map((o) => o.id);
            if (ids.length > 0) setSelectedIds(ids);
          }
        } catch {
          if (typeof raw === 'string') {
            const labels = raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
            const ids = ALL_HEALTH_OPTIONS.filter((o) => labels.some((l) => o.label.toLowerCase().includes(l.toLowerCase()))).map((o) => o.id);
            if (ids.length > 0) setSelectedIds(ids);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load health:', error);
    }
  }

  async function handleConnectAppleHealth() {
    if (!isAppleHealthAvailable()) {
      Alert.alert(
        'Coming soon',
        'Apple Health requires a development build with HealthKit. Select options below for now.',
        [{ text: 'OK' }]
      );
      setMethod('preset');
      return;
    }
    setHealthLoading(true);
    try {
      const result = await connectAppleHealth();
      if (result?.content) {
        setAppleHealthContent(result.content);
        setMethod('apple_health');
      } else {
        Alert.alert('Connection failed', 'Select options below instead.');
        setMethod('preset');
      }
    } catch (e) {
      Alert.alert('Connection failed', 'Select options below instead.');
      setMethod('preset');
    } finally {
      setHealthLoading(false);
    }
  }

  function togglePreset(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    setMethod('preset');
  }

  function getContent(): string {
    if (method === 'apple_health') return appleHealthContent;
    return selectedIds
      .map((id) => ALL_HEALTH_OPTIONS.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(', ');
  }

  const canContinue = method === 'apple_health' ? appleHealthContent.trim().length > 5 : selectedIds.length > 0;

  async function handleNext() {
    if (!user || !canContinue) return;
    try {
      const payload =
        method === 'apple_health'
          ? JSON.stringify({ method: 'apple_health', content: appleHealthContent.trim() })
          : JSON.stringify({ method: 'preset', content: getContent(), presetIds: selectedIds });
      await saveOnboardingResponse(user.id, 'health', payload);
      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'health',
        step_name: 'Health',
      });
    } catch (error) {
      console.error('Failed to save health:', error);
    }
    router.push('/onboarding/dream-intro');
  }

  return (
    <OnboardingScreen
      title="How's your health right now?"
      subtitle={Platform.OS === 'ios' ? undefined : 'Select all that describe you'}
      progress={0.58}
      onNext={handleNext}
      canContinue={canContinue}
    >
      <View style={styles.topOptions}>
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.appleHealthOption, method === 'apple_health' && styles.optionSelected]}
            onPress={handleConnectAppleHealth}
            disabled={healthLoading}
          >
            {healthLoading ? (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            ) : (
              <Heart size={20} color={method === 'apple_health' ? '#25729f' : Colors.textSecondary} />
            )}
            <Text style={[styles.optionLabel, method === 'apple_health' && styles.optionLabelSelected]}>
              Connect Apple Health
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        {Platform.OS === 'ios' ? 'Or select all that describe you' : 'Select all that describe you'}
      </Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.card, isSelected && styles.cardSelected]}
                    onPress={() => togglePreset(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emoji}>{opt.emoji}</Text>
                    <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  topOptions: { marginBottom: 12 },
  appleHealthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  optionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.turquoise[1],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionLabelSelected: { color: Colors.textPrimary, fontWeight: '700' },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontWeight: '400',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    width: '48%',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.turquoise[1],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  emoji: { fontSize: 24, marginRight: 8 },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  cardLabelSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});
