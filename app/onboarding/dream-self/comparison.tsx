import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { ChevronRight, MapPin, Heart, Briefcase, Banknote, Home, Sparkles, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LigatureFreeText } from '@/components/LigatureFreeText';

const { width } = Dimensions.get('window');

export default function DreamSelfComparison() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!user) return;
    loadData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [user]);

  async function loadData() {
    try {
      const data = await getProfile(user!.id);
      setProfile(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)/home');
  }

  if (loading || !profile) return null;

  const dream = profile.dream_vision || {};
  const currentJob = profile.career_entrypoint || (profile.core_json as any)?.primary_role || 'Not set';
  
  // Format current health
  const healthStatus = profile.current_health?.status || [];
  const currentHealth = healthStatus.length > 0 ? healthStatus.join(', ') : 'Not set';

  // Format current relationship
  const relDetails = profile.relationship_details || {};
  const currentRel = relDetails.status 
    ? `${relDetails.status}${relDetails.howLong ? ` (${relDetails.howLong})` : ''}`
    : 'Not set';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>The Gap</Text>
            <Text style={styles.subtitle}>Your current self vs. your dream self</Text>
          </View>

          <Animated.View style={[styles.comparisonContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Financial/Career */}
            <ComparisonRow
              icon={<Banknote size={20} color={Colors.textPrimary} />}
              label="Net Worth"
              current={profile.net_worth || 'Not set'}
              dream={dream.net_worth_goal || 'Not set'}
            />
            <ComparisonRow
              icon={<Briefcase size={20} color={Colors.textPrimary} />}
              label="Career"
              current={currentJob}
              dream={dream.career_vision || 'Not set'}
            />

            {/* Personal */}
            <ComparisonRow
              icon={<Heart size={20} color={Colors.textPrimary} />}
              label="Relationship"
              current={currentRel}
              dream={dream.relationship_status_goal || 'Not set'}
            />

            {/* Lifestyle */}
            <ComparisonRow
              icon={<Home size={20} color={Colors.textPrimary} />}
              label="Home"
              current="Current Home"
              dream={dream.dream_home || 'Not set'}
            />
            <ComparisonRow
              icon={<MapPin size={20} color={Colors.textPrimary} />}
              label="City"
              current={profile.current_location || 'Not set'}
              dream={dream.dream_city || 'Not set'}
            />

            {/* Health/Growth */}
            <ComparisonRow
              icon={<Zap size={20} color={Colors.textPrimary} />}
              label="Health"
              current={currentHealth}
              dream={dream.health_goals || 'Not set'}
            />
          </Animated.View>

          <View style={styles.architectNote}>
            <Sparkles size={20} color="#25729f" />
            <Text style={styles.noteText}>
              The Architect has mapped the path. Your daily tasks are ready to help you bridge these gaps.
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.ctaContainer}>
          <Pressable onPress={handleFinish} style={styles.ctaButton}>
            <LinearGradient colors={['#25729f', '#62edb9']} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Start Your Journey</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ComparisonRow({ icon, label, current, dream }: any) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontFamily: Fonts.primary.regular, color: Colors.textPrimary },
  subtitle: { fontSize: 16, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, marginTop: 4 },
  comparisonContainer: { gap: 24 },
  row: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, fontFamily: Fonts.secondary.bold, textTransform: 'uppercase', letterSpacing: 1 },
  rowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1 },
  sideLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, fontFamily: Fonts.secondary.bold, marginBottom: 4 },
  sideValue: { fontSize: 15, color: Colors.textSecondary, fontFamily: Fonts.secondary.bold, lineHeight: 20 },
  arrowContainer: { paddingHorizontal: 12 },
  architectNote: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(37, 114, 159, 0.05)', padding: 20, borderRadius: 24, marginTop: 32 },
  noteText: { flex: 1, fontSize: 14, color: '#25729f', fontFamily: Fonts.secondary.bold, lineHeight: 20 },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: Colors.background },
  ctaButton: { borderRadius: 28, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
});
