import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/mixpanel';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getProfile, completeOnboarding } from '@/lib/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { ChevronRight, MapPin, Heart, Briefcase, Banknote, Home, Zap, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CircularProgress } from '@/components/CircularProgress';

const { width } = Dimensions.get('window');

// --- Gap scoring helpers ---

function parseNetWorth(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.kmb]/gi, '').toLowerCase();
  const multipliers: Record<string, number> = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };
  for (const [suffix, mult] of Object.entries(multipliers)) {
    if (cleaned.endsWith(suffix)) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? null : num * mult;
    }
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function scoreNetWorth(current: string, dream: string): number {
  const c = parseNetWorth(current);
  const d = parseNetWorth(dream);
  if (c == null || d == null || d === 0) return 0.3;
  const ratio = Math.min(c / d, 1);
  return Math.max(0.05, ratio);
}

function scoreTextMatch(current: string, dream: string): number {
  const c = current.toLowerCase().trim();
  const d = dream.toLowerCase().trim();
  if (c === d) return 1.0;
  if (c.includes(d) || d.includes(c)) return 0.6;
  // Check for word overlap
  const cWords = new Set(c.split(/\s+/));
  const dWords = d.split(/\s+/);
  const overlap = dWords.filter(w => cWords.has(w)).length;
  if (overlap > 0) return Math.min(0.5 + overlap * 0.15, 0.8);
  return 0.2;
}

function scoreHealth(current: string, dream: string): number {
  const cItems = current.toLowerCase().split(/[,;&]+/).map(s => s.trim()).filter(Boolean);
  const dItems = dream.toLowerCase().split(/[,;&]+/).map(s => s.trim()).filter(Boolean);
  if (cItems.length === 0 || dItems.length === 0) return 0.3;
  let matches = 0;
  for (const d of dItems) {
    if (cItems.some(c => c.includes(d) || d.includes(c))) matches++;
  }
  return Math.max(0.1, matches / dItems.length);
}

function getGapScore(label: string, current: string, dream: string): number {
  switch (label) {
    case 'Net Worth': return scoreNetWorth(current, dream);
    case 'Health': return scoreHealth(current, dream);
    default: return scoreTextMatch(current, dream);
  }
}

function getGapColor(score: number): string {
  if (score >= 0.7) return '#34C759'; // green
  if (score >= 0.4) return '#FF9F0A'; // amber
  return '#FF453A'; // red
}

function getGapLabel(score: number): string {
  if (score >= 0.7) return 'Close';
  if (score >= 0.4) return 'Moderate gap';
  return 'Large gap';
}

function getHapticStyle(score: number) {
  if (score >= 0.7) return Haptics.ImpactFeedbackStyle.Light;
  if (score >= 0.4) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

// --- Types ---

interface ComparisonItem {
  icon: React.ReactNode;
  label: string;
  current: string;
  dream: string;
  score: number;
}

// --- Main Component ---

export default function DreamSelfComparison() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setOnboardingComplete = useTwin((state) => state.setOnboardingComplete);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revealComplete, setRevealComplete] = useState(false);

  // Animation refs
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.8)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const winCalloutOpacity = useRef(new Animated.Value(0)).current;
  const winCalloutSlide = useRef(new Animated.Value(20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(30)).current;

  // We'll create card anims after we know the count
  const cardAnimsRef = useRef<{ opacity: Animated.Value; slide: Animated.Value }[]>([]);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const data = await getProfile(user!.id);
      setProfile(data);
      // Mark onboarding complete as soon as user reaches the gap page
      await completeOnboarding(user!.id, {});
      setOnboardingComplete(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('gap_page_cta_tapped');
    if (user?.id) {
      try {
        await completeOnboarding(user.id, {});
        setOnboardingComplete(true);
      } catch (e) {
        console.error('Failed to mark onboarding complete:', e);
      }
    }
    router.replace({ pathname: '/premium-onboarding', params: { from: 'onboarding' } });
  }

  // Derive comparison data (safe when profile is null)
  const dream = profile?.dream_vision || {};
  const currentJob = profile?.career_entrypoint || (profile?.core_json as any)?.primary_role || 'Not set';
  const healthStatus = profile?.current_health?.status || [];
  const currentHealth = healthStatus.length > 0 ? healthStatus.join(', ') : 'Not set';
  const relDetails = profile?.relationship_details || {};
  const currentRel = relDetails.status
    ? `${relDetails.status}${relDetails.howLong ? ` (${relDetails.howLong})` : ''}`
    : 'Not set';

  const comparisons: ComparisonItem[] = profile ? (
    [
      { label: 'Net Worth', current: profile.net_worth || 'Not set', dream: dream.net_worth_goal || 'Not set', icon: null, score: 0 },
      { label: 'Career', current: currentJob, dream: dream.career_vision || 'Not set', icon: null, score: 0 },
      { label: 'Relationship', current: currentRel, dream: dream.relationship_status_goal || 'Not set', icon: null, score: 0 },
      { label: 'Home', current: profile.current_location || 'Not set', dream: dream.dream_home || 'Not set', icon: null, score: 0 },
      { label: 'City', current: profile.current_location || 'Not set', dream: dream.dream_city || 'Not set', icon: null, score: 0 },
      { label: 'Health', current: currentHealth, dream: dream.health_goals || 'Not set', icon: null, score: 0 },
    ]
      .filter(c => c.current !== 'Not set' && c.dream !== 'Not set')
      .map(c => ({ ...c, score: getGapScore(c.label, c.current, c.dream) }))
  ) : [];

  const overallScore = comparisons.length > 0
    ? comparisons.reduce((sum, c) => sum + c.score, 0) / comparisons.length
    : 0;
  const biggestWin = comparisons.length > 0
    ? comparisons.reduce((best, c) => c.score > best.score ? c : best, comparisons[0])
    : null;
  const firstName = profile?.full_name?.split(' ')[0] || 'Friend';

  // Ensure card animations exist for each comparison
  if (cardAnimsRef.current.length !== comparisons.length) {
    cardAnimsRef.current = comparisons.map(() => ({
      opacity: new Animated.Value(0),
      slide: new Animated.Value(30),
    }));
  }
  const cardAnims = cardAnimsRef.current;

  // Run reveal sequence once (must be before any early return)
  useEffect(() => {
    if (hasAnimated.current || comparisons.length === 0) return;
    hasAnimated.current = true;

    // 1. Alignment score animates in
    Animated.parallel([
      Animated.timing(scoreOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }),
    ]).start();

    // 2. After 1.5s, start card reveals
    const cardStartDelay = 1500;
    comparisons.forEach((comp, i) => {
      const delay = cardStartDelay + i * 500;
      setTimeout(() => {
        Haptics.impactAsync(getHapticStyle(comp.score));
        Animated.parallel([
          Animated.timing(cardAnims[i].opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(cardAnims[i].slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
      }, delay);
    });

    // 3. After all cards, show biggest win + CTA
    const allCardsTime = cardStartDelay + comparisons.length * 500 + 400;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(winCalloutOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(winCalloutSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, allCardsTime);

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRevealComplete(true);
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ctaSlide, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    }, allCardsTime + 600);
  }, [comparisons.length]);

  if (loading || !profile) return null;

  const ICONS: Record<string, React.ReactNode> = {
    'Net Worth': <Banknote size={20} color={Colors.textPrimary} />,
    'Career': <Briefcase size={20} color={Colors.textPrimary} />,
    'Relationship': <Heart size={20} color={Colors.textPrimary} />,
    'Home': <Home size={20} color={Colors.textPrimary} />,
    'City': <MapPin size={20} color={Colors.textPrimary} />,
    'Health': <Zap size={20} color={Colors.textPrimary} />,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Text style={styles.title}>The Gap</Text>
            <Text style={styles.subtitle}>Start your journey to get closer to your dream self.</Text>
          </Animated.View>

          {/* Comparison cards */}
          <View style={styles.comparisonContainer}>
            {comparisons.map((comp, i) => (
              <Animated.View
                key={comp.label}
                style={{
                  opacity: cardAnims[i]?.opacity || 0,
                  transform: [{ translateY: cardAnims[i]?.slide || 30 }],
                }}
              >
                <ComparisonCard item={{ ...comp, icon: ICONS[comp.label] }} />
              </Animated.View>
            ))}
          </View>

          {/* Biggest win callout */}
          {biggestWin && (
            <Animated.View style={[styles.winCallout, { opacity: winCalloutOpacity, transform: [{ translateY: winCalloutSlide }] }]}>
              <View style={styles.winIconRow}>
                <Trophy size={22} color="#FF9F0A" />
                <Text style={styles.winTitle}>Your biggest win</Text>
              </View>
              <Text style={styles.winText}>
                You're closest in <Text style={styles.winCategory}>{biggestWin.label}</Text> — let's use that momentum
              </Text>
              <View style={[styles.gapBar, { marginTop: 12 }]}>
                <View style={[styles.gapFill, { width: `${Math.round(biggestWin.score * 100)}%`, backgroundColor: getGapColor(biggestWin.score) }]} />
              </View>
            </Animated.View>
          )}

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* CTA appears after reveal */}
        <Animated.View style={[styles.ctaContainer, { opacity: ctaOpacity, transform: [{ translateY: ctaSlide }] }]}>
          <Pressable onPress={handleFinish} style={styles.ctaButton}>
            <LinearGradient colors={['#25729f', '#62edb9']} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Start Your Journey</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// --- Comparison Card Component ---

function ComparisonCard({ item }: { item: ComparisonItem }) {
  const { icon, label, current, dream, score } = item;
  const gapColor = getGapColor(score);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={[styles.gapBadge, { backgroundColor: gapColor + '18' }]}>
          <Text style={[styles.gapBadgeText, { color: gapColor }]}>{getGapLabel(score)}</Text>
        </View>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.side}>
          <Text style={styles.sideLabel}>CURRENT</Text>
          <Text style={styles.sideValue} numberOfLines={2}>{current}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <ChevronRight size={16} color="rgba(0,0,0,0.1)" />
        </View>
        <View style={styles.side}>
          <Text style={[styles.sideLabel, { color: '#25729f' }]}>DREAM</Text>
          <Text style={[styles.sideValue, { color: Colors.textPrimary }]} numberOfLines={2}>{dream}</Text>
        </View>
      </View>
      {/* Gap bar */}
      <View style={styles.gapBarContainer}>
        <View style={styles.gapBar}>
          <View style={[styles.gapFill, { width: `${Math.round(score * 100)}%`, backgroundColor: gapColor }]} />
        </View>
        <Text style={[styles.gapPercentText, { color: gapColor }]}>{Math.round(score * 100)}%</Text>
      </View>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 24 },

  // Header / Score
  header: { alignItems: 'center', marginBottom: 24 },
  scoreContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  scoreTextOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: { fontSize: 32, fontFamily: Fonts.primary.semibold, color: Colors.textPrimary },
  scorePercent: { fontSize: 16, fontFamily: Fonts.secondary.bold, color: Colors.textTertiary, marginLeft: 1 },
  scoreLabel: { fontSize: 14, fontFamily: Fonts.secondary.semibold, color: Colors.textTertiary, marginTop: 8 },

  title: { fontSize: 28, fontFamily: Fonts.primary.regular, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, marginBottom: 28 },

  // Cards
  comparisonContainer: { gap: 16 },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  rowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1 },
  sideLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, fontFamily: Fonts.secondary.bold, marginBottom: 4 },
  sideValue: { fontSize: 15, color: Colors.textSecondary, fontFamily: Fonts.secondary.bold, lineHeight: 20 },
  arrowContainer: { paddingHorizontal: 12 },

  // Gap badge
  gapBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gapBadgeText: { fontSize: 11, fontFamily: Fonts.secondary.bold },

  // Gap bar
  gapBarContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  gapBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  gapFill: { height: '100%', borderRadius: 3 },
  gapPercentText: { fontSize: 12, fontFamily: Fonts.secondary.bold, width: 36, textAlign: 'right' },

  // Win callout
  winCallout: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 159, 10, 0.06)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.15)',
  },
  winIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  winTitle: { fontSize: 16, fontFamily: Fonts.primary.semibold, color: Colors.textPrimary },
  winText: { fontSize: 15, fontFamily: Fonts.secondary.regular, color: Colors.textSecondary, lineHeight: 22 },
  winCategory: { fontFamily: Fonts.secondary.bold, color: '#FF9F0A' },

  // CTA
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: Colors.background },
  ctaButton: { borderRadius: 28, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
});
