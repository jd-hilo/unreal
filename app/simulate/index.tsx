import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Animated, Dimensions, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getTimelines, deleteTimeline, getProfile, checkSimulationCredits } from '@/lib/storage';
import { ChevronLeft, Zap, Play, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '@/constants/Theme';
import { Avatar } from '@/components/Avatar';

const { width } = Dimensions.get('window');

export default function SimulateDashboard() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<string | null>(null);
  const [simulationCredits, setSimulationCredits] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [profileData, setProfileData] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load profile data immediately (fast)
  const loadProfileData = useCallback(async () => {
    if (!user) return;

    try {
      const profile = await getProfile(user.id);
      setSimulationCredits(profile?.simulation_credits ?? 5);
      setUserName(profile?.first_name || user?.email || 'Friend');
      setProfileData(profile);

      const responses = profile?.core_json?.onboarding_responses || {};
      const birthYearVal = responses['birth-year'] || responses['00-birth-year'];

      if (birthYearVal) {
        const birthYear = parseInt(birthYearVal);
        if (!isNaN(birthYear)) {
          setUserAge(new Date().getFullYear() - birthYear);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, [user]);

  // Load timelines immediately
  const loadTimelines = useCallback(async () => {
    if (!user) return;

    try {
      const timelinesData = await getTimelines(user.id);
      setTimelines(timelinesData || []);
    } catch (error) {
      console.error('Failed to load timelines:', error);
    }
  }, [user]);

  // Reset animation when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
      if (user) {
        loadProfileData();
        loadTimelines();
      }
    }, [user, slideAnim, fadeAnim, loadProfileData, loadTimelines])
  );

  async function handleCreatePress() {
    if (!user) return;

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
      await loadTimelines();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteModalVisible(false);
      setTimelineToDelete(null);
    } catch (error) {
      console.error('Failed to delete timeline:', error);
      alert('Failed to delete timeline. Please try again.');
    }
  }


  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Navigate back to home - router.back() will give proper back animation
              // If there's no back history, push to home
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)/home');
              }
            }}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.resourceContainer}>
            <LinearGradient
              colors={Colors.gradients.purple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resourceBadge}
            >
              <Zap size={14} color="#FCD34D" fill="#FCD34D" />
              <Text style={styles.resourceText}>{timelines.length} timeline{timelines.length !== 1 ? 's' : ''}</Text>
            </LinearGradient>
          </View>

          <TouchableOpacity 
            style={styles.profileBadge}
            onPress={async () => {
              await AsyncStorage.setItem('previous_route_before_profile', '/simulate');
              router.push('/twin-insights');
            }}
            activeOpacity={0.7}
          >
            <Avatar 
              name={userName} 
              size={40} 
              variant={(profileData?.avatar_variant as any) || 'beam'} 
              colors={profileData?.avatar_colors || undefined}
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
            <TouchableOpacity onPress={handleCreatePress}>
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
              colors={Colors.gradients.purple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newGameGradient}
            >
              <View style={styles.newGameContent}>
                <Text style={styles.newGameTitle}>New Life Simulation</Text>
                <Text style={styles.newGameSubtitle}>Create a new timeline and see where life takes you.</Text>
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>Start</Text>
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
                  <View style={styles.gameCardBg}>
                    <View style={styles.gameCardLeft}>
                      <View style={styles.gameIconContainer}>
                         <View style={styles.gameIcon}>
                            <Users size={24} color={Colors.gradients.purple[1]} />
                         </View>
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
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

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
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setDeleteModalVisible(false);
            setTimelineToDelete(null);
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resourceContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  resourceText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  headerLink: {
    fontSize: 16,
    color: Colors.gradients.purple[1],
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  newGameCard: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 190,
    marginBottom: 32,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  newGameGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  newGameContent: {
    flex: 1,
    zIndex: 2,
  },
  newGameTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
  },
  newGameSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 18,
    lineHeight: 20,
    fontWeight: '400',
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
    color: Colors.gradients.purple[1],
    fontWeight: '700',
    fontSize: 14,
    fontFamily: Fonts.secondary.bold,
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
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  gamesList: {
    gap: 12,
    marginBottom: 32,
  },
  gameCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 12,
  },
  gameCardBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  gameStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statTag: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  statTagText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  gameTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    flexShrink: 1,
    fontFamily: Fonts.secondary.bold,
  },
  playAction: {
    backgroundColor: Colors.gradients.purple[1],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontFamily: Fonts.secondary.bold,
  },
  premiumBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: Fonts.secondary.bold,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalCancelText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
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



