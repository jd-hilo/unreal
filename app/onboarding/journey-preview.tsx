import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile, saveOnboardingResponse, saveDailyTasks, getLocalDateString } from '@/lib/storage';
import { generateJourney } from '@/lib/ai';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import type { JourneyData, JourneyPhase, JourneyTaskPreview, JourneyMilestone } from '@/lib/journey';
import { Colors, Fonts } from '@/constants/Theme';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORY_COLORS: Record<string, string> = {
  Career: '#25729f', Health: '#62edb9', Growth: '#9B59B6',
  Personal: '#E87A7F', Lifestyle: '#F39C12', Financial: '#27AE60',
};

const getCategoryEmoji = (category: string): string => {
  const cat = (category || 'Growth').toLowerCase();
  if (cat.includes('financial') || cat.includes('career')) return '💰';
  if (cat.includes('personal')) return '👤';
  if (cat.includes('lifestyle')) return '🏠';
  if (cat.includes('health')) return '💪';
  return '✨';
};

const PHASE_ACCENTS = ['#25729f', '#62edb9', '#9B59B6', '#E87A7F'];

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'string') { try { return JSON.parse(raw) as T; } catch { return fallback; } }
  return raw as T;
}

function getWeekRange(phases: JourneyPhase[], index: number): string {
  let start = 1;
  for (let i = 0; i < index; i++) start += phases[i].estimated_weeks;
  return `Weeks ${start}–${start + phases[index].estimated_weeks - 1}`;
}

function computeSuccessProbability(goalCount: number, phaseCount: number): number {
  return Math.min(72 + Math.min(goalCount * 3, 15) + Math.min(phaseCount * 2, 8), 96);
}

function getReadinessScores(goals: { career: string[]; health: string[]; custom: string[] }) {
  return [
    { label: 'Career', pct: goals.career.length > 0 ? 40 + goals.career.length * 12 : 20 },
    { label: 'Health', pct: goals.health.length > 0 ? 35 + goals.health.length * 13 : 20 },
    { label: 'Growth', pct: goals.custom.length > 0 ? 45 + goals.custom.length * 10 : 25 },
    { label: 'Consistency', pct: 30 },
  ];
}

function getCategoryBreakdown(tasks: JourneyTaskPreview[]) {
  const counts: Record<string, number> = {};
  tasks.forEach((t) => { counts[t.category] = (counts[t.category] || 0) + 1; });
  const total = tasks.length || 1;
  return Object.entries(counts).sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({ category: cat, pct: Math.round((count / total) * 100), color: CATEGORY_COLORS[cat] || '#25729f' }));
}

const GOAL_LABELS: Record<string, string> = {
  cg1: 'Get promoted', cg2: 'Switch industries', cg3: 'Start my own thing',
  cg4: 'Land my dream role', cg5: 'Build expertise',
  hg1: 'Lose weight', hg2: 'Get stronger', hg3: 'Sleep better',
  hg4: 'Manage stress', hg5: 'Build a routine',
  xg1: 'Improve relationships', xg2: 'Save more money', xg3: 'Travel more',
  xg4: 'Learn something new', xg5: 'Move to a new place',
};

function buildFallbackMilestones(phases: JourneyPhase[], goalIds: string[], totalWeeks: number): JourneyMilestone[] {
  const firstGoal = goalIds.length > 0 ? (GOAL_LABELS[goalIds[0]] || goalIds[0]) : 'your first habit';
  const midGoal = goalIds.length > 1 ? (GOAL_LABELS[goalIds[1]] || goalIds[1]) : 'major progress';
  const firstPhase = phases[0];
  const lastPhase = phases[phases.length - 1];
  return [
    { emoji: '🌱', week: 1, title: `Start: ${firstGoal}` },
    { emoji: '🔥', week: firstPhase?.estimated_weeks || 4, title: `Complete ${firstPhase?.title || 'Phase 1'}` },
    { emoji: '⭐', week: Math.floor(totalWeeks / 2), title: `Reach: ${midGoal}` },
    { emoji: '🏆', week: totalWeeks, title: lastPhase ? `Finish ${lastPhase.title}` : 'Goals achieved' },
  ];
}

/* ── HorizontalBar ──────────────────────────────────── */
function HorizontalBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(widthAnim, { toValue: pct, duration: 800, useNativeDriver: false }).start(); }, [pct]);
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={styles.barPct}>{pct}%</Text>
    </View>
  );
}

/* ── ProbabilityRing ────────────────────────────────── */
function ProbabilityRing({ pct }: { pct: number }) {
  const size = 100;
  const stroke = 8;
  return (
    <View style={styles.ringContainer}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.ringBg, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke }]} />
        <View style={[styles.ringFillOuter, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: '#25729f', borderTopColor: 'transparent', borderRightColor: pct > 25 ? '#25729f' : 'transparent', borderBottomColor: pct > 50 ? '#25729f' : 'transparent', borderLeftColor: pct > 75 ? '#25729f' : 'transparent' }]} />
        <View style={styles.ringCenter}><Text style={styles.ringPct}>{pct}%</Text></View>
      </View>
      <Text style={styles.ringLabel}>Success probability</Text>
    </View>
  );
}

/* ── LoadingScreen ──────────────────────────────────── */
function LoadingScreen() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) => Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }), Animated.delay(800 - delay)]));
    Animated.parallel(dots.map((d, i) => anim(d, i * 200))).start();
  }, []);
  return (
    <OnboardingScreen title="Building your journey" progress={0.72} onNext={() => {}} canContinue={false}>
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#25729f" style={{ marginBottom: 20 }} />
          <Text style={styles.loadingHeading}>Crafting your path</Text>
          <Text style={styles.loadingSubtext}>Analysing your goals and building a personalised multi-phase journey just for you.</Text>
          <View style={styles.dotsRow}>
            {dots.map((dot, i) => <Animated.View key={i} style={[styles.dot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />)}
          </View>
        </View>
      </View>
    </OnboardingScreen>
  );
}

/* ── Main screen ────────────────────────────────────── */
export default function JourneyPreviewScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [isBuilding, setIsBuilding] = useState(true);
  const [goalCounts, setGoalCounts] = useState({ career: [] as string[], health: [] as string[], custom: [] as string[] });

  useFocusEffect(useCallback(() => { trackEvent('OB - journey-preview'); }, []));
  useEffect(() => { buildJourney(); }, [user?.id]);

  async function buildJourney() {
    if (!user) return;
    setIsBuilding(true);
    try {
      const profile = await getProfile(user.id);
      const responses = profile?.core_json?.onboarding_responses || {};

      const name = (profile?.first_name as string) || 'You';
      const gender = (responses['gender'] || profile?.gender) as string || 'Not specified';
      const birthYear = (responses['00-birth-year'] || profile?.birthday) as string;
      const age = birthYear ? String(new Date().getFullYear() - parseInt(birthYear, 10)) : undefined;
      const interests: string[] = Array.isArray(responses['interests']) ? responses['interests'] as string[] : parseJson<string[]>(responses['interests'], []);

      let career = 'Not specified';
      if (responses['career']) { const c = parseJson<{ content?: string }>(responses['career'], {}); career = c?.content || (typeof responses['career'] === 'string' ? responses['career'] : 'Not specified'); }
      let health = 'Not specified';
      if (responses['health']) { const h = parseJson<{ content?: string }>(responses['health'], {}); health = h?.content || (typeof responses['health'] === 'string' ? responses['health'] : 'Not specified'); }

      const goals = parseJson<{ career?: string[]; health?: string[]; custom?: string[] }>(responses['goals'], {});
      setGoalCounts({ career: goals.career || [], health: goals.health || [], custom: goals.custom || [] });
      const allGoalIds = [...(goals.career || []), ...(goals.health || []), ...(goals.custom || [])];

      const career_goals = (goals.career || []).map((id) => GOAL_LABELS[id] || id);
      const health_goals = (goals.health || []).map((id) => GOAL_LABELS[id] || id);
      const custom_goals = (goals.custom || []).map((id) => GOAL_LABELS[id] || id);

      const result = await generateJourney({ name, gender, birth_year: birthYear, age, interests, career, health, career_goals, health_goals, custom_goals });

      setJourney(result);
      await saveOnboardingResponse(user.id, 'journey', JSON.stringify(result));

      if (result.daily_task_preview.length > 0) {
        const allTasks = result.daily_task_preview.map((t) => ({
          task_content: t.task,
          category: t.category,
          scheduled_date: t.date,
          points: 10 + (t.day - 1) * 2 + Math.floor(Math.random() * 6),
        }));
        if (allTasks.length > 0) await saveDailyTasks(user.id, allTasks);
      }

      trackEvent(MixpanelEvents.STRATEGY_GENERATED, { type: 'journey' });
    } catch (err) {
      console.error('Journey build error:', err);
      const today = getLocalDateString();
      setJourney({
        phases: [
          { id: 'p1', title: 'Foundation', description: 'Build the basics and establish your rhythm.', estimated_weeks: 4, order: 1 },
          { id: 'p2', title: 'Momentum', description: 'Accelerate with consistent daily action.', estimated_weeks: 8, order: 2 },
          { id: 'p3', title: 'Breakthrough', description: 'Push through plateaus and level up.', estimated_weeks: 12, order: 3 },
        ],
        estimated_completion_weeks: 24,
        daily_task_preview: [
          { day: 1, date: today, task: 'Write down your top 3 priorities for this week', category: 'Growth' },
          { day: 1, date: today, task: 'Pick one small action you can do today', category: 'Growth' },
          { day: 1, date: today, task: 'Block 30 minutes on your calendar to complete that action', category: 'Growth' },
        ],
      });
    } finally {
      setIsBuilding(false);
    }
  }

  if (isBuilding && !journey) return <LoadingScreen />;

  const phases = journey?.phases || [];
  const allTasks = journey?.daily_task_preview || [];
  const dayOneTasks = allTasks.filter((t) => t.day === 1);
  const totalWeeks = journey?.estimated_completion_weeks || 24;
  const allGoalIds = [...goalCounts.career, ...goalCounts.health, ...goalCounts.custom];
  const totalGoals = allGoalIds.length;
  const successPct = computeSuccessProbability(totalGoals, phases.length);
  const readiness = getReadinessScores(goalCounts);
  const categoryBreakdown = getCategoryBreakdown(allTasks);
  const milestones: JourneyMilestone[] = (journey?.milestones && journey.milestones.length > 0)
    ? journey.milestones
    : buildFallbackMilestones(phases, allGoalIds, totalWeeks);

  return (
    <OnboardingScreen title="Your journey" progress={0.72} onNext={() => router.push('/onboarding/signature')} canContinue={!isBuilding} nextLabel="I'm ready">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Probability + stats ── */}
        <View style={styles.probabilitySection}>
          <ProbabilityRing pct={successPct} />
          <View style={styles.statsColumn}>
            <View style={styles.miniStat}><Text style={styles.miniStatValue}>{totalWeeks}</Text><Text style={styles.miniStatLabel}>weeks</Text></View>
            <View style={styles.miniStat}><Text style={styles.miniStatValue}>{phases.length}</Text><Text style={styles.miniStatLabel}>phases</Text></View>
            <View style={styles.miniStat}><Text style={styles.miniStatValue}>{totalGoals}</Text><Text style={styles.miniStatLabel}>goals</Text></View>
          </View>
        </View>

        {/* ── Readiness ── */}
        <Text style={styles.sectionLabel}>Your readiness</Text>
        <View style={styles.card}>
          {readiness.map((r, i) => <HorizontalBar key={i} label={r.label} pct={Math.min(r.pct, 100)} color={PHASE_ACCENTS[i % PHASE_ACCENTS.length]} />)}
          <Text style={styles.readinessNote}>Consistency builds as you complete daily tasks</Text>
        </View>

        {/* ── Phases ── */}
        <Text style={styles.sectionLabel}>Your phases</Text>
        <View style={styles.phasesContainer}>
          {phases.map((phase, i) => {
            const accent = PHASE_ACCENTS[i % PHASE_ACCENTS.length];
            const isLast = i === phases.length - 1;
            return (
              <View key={phase.id} style={styles.phaseRow}>
                <View style={styles.timeline}>
                  <View style={[styles.timelineDot, { backgroundColor: accent }]} />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={[styles.phaseCard, { borderLeftColor: accent }]}>
                  <View style={styles.phaseCardHeader}>
                    <Text style={styles.phaseCardTitle}>{phase.title}</Text>
                    <View style={[styles.weekBadge, { backgroundColor: `${accent}18` }]}>
                      <Text style={[styles.weekBadgeText, { color: accent }]}>{phase.estimated_weeks}w</Text>
                    </View>
                  </View>
                  <Text style={styles.phaseCardDesc}>{phase.description}</Text>
                  <Text style={styles.weekRange}>{getWeekRange(phases, i)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Category breakdown ── */}
        {categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Task breakdown</Text>
            <View style={styles.card}>
              {categoryBreakdown.map((c, i) => <HorizontalBar key={i} label={c.category} pct={c.pct} color={c.color} />)}
            </View>
          </>
        )}

        {/* ── Your first day — home-style cards ── */}
        {dayOneTasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Your first day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskCarousel} snapToInterval={SCREEN_W * 0.65 + 12} decelerationRate="fast">
              {dayOneTasks.map((t, i) => (
                <View key={i} style={styles.homeTaskCard}>
                  <View style={styles.homeTaskContent}>
                    <View style={styles.homeTaskHeader}>
                      <View style={styles.homeTaskCategoryBadge}>
                        <Text style={styles.homeTaskCategoryText}>{t.category}</Text>
                        <Text style={styles.homeTaskCategoryEmoji}>{getCategoryEmoji(t.category)}</Text>
                      </View>
                      <LinearGradient colors={['#25729f', '#62edb9']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.homeTaskPointsBadge}>
                        <Text style={styles.homeTaskPointsText}>+15</Text>
                      </LinearGradient>
                    </View>
                    <Text style={styles.homeTaskText}>{t.task}</Text>
                  </View>
                  <View style={styles.homeTaskFooter}>
                    <Text style={styles.homeTaskDay}>Day 1</Text>
                    <View style={styles.homeTaskCheckbox}><View style={styles.homeTaskDot} /></View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Milestones ── */}
        <Text style={styles.sectionLabel}>Milestones</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestoneScroll}>
          {milestones.map((m, i) => (
            <View key={i} style={styles.milestoneCard}>
              <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
              <Text style={styles.milestoneLabel}>Week {m.week}</Text>
              <Text style={styles.milestoneDesc}>{m.title}</Text>
            </View>
          ))}
        </ScrollView>

      </ScrollView>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  loadingCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4, width: '100%' },
  loadingHeading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, marginBottom: 8 },
  loadingSubtext: { fontSize: 14, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, textAlign: 'center', lineHeight: 20 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#25729f' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary, fontFamily: Fonts.secondary.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginTop: 24 },

  probabilitySection: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 4 },
  ringContainer: { alignItems: 'center' },
  ringBg: { position: 'absolute', borderColor: 'rgba(0,0,0,0.06)' },
  ringFillOuter: { position: 'absolute', transform: [{ rotate: '-45deg' }] },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 26, fontWeight: '700', color: '#25729f', fontFamily: Fonts.secondary.bold },
  ringLabel: { fontSize: 11, color: Colors.textTertiary, fontFamily: Fonts.secondary.regular, marginTop: 6 },
  statsColumn: { flex: 1, gap: 8 },
  miniStat: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  miniStatValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold },
  miniStatLabel: { fontSize: 13, color: Colors.textTertiary, fontFamily: Fonts.secondary.regular },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 4 },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 5 },
  barLabel: { width: 86, fontSize: 10, fontWeight: '600', color: Colors.textSecondary, fontFamily: Fonts.secondary.semibold },
  barTrack: { flex: 1, height: 5, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2.5, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 2.5 },
  barPct: { width: 32, fontSize: 10, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, textAlign: 'right' },
  readinessNote: { fontSize: 11, color: Colors.textTertiary, fontFamily: Fonts.secondary.regular, marginTop: 4, fontStyle: 'italic' },

  phasesContainer: { marginBottom: 4 },
  phaseRow: { flexDirection: 'row', gap: 12 },
  timeline: { alignItems: 'center', width: 20 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 14 },
  timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 4, marginBottom: -4, minHeight: 24 },
  phaseCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  phaseCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  phaseCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, flex: 1, marginRight: 8 },
  weekBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  weekBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: Fonts.secondary.bold },
  phaseCardDesc: { fontSize: 14, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, lineHeight: 20, marginBottom: 6 },
  weekRange: { fontSize: 11, color: Colors.textTertiary, fontFamily: Fonts.secondary.regular },

  /* Home-style task cards (horizontal carousel) */
  taskCarousel: { paddingRight: 24, paddingVertical: 4, gap: 12 },
  homeTaskCard: {
    width: SCREEN_W * 0.65,
    height: 210,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  homeTaskContent: { flex: 1 },
  homeTaskHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  homeTaskCategoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  homeTaskCategoryText: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Fonts.secondary.bold },
  homeTaskCategoryEmoji: { fontSize: 10 },
  homeTaskPointsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(37, 114, 159, 0.3)' },
  homeTaskPointsText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', fontFamily: Fonts.secondary.bold, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  homeTaskText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, lineHeight: 20, paddingHorizontal: 4, paddingVertical: 4 },
  homeTaskFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeTaskDay: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, fontFamily: Fonts.secondary.semibold },
  homeTaskCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  homeTaskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.1)' },

  /* Milestones */
  milestoneScroll: { paddingRight: 24, gap: 10, paddingVertical: 4 },
  milestoneCard: { width: SCREEN_W * 0.35, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  milestoneEmoji: { fontSize: 28, marginBottom: 8 },
  milestoneLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, marginBottom: 4, textAlign: 'center' },
  milestoneDesc: { fontSize: 11, color: Colors.textTertiary, fontFamily: Fonts.secondary.regular, textAlign: 'center', lineHeight: 15 },
});
