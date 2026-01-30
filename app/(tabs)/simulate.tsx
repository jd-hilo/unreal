import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Animated, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getTimelines, deleteTimeline, getProfile, getRelationships } from '@/lib/storage';
import { ChevronRight, Zap, Play, Users, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { Colors, Fonts } from '@/constants/Theme';
import { Avatar } from '@/components/Avatar';

const { width } = Dimensions.get('window');

export default function SimulateTab() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [timelines, setTimelines] = useState<any[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [profileData, setProfileData] = useState<any>(null);
  const [checkingFields, setCheckingFields] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [profile, timelinesData] = await Promise.all([
        getProfile(user.id),
        getTimelines(user.id),
      ]);
      setUserName(profile?.first_name || user?.email || 'Friend');
      setProfileData(profile);
      setTimelines(timelinesData || []);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to load simulate data:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleCreatePress() {
    if (!user || checkingFields) return;
    const maxTimelines = isPremium ? Infinity : 1;
    if (timelines.length >= maxTimelines) {
      alert(isPremium ? 'Limit reached' : 'Free users can have 1 timeline. Upgrade for unlimited.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckingFields(true);
    try {
      const [profile, relationships] = await Promise.all([
        getProfile(user.id),
        getRelationships(user.id),
      ]);
      if (!profile?.net_worth || !profile?.current_location || !relationships?.length) {
        router.push('/simulate/setup');
      } else {
        router.push('/simulate/new');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCheckingFields(false);
    }
  }

  async function handleDeleteTimeline() {
    if (!timelineToDelete) return;
    try {
      await deleteTimeline(timelineToDelete);
      loadData();
      setDeleteModalVisible(false);
      setTimelineToDelete(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView 
          style={[styles.scrollView, { opacity: fadeAnim }]} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Simulate</Text>
              <Text style={styles.subtitle}>Experience possible futures</Text>
            </View>
            <TouchableOpacity onPress={handleCreatePress} style={styles.plusButton}>
              <Plus size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleCreatePress}
            activeOpacity={0.9}
            style={styles.featuredCard}
          >
            <LinearGradient colors={Colors.gradients.purple} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featuredGradient}>
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle}>New Simulation</Text>
                <Text style={styles.featuredSubtitle}>Map a new timeline</Text>
                <View style={styles.startButton}>
                  <Text style={styles.startButtonText}>{checkingFields ? '...' : 'Start'}</Text>
                </View>
              </View>
              <Image source={require('@/assets/images/cube.png')} style={styles.featuredImage} resizeMode="contain" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Your Timelines</Text>
          {timelines.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No simulations active.</Text></View>
          ) : (
            timelines.map((t) => (
              <TouchableOpacity key={t.id} style={styles.timelineCard} onPress={() => router.push(`/simulate/${t.id}`)} onLongPress={() => {
                setTimelineToDelete(t.id);
                setDeleteModalVisible(true);
              }}>
                <View style={styles.timelineIcon}><Users size={20} color={Colors.gradients.purple[1]} /></View>
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.timelineMeta}>Age {t.current_age} • {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</Text>
                </View>
                <Play size={16} color={Colors.gradients.purple[1]} fill={Colors.gradients.purple[1]} />
              </TouchableOpacity>
            ))
          )}
        </Animated.ScrollView>
      </SafeAreaView>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Simulation?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalCancel}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteTimeline} style={styles.modalDelete}><Text style={{color: '#FFF'}}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontFamily: Fonts.primary.regular, color: Colors.textPrimary },
  subtitle: { fontSize: 16, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular },
  plusButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  featuredCard: { borderRadius: 32, overflow: 'hidden', height: 180, marginBottom: 40 },
  featuredGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 32 },
  featuredContent: { flex: 1, zIndex: 2 },
  featuredTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', fontFamily: Fonts.primary.regular, marginBottom: 4 },
  featuredSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  startButton: { backgroundColor: '#FFF', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 12 },
  startButtonText: { color: Colors.gradients.purple[1], fontWeight: '700' },
  featuredImage: { width: 100, height: 100, position: 'absolute', right: -10, bottom: -10, opacity: 0.8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 16 },
  timelineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  timelineIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  timelineInfo: { flex: 1 },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  timelineMeta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 24 },
  emptyText: { color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)' },
  modalDelete: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#EF4444' },
});
