import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Animated } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const CAREER_GOALS = [
  { id: 'cg1', emoji: '📈', label: 'Get promoted' },
  { id: 'cg2', emoji: '🔄', label: 'Switch industries' },
  { id: 'cg3', emoji: '🚀', label: 'Start my own thing' },
  { id: 'cg4', emoji: '⭐', label: 'Land my dream role' },
  { id: 'cg5', emoji: '🎓', label: 'Build expertise' },
];

const HEALTH_GOALS = [
  { id: 'hg1', emoji: '⚖️', label: 'Lose weight' },
  { id: 'hg2', emoji: '💪', label: 'Get stronger' },
  { id: 'hg3', emoji: '😴', label: 'Sleep better' },
  { id: 'hg4', emoji: '🧘', label: 'Manage stress' },
  { id: 'hg5', emoji: '📅', label: 'Build a routine' },
];

const CUSTOM_GOALS = [
  { id: 'xg1', emoji: '❤️', label: 'Improve relationships' },
  { id: 'xg2', emoji: '💰', label: 'Save more money' },
  { id: 'xg3', emoji: '✈️', label: 'Travel more' },
  { id: 'xg4', emoji: '📚', label: 'Learn something new' },
  { id: 'xg5', emoji: '🏠', label: 'Move to a new place' },
];

const ALL_GOALS = [...CAREER_GOALS, ...HEALTH_GOALS, ...CUSTOM_GOALS];

const SECTIONS = [
  { key: 'career', title: 'Career', items: CAREER_GOALS },
  { key: 'health', title: 'Health', items: HEALTH_GOALS },
  { key: 'custom', title: 'Other', items: CUSTOM_GOALS },
];

function getCategory(id: string): 'career' | 'health' | 'custom' {
  if (id.startsWith('cg')) return 'career';
  if (id.startsWith('hg')) return 'health';
  return 'custom';
}

export default function GoalsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - goals');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const raw = profile?.core_json?.onboarding_responses?.['goals'];
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const career = Array.isArray(parsed.career) ? parsed.career : [];
          const health = Array.isArray(parsed.health) ? parsed.health : [];
          const custom = Array.isArray(parsed.custom) ? parsed.custom : [];
          setSelectedIds([...career, ...health, ...custom]);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  }

  function toggleGoal(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const cat = getCategory(id);
      const inCat = prev.filter((x) => getCategory(x) === cat).length;
      if (inCat >= 5) return prev;
      return [...prev, id];
    });
  }

  function getPayload() {
    const career = selectedIds.filter((id) => getCategory(id) === 'career');
    const health = selectedIds.filter((id) => getCategory(id) === 'health');
    const custom = selectedIds.filter((id) => getCategory(id) === 'custom');
    return { career, health, custom };
  }

  async function handleNext() {
    if (!user || selectedIds.length === 0) return;
    try {
      const payload = JSON.stringify(getPayload());
      await saveOnboardingResponse(user.id, 'goals', payload);
      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'goals',
        step_name: 'Goals',
      });
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push('/onboarding/journey-preview');
  }

  return (
    <OnboardingScreen
      title="What are your goals?"
      progress={0.65}
      onNext={handleNext}
      canContinue={selectedIds.length > 0}
    >
      <View style={styles.scrollContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
          scrollEventThrottle={16}
        >
          <Text style={styles.subtitle}>Select all that apply</Text>

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
                      onPress={() => toggleGoal(opt.id)}
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

        {contentHeight > scrollViewHeight && (
          <View style={styles.scrollbarTrack}>
            <Animated.View
              style={[
                styles.scrollbarThumb,
                {
                  height: Math.max(30, (scrollViewHeight / contentHeight) * scrollViewHeight),
                  top: scrollY.interpolate({
                    inputRange: [0, Math.max(1, contentHeight - scrollViewHeight)],
                    outputRange: [0, scrollViewHeight - Math.max(30, (scrollViewHeight / contentHeight) * scrollViewHeight)],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
    paddingRight: 8,
  },
  scrollbarTrack: {
    width: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginLeft: 4,
    position: 'relative',
  },
  scrollbarThumb: {
    width: 4,
    backgroundColor: Colors.gradients.turquoise[1],
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    fontWeight: '400',
  },
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
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
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
