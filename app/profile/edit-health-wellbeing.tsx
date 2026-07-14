import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { getProfile, saveOnboardingResponse } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  { key: 'activity', title: 'Activity level', items: ACTIVITY_OPTIONS },
  { key: 'sleep', title: 'Sleep', items: SLEEP_OPTIONS },
  { key: 'stress', title: 'Stress', items: STRESS_OPTIONS },
  { key: 'diet', title: 'Diet', items: DIET_OPTIONS },
  { key: 'energy', title: 'Energy', items: ENERGY_OPTIONS },
];

export default function EditHealthWellbeingScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [method, setMethod] = useState<HealthMethod>('preset');
  const [appleContent, setAppleContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const raw = profile?.core_json?.onboarding_responses?.['health'];
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed?.method === 'apple_health' && parsed?.content) {
            setAppleContent(parsed.content);
            setMethod('apple_health');
          } else if (parsed?.presetIds && Array.isArray(parsed.presetIds)) {
            setSelectedIds(parsed.presetIds);
            setMethod('preset');
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  }

  function toggle(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setMethod('preset');
  }

  function getPresetContent(): string {
    return selectedIds
      .map((id) => ALL_HEALTH_OPTIONS.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(', ');
  }

  async function handleSave() {
    if (!user) return;
    if (method === 'apple_health' && !appleContent.trim()) {
      return;
    }
    if (method === 'preset' && selectedIds.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const payload =
        method === 'apple_health'
          ? JSON.stringify({ method: 'apple_health', content: appleContent.trim() })
          : JSON.stringify({ method: 'preset', content: getPresetContent(), presetIds: selectedIds });
      await saveOnboardingResponse(user.id, 'health', payload);
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.textSecondary} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['rgba(232, 122, 127, 0.12)', 'rgba(132, 250, 176, 0.12)', 'rgba(192, 132, 252, 0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health & wellbeing</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {method === 'apple_health' && (
            <View style={styles.block}>
              <Text style={styles.label}>Summary</Text>
              <TextInput
                style={styles.input}
                multiline
                value={appleContent}
                onChangeText={setAppleContent}
                placeholder="Describe your health snapshot"
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity onPress={() => setMethod('preset')} style={styles.switchLink}>
                <Text style={styles.switchLinkText}>Use quick selections instead</Text>
              </TouchableOpacity>
            </View>
          )}

          {method === 'preset' && (
            <>
              <Text style={styles.intro}>Select all that describe you right now.</Text>
              {SECTIONS.map((section) => (
                <View key={section.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.grid}>
                    {section.items.map((opt) => {
                      const on = selectedIds.includes(opt.id);
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.card, on && styles.cardOn]}
                          onPress={() => toggle(opt.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.emoji}>{opt.emoji}</Text>
                          <Text style={[styles.cardLabel, on && styles.cardLabelOn]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveWrap, (method === 'preset' ? selectedIds.length === 0 : !appleContent.trim()) && styles.saveDisabled]}
          onPress={handleSave}
          disabled={loading || (method === 'preset' ? selectedIds.length === 0 : !appleContent.trim())}
          activeOpacity={0.9}
        >
          <LinearGradient colors={Colors.gradients.turquoise} style={styles.saveGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveText}>Save</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontFamily: Fonts.secondary.bold, fontWeight: '700', color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  intro: { fontSize: 15, color: Colors.textSecondary, marginBottom: 16, fontFamily: Fonts.secondary.regular },
  block: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, fontFamily: Fonts.secondary.bold },
  input: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    fontSize: 15,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  switchLink: { marginTop: 12 },
  switchLinkText: { fontSize: 14, color: Colors.gradients.turquoise[0], fontFamily: Fonts.secondary.bold },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    width: '48%',
  },
  cardOn: { borderColor: Colors.gradients.turquoise[1], borderWidth: 2 },
  emoji: { fontSize: 20, marginRight: 8 },
  cardLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, flex: 1, fontFamily: Fonts.secondary.regular },
  cardLabelOn: { color: Colors.textPrimary, fontWeight: '700', fontFamily: Fonts.secondary.bold },
  saveWrap: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  saveDisabled: { opacity: 0.45 },
  saveGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 24,
  },
  saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
});
