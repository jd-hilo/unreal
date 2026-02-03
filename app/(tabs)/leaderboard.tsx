import { View, Text, StyleSheet, FlatList, Image, Animated, TouchableOpacity, Modal, TextInput, Share, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { FlameGradientIcon } from '@/components/GradientIcons';
import { Trophy, UserPlus, Share2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useCallback, useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';

interface LeaderboardEntry {
  user_id: string;
  first_name: string | null;
  total_points: number;
  current_streak: number;
  created_at: string;
  is_current_user: boolean;
}

interface LeaderboardItemProps {
  item: LeaderboardEntry;
  index: number;
}

function LeaderboardItem({ item, index }: LeaderboardItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.itemContainer, item.is_current_user && styles.currentUserContainer]}>
      {/* Rank number */}
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>

      {/* Avatar with points badge */}
      <View style={styles.avatarContainer}>
        <Image 
          source={require('@/assets/images/manwhite.png')} 
          style={styles.avatar} 
          resizeMode="contain" 
        />
        <LinearGradient
          colors={['#FF1493', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsBadge}
        >
          <Text style={styles.pointsText}>{item.total_points}</Text>
        </LinearGradient>
      </View>

      {/* Name and date joined */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.first_name || 'Anonymous'}
          {item.is_current_user && ' (You)'}
        </Text>
        <Text style={styles.dateJoined}>Joined {formatDate(item.created_at)}</Text>
      </View>

      {/* Streak */}
      <View style={styles.streakContainer}>
        <FlameGradientIcon size={20} />
        <Text style={styles.streakText}>{item.current_streak}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardTab() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [moraCode, setMoraCode] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [myTwinCode, setMyTwinCode] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_leaderboard');
      
      if (error) throw error;
      
      setLeaderboardData(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTwinCode = async () => {
    if (!user?.id) return;
    try {
      const profile = await getProfile(user.id);
      setMyTwinCode(profile?.twin_code || null);
    } catch (error) {
      console.error('Error fetching twin code:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
      fetchMyTwinCode();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      // Disable swipe-to-go-back gesture
      navigation.setOptions({
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      });

      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        });
      }

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Refresh leaderboard when screen is focused
      if (user) {
        fetchLeaderboard();
      }

      return () => {
        navigation.setOptions({
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        });
        if (parent) {
          parent.setOptions({
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          });
        }
      };
    }, [fadeAnim, navigation, user])
  );

  const handleAddFriend = async () => {
    if (!moraCode || moraCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit Mora#');
      return;
    }

    try {
      setAddingFriend(true);
      const { data, error } = await supabase.rpc('add_friend_by_code', { code: moraCode });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        Alert.alert('Success', 'Friend added successfully!');
        setShowAddModal(false);
        setMoraCode('');
        fetchLeaderboard(); // Refresh leaderboard
      } else {
        Alert.alert('Error', result.error || 'Failed to add friend');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', 'Failed to add friend');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleInvite = async () => {
    if (!myTwinCode) {
      Alert.alert('Error', 'Your Mora# is not available yet');
      return;
    }

    try {
      await Share.share({
        message: `Join me on Mora and track your progress towards your dream self! Use my Mora# to add me to your leaderboard so we can track our progress together: ${myTwinCode}\n\nDownload here: https://apps.apple.com/us/app/mora/id6742576400`,
        title: 'Join me on Mora',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyLeaderboardPreview}>
        {/* User (Top) */}
        <View style={[styles.itemContainer, styles.currentUserContainer, styles.previewItem]}>
          <View style={styles.rankContainer}>
            <Text style={styles.rankText}>#1</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Image 
              source={require('@/assets/images/manwhite.png')} 
              style={styles.avatar} 
              resizeMode="contain" 
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>You</Text>
            <Text style={styles.dateJoined}>Joined recently</Text>
          </View>
        </View>
        
        {/* Bland placeholders */}
        {[2, 3].map((rank) => (
          <View key={rank} style={[styles.itemContainer, styles.previewItem, styles.blandItem]}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rankText, styles.blandText]}>#{rank}</Text>
            </View>
            <View style={[styles.avatarContainer, styles.blandAvatar]} />
            <View style={styles.userInfo}>
              <View style={styles.blandName} />
              <View style={styles.blandDate} />
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.emptyTitle}>It{'\u2019'}s lonely at the top</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleInvite}>
        <Share2 size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Invite Friends</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAddModal(true)}>
        <Text style={styles.secondaryButtonText}>I have a code</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Trophy size={32} color={Colors.textPrimary} strokeWidth={2.5} />
                <Text style={styles.title}>Leaderboard</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowAddModal(true)}
                >
                  <UserPlus size={20} color={Colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleInvite}
                >
                  <Share2 size={20} color={Colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.subtitle}>Who is making the most progress towards their dream self?</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.textPrimary} />
            </View>
          ) : leaderboardData.length === 0 || (leaderboardData.length === 1 && leaderboardData[0]?.is_current_user) ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={leaderboardData}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item, index }) => (
                <LeaderboardItem item={item} index={index} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      </SafeAreaView>

      {/* Add Friend Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter your friend's 6-digit Mora# to add them to your leaderboard
            </Text>
            
            <TextInput
              style={styles.codeInput}
              value={moraCode}
              onChangeText={setMoraCode}
              placeholder="000000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            
            <TouchableOpacity 
              style={[styles.addButton, addingFriend && styles.addButtonDisabled]}
              onPress={handleAddFriend}
              disabled={addingFriend}
            >
              {addingFriend ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Friend</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  safeArea: { 
    flex: 1 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 24, 
    paddingTop: 40 
  },
  header: { 
    marginBottom: 24 
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { 
    fontSize: 32, 
    fontFamily: Fonts.primary.semibold, 
    color: Colors.textPrimary 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    fontFamily: Fonts.secondary.regular, 
    marginTop: 8 
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 120,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  currentUserContainer: {
    borderColor: '#FF1493',
    borderWidth: 2,
  },
  rankContainer: {
    width: 32,
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.semibold,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  pointsBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pointsText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.semibold,
    marginBottom: 4,
  },
  dateJoined: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 154, 158, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 154, 158, 0.2)',
  },
  streakText: {
    fontSize: 14,
    color: '#FF9A9E',
    fontFamily: Fonts.secondary.bold,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed from center to flex-start
    paddingHorizontal: 24,
    paddingTop: 60, // Added padding top to push content down slightly from the very top, but overall higher than center
  },
  emptyLeaderboardPreview: {
    width: '100%',
    marginTop: -40,
    marginBottom: 24,
    opacity: 0.9,
  },
  previewItem: {
    marginBottom: 8,
    transform: [{ scale: 0.75 }],
  },
  blandItem: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
    borderColor: 'transparent',
  },
  blandText: {
    color: '#CCCCCC',
  },
  blandAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },
  blandName: {
    width: 100,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 6,
  },
  blandDate: {
    width: 80,
    height: 12,
    backgroundColor: '#EEEEEE',
    borderRadius: 6,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
  },
  modalDescription: {
    fontSize: 16,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    fontSize: 32,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: Fonts.secondary.bold,
    color: '#FFFFFF',
  },
});
