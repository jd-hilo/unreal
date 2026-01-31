import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, Animated, Platform, Modal, Easing, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { Sparkles, X, ChevronRight, ArrowLeft, Info, Edit2, Check, AlertTriangle } from 'lucide-react-native';
import { recalculateDreamProgress } from '@/lib/ai';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { ProgressBar } from '@/components/ProgressBar';
import { CircularProgress } from '@/components/CircularProgress';

const { width } = Dimensions.get('window');

export default function GapAnalysisScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const initialProfileRef = useRef<any>(null);
  
  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      
      // Check if we need to recalculate
      if (initialProfileRef.current && profile) {
        const hasChanged = 
          initialProfileRef.current.current_location !== profile.current_location ||
          initialProfileRef.current.net_worth !== profile.net_worth ||
          (initialProfileRef.current.core_json as any)?.primary_role !== (profile.core_json as any)?.primary_role ||
          JSON.stringify(initialProfileRef.current.dream_vision) !== JSON.stringify(profile.dream_vision);

        if (hasChanged) {
          setIsRecalculating(true);
          try {
            const { dream_self_progress, est_days_remaining } = await recalculateDreamProgress(
              initialProfileRef.current,
              profile,
              initialProfileRef.current.dream_self_progress || {},
              initialProfileRef.current.est_days_remaining || 365
            );

            await updateProfileFields(user.id, {
              dream_self_progress,
              est_days_remaining
            });
            
            // Fetch updated profile after recalculation
            const updatedProfile = await getProfile(user.id);
            setProfileData(updatedProfile);
            initialProfileRef.current = updatedProfile;
          } catch (error) {
            console.error('Recalculation failed:', error);
            setProfileData(profile);
          } finally {
            setIsRecalculating(false);
          }
          return;
        }
      }

      setProfileData(profile);
      if (!initialProfileRef.current) {
        initialProfileRef.current = profile;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fade in content when data is loaded
  useEffect(() => {
    if (!loading && profileData) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [loading, profileData]);

  // Use focus effect to refresh data when returning from edit screens
  useEffect(() => {
    const unsubscribe = router.canGoBack() ? () => {} : () => {}; // Dummy for effect
    // We want to reload data whenever the screen might have been returned to
    // router.push/back doesn't easily provide a "onReturn" hook in expo-router
    // but we can use useFocusEffect from expo-router
  }, []);

  // Correct way to use useFocusEffect with expo-router
  const { useFocusEffect: useExpoFocusEffect } = require('expo-router');
  useExpoFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleEditPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingRoute(route);
    setShowWarning(true);
  };

  const confirmEdit = () => {
    setShowWarning(false);
    if (pendingRoute) {
      router.push(pendingRoute as any);
    }
  };

  // Don't show anything while loading, content will fade in
  if (loading || !profileData) {
    return null;
  }

  const progress = profileData.dream_self_progress || {};
  const categories = ["Financial", "Personal", "Lifestyle", "Health", "Growth"];
  const avgProgress = Object.values(progress).length > 0 
    ? (Object.values(progress) as number[]).reduce((a, b) => a + b, 0) / Object.values(progress).length 
    : 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gap Analysis</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        {isRecalculating && (
          <View style={styles.recalculatingOverlay}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(248,247,255,0.9)']}
              style={StyleSheet.absoluteFill}
            />
            <Sparkles size={48} color="#A78BFA" />
            <Text style={styles.recalculatingText}>Recalculating your path...</Text>
          </View>
        )}

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Summary Widget */}
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F7FF']}
              style={styles.cardGradient}
            />
            <View style={styles.summaryContent}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryValue}>{Math.round(avgProgress)}%</Text>
                <Text style={styles.summaryLabel}>Overall Alignment</Text>
                <View style={styles.daysBadge}>
                  <Sparkles size={12} color="#A78BFA" />
                  <Text style={styles.daysText}>Estimated {profileData.est_days_remaining || '---'} days left</Text>
                </View>
              </View>
              <View style={styles.summaryRight}>
                <CircularProgress 
                  progress={avgProgress / 100}
                  size={100}
                  strokeWidth={10}
                  icon={require('@/assets/images/manwhite.png')}
                  colors={['#A78BFA', '#F472B6']}
                  trackColor="rgba(167, 139, 250, 0.1)"
                  iconTintColor={null}
                />
              </View>
            </View>
          </View>

          {/* Active Process Sections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Process</Text>
            <View style={styles.processContainer}>
              {categories.map((cat) => (
                <View key={cat} style={styles.processItem}>
                  <View style={styles.processHeader}>
                    <Text style={styles.processLabel}>{cat}</Text>
                    <Text style={styles.processValue}>{Math.round(progress[cat] || 0)}%</Text>
                  </View>
                  <ProgressBar 
                    progress={(progress[cat] || 0) / 100} 
                    showLabel={false} 
                    height={8}
                    gradientColors={['#A78BFA', '#F472B6']}
                    trackColor="rgba(167, 139, 250, 0.1)"
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Twin Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The Gap</Text>
            
            {/* Current Twin */}
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <View style={styles.comparisonTitleRow}>
                  <View style={[styles.dot, { backgroundColor: Colors.textTertiary }]} />
                  <Text style={styles.comparisonTitle}>Current Digital Twin</Text>
                </View>
                <TouchableOpacity onPress={() => handleEditPress('/(tabs)/profile')} style={styles.editButton}>
                  <Edit2 size={14} color={Colors.textTertiary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.gapGrid}>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Location</Text>
                  <Text style={styles.gapValue}>{profileData.current_location || profileData.core_json?.current_location || profileData.core_json?.city || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Net Worth</Text>
                  <Text style={styles.gapValue}>{profileData.net_worth || profileData.core_json?.net_worth || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Career</Text>
                  <Text style={styles.gapValue}>{profileData.career_entrypoint || profileData.core_json?.primary_role || profileData.core_json?.job || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Relationship</Text>
                  <Text style={styles.gapValue}>
                    {(() => {
                      const rel = profileData.relationship_details || profileData.core_json?.relationship_details;
                      const status = rel?.status || profileData.family_relationship || profileData.core_json?.family_relationship;
                      const duration = rel?.howLong;
                      if (status && duration) return `${status} (${duration})`;
                      return status || 'Not set';
                    })()}
                  </Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Health</Text>
                  <Text style={styles.gapValue}>
                    {(() => {
                      const health = profileData.current_health?.status || profileData.core_json?.current_health?.status;
                      if (Array.isArray(health)) return health.join(', ');
                      return health || 'Not set';
                    })()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Dream Twin */}
            <View style={[styles.comparisonCard, styles.dreamCard]}>
              <LinearGradient
                colors={['rgba(167, 139, 250, 0.05)', 'rgba(244, 114, 182, 0.05)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.comparisonHeader}>
                <View style={styles.comparisonTitleRow}>
                  <View style={[styles.dot, { backgroundColor: '#A78BFA' }]} />
                  <Text style={[styles.comparisonTitle, { color: '#A78BFA' }]}>Dream Self Goal</Text>
                </View>
                <TouchableOpacity onPress={() => handleEditPress('/profile/edit-dreamself')} style={styles.editButton}>
                  <Edit2 size={14} color="#A78BFA" />
                  <Text style={[styles.editButtonText, { color: '#A78BFA' }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.gapGrid}>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Goal City</Text>
                  <Text style={styles.gapValue}>{profileData.dream_vision?.dream_city || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Goal Net Worth</Text>
                  <Text style={styles.gapValue}>{profileData.dream_vision?.net_worth_goal || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Career Vision</Text>
                  <Text style={styles.gapValue}>{profileData.dream_vision?.career_vision || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Relationship Goal</Text>
                  <Text style={styles.gapValue}>{profileData.dream_vision?.relationship_status_goal || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Family Goal</Text>
                  <Text style={styles.gapValue}>{profileData.dream_vision?.family_plans || 'Not set'}</Text>
                </View>
                <View style={styles.gapItem}>
                  <Text style={styles.gapLabel}>Health Goal</Text>
                  <Text style={styles.gapValue}>{profileData.dream_vision?.health_goals || 'Not set'}</Text>
                </View>
              </View>
            </View>
          </View>
          </ScrollView>
        </Animated.View>

        {/* Warning Modal */}
        <Modal
          visible={showWarning}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowWarning(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={32} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Recalculation Warning</Text>
              <Text style={styles.modalDescription}>
                Changing your Current or Dream Twin details will trigger a recalculation of your path. 
                {"\n\n"}
                Your progress percentages and estimated days will be adjusted based on the new "gap" between who you are and who you want to become.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setShowWarning(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]} 
                  onPress={confirmEdit}
                >
                  <Text style={styles.confirmButtonText}>I Understand</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.primary.regular, fontWeight: '700', color: Colors.textPrimary },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  summaryCard: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  summaryContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLeft: { flex: 1, gap: 4 },
  summaryValue: { fontSize: 42, fontWeight: '800', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold, lineHeight: 48 },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, marginBottom: 8 },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  daysText: { fontSize: 12, fontWeight: '700', color: '#A78BFA', fontFamily: Fonts.secondary.bold },
  summaryRight: { marginLeft: 16 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.primary.regular, marginBottom: 16 },
  processContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  processItem: { gap: 8 },
  processHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  processLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, fontFamily: Fonts.secondary.bold },
  processValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold },
  comparisonCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  dreamCard: { borderColor: 'rgba(167, 139, 250, 0.2)' },
  comparisonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  comparisonTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  comparisonTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, fontFamily: Fonts.secondary.bold },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  editButtonText: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, fontFamily: Fonts.secondary.bold },
  gapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gapItem: { width: (width - 80 - 12) / 2, gap: 2 },
  gapLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  gapValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, width: '100%', alignItems: 'center' },
  warningIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, fontFamily: Fonts.primary.regular, marginBottom: 12, textAlign: 'center' },
  modalDescription: { fontSize: 15, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  cancelButton: { backgroundColor: 'rgba(0,0,0,0.05)' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontFamily: Fonts.secondary.bold },
  confirmButton: { backgroundColor: '#F59E0B' },
  confirmButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
  recalculatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  recalculatingText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
});
