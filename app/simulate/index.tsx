import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getTimelines, deleteTimeline, getProfile, checkSimulationCredits } from '@/lib/storage';
import { ChevronRight, Plus, Lock, Zap, Play, Trophy, Users, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SimulateDashboard() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [timelines, setTimelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<string | null>(null);
  const [simulationCredits, setSimulationCredits] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadData();
      }
    }, [user])
  );

  async function loadData() {
    if (!user) return;

    try {
      const [timelinesData, profile] = await Promise.all([
        getTimelines(user.id),
        getProfile(user.id),
      ]);

      setTimelines(timelinesData || []);
      setSimulationCredits(profile?.simulation_credits ?? 5);

      const responses = profile?.core_json?.onboarding_responses || {};
      const birthYearVal = responses['birth-year'] || responses['00-birth-year'];

      if (birthYearVal) {
        const birthYear = parseInt(birthYearVal);
        if (!isNaN(birthYear)) {
          setUserAge(new Date().getFullYear() - birthYear);
        }
      }
    } catch (error) {
      console.error('Failed to load timelines:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreatePress() {
    // Check limits
    const timelineCount = timelines.length;
    const maxTimelines = isPremium ? Infinity : 1;

    if (timelineCount >= maxTimelines) {
      alert(
        isPremium
          ? 'Unable to create timeline'
          : 'Free users can have up to 1 timeline. Upgrade to Premium for unlimited timelines.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/simulate/new');
  }

  function handleLongPressTimeline(timelineId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimelineToDelete(timelineId);
    setDeleteModalVisible(true);
  }

  async function handleDeleteTimeline() {
    if (!timelineToDelete) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await deleteTimeline(timelineToDelete);
      await loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteModalVisible(false);
      setTimelineToDelete(null);
    } catch (error) {
      console.error('Failed to delete timeline:', error);
      alert('Failed to delete timeline. Please try again.');
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#050505', '#0A0A0A', '#000000']}
      style={styles.container}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Bar - Game Stats Style */}
        <View style={styles.topBar}>
          <View style={styles.resourceContainer}>
            <LinearGradient
              colors={['#2563EB', '#0EA5E9', '#14B8A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resourceBadge}
            >
              <Zap size={14} color="#FCD34D" fill="#FCD34D" />
              <Text style={styles.resourceText}>
                {isPremium ? '∞' : `${simulationCredits ?? 5}/5`}
              </Text>
              <TouchableOpacity 
                style={styles.plusButton}
                onPress={() => router.push('/premium')}
              >
                <Plus size={10} color="#FFF" strokeWidth={4} />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.resourceBadgeSimple}>
              <Trophy size={14} color="#FCD34D" />
              <Text style={styles.resourceTextSimple}>{timelines.length}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.profileBadge}
            onPress={async () => {
              await AsyncStorage.setItem('previous_route_before_profile', '/(tabs)/simulations');
              router.push('/(tabs)/profile');
            }}
            activeOpacity={0.7}
          >
            <Image 
               source={require('@/assets/images/cube.png')}
               style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Featured Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Simulations</Text>
            <TouchableOpacity onPress={() => router.push('/simulate/new')}>
              <Text style={styles.headerLink}>New +</Text>
            </TouchableOpacity>
          </View>

          {/* Create New Card (Prominent) */}
          <TouchableOpacity
            onPress={handleCreatePress}
            activeOpacity={0.9}
            style={styles.newGameCard}
          >
            <LinearGradient
              colors={['#2563EB', '#0EA5E9', '#14B8A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newGameGradient}
            >
              <View style={styles.newGameContent}>
                <Text style={styles.newGameTitle}>New Reality</Text>
                <Text style={styles.newGameSubtitle}>Create a new timeline and see where life takes you.</Text>
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>Start</Text>
                  <View style={styles.costTag}>
                    <Zap size={10} color="#000" fill="#000" />
                    <Text style={styles.costText}>5</Text>
                  </View>
                </View>
              </View>
              <Image 
                source={require('@/assets/images/cube.png')} 
                style={styles.newGameImage}
                resizeMode="contain"
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Timelines List */}
          <Text style={styles.sectionTitle}>Your Timelines</Text>
          
          <View style={styles.gamesList}>
          {timelines.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No simulations active.</Text>
            </View>
          ) : (
              timelines.map((timeline) => (
                <TouchableOpacity
                  key={timeline.id}
                  style={styles.gameCard}
                  onPress={() => router.push(`/simulate/${timeline.id}`)}
                  onLongPress={() => handleLongPressTimeline(timeline.id)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['rgba(30, 30, 35, 1)', 'rgba(20, 20, 25, 1)']}
                    style={styles.gameCardBg}
                  >
                    <View style={styles.gameCardLeft}>
                      <View style={styles.gameIconContainer}>
                         <LinearGradient
                            colors={['rgba(37, 99, 235, 0.3)', 'rgba(14, 165, 233, 0.1)']}
                            style={styles.gameIcon}
                         >
                            <Users size={24} color="#60A5FA" />
                         </LinearGradient>
                      </View>
                      <View style={styles.gameInfo}>
                        <Text style={styles.gameTitle} numberOfLines={1}>{timeline.title}</Text>
                        <View style={styles.gameStats}>
                          <View style={styles.statTag}>
                            <Text style={styles.statTagText}>Age {timeline.current_age}</Text>
                          </View>
                          <Text style={styles.gameTime} numberOfLines={1}>
                            {formatDistanceToNow(new Date(timeline.created_at), { addSuffix: true })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.playAction}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/simulate/${timeline.id}`);
                      }}
                    >
                       <Play size={16} color="#FFF" fill="#FFF" />
                       <View style={styles.playActionCost}>
                         <Zap size={10} color="#FCD34D" fill="#FCD34D" />
                         <Text style={styles.playActionText}>5</Text>
                       </View>
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Premium Banner */}
          {!isPremium && (
            <TouchableOpacity 
              style={styles.premiumBanner}
              onPress={() => router.push('/premium')}
            >
              <LinearGradient
                colors={['rgba(251, 191, 36, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumGradient}
              >
                <View style={styles.premiumIcon}>
                  <Star size={20} color="#FBBF24" fill="#FBBF24" />
                </View>
                <View style={styles.premiumContent}>
                   <Text style={styles.premiumTitle}>Unlock Unlimited Energy</Text>
                   <Text style={styles.premiumSubtitle}>Get Premium for infinite simulations</Text>
            </View>
                <ChevronRight size={20} color="#FBBF24" />
              </LinearGradient>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setTimelineToDelete(null);
        }}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Simulation?</Text>
            <Text style={styles.modalMessage}>
              This action cannot be undone. Your simulation and all its progress will be permanently deleted.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setTimelineToDelete(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteTimeline}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  resourceContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  resourceBadgeSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  resourceText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resourceTextSimple: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  plusButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
  },
  avatar: {
    width: '80%',
    height: '80%',
    alignSelf: 'center',
    marginTop: '10%',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  headerLink: {
    fontSize: 16,
    color: '#0EA5E9',
    fontWeight: '600',
  },
  newGameCard: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 160,
    marginBottom: 32,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  newGameGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  newGameContent: {
    flex: 1,
    zIndex: 2,
  },
  newGameTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  newGameSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
    lineHeight: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  costTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  costText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  newGameImage: {
    width: 90,
    height: 90,
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.9,
    transform: [{rotate: '-10deg'}],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  gamesList: {
    gap: 12,
    marginBottom: 32,
  },
  gameCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gameCardBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    gap: 12,
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
    minWidth: 0,
    marginRight: 8,
  },
  gameIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    flexShrink: 0,
  },
  gameIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
  },
  gameStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  statTagText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  gameTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    flexShrink: 1,
  },
  playAction: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  playActionCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    paddingLeft: 6,
  },
  playActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  premiumBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  premiumIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDeleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  modalDeleteText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

