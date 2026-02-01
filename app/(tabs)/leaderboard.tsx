import { View, Text, StyleSheet, FlatList, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { FlameGradientIcon } from '@/components/GradientIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

// Mock data for leaderboard
const MOCK_LEADERBOARD_DATA = [
  { id: '1', name: 'Alex', dateJoined: 'Jan 15, 2026', pointsImproved: 247, streak: 47 },
  { id: '2', name: 'Jordan', dateJoined: 'Dec 28, 2025', pointsImproved: 198, streak: 35 },
  { id: '3', name: 'Taylor', dateJoined: 'Jan 5, 2026', pointsImproved: 185, streak: 28 },
  { id: '4', name: 'Morgan', dateJoined: 'Jan 20, 2026', pointsImproved: 172, streak: 12 },
  { id: '5', name: 'Casey', dateJoined: 'Jan 8, 2026', pointsImproved: 156, streak: 25 },
  { id: '6', name: 'Riley', dateJoined: 'Dec 15, 2025', pointsImproved: 143, streak: 48 },
  { id: '7', name: 'Jamie', dateJoined: 'Jan 18, 2026', pointsImproved: 128, streak: 14 },
  { id: '8', name: 'Sam', dateJoined: 'Jan 22, 2026', pointsImproved: 115, streak: 10 },
  { id: '9', name: 'Drew', dateJoined: 'Jan 12, 2026', pointsImproved: 94, streak: 21 },
  { id: '10', name: 'Avery', dateJoined: 'Jan 25, 2026', pointsImproved: 78, streak: 7 },
];

interface LeaderboardItemProps {
  item: typeof MOCK_LEADERBOARD_DATA[0];
  index: number;
}

function LeaderboardItem({ item, index }: LeaderboardItemProps) {
  return (
    <View style={styles.itemContainer}>
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
          <Text style={styles.pointsText}>+{item.pointsImproved}</Text>
        </LinearGradient>
      </View>

      {/* Name and date joined */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.dateJoined}>Joined {item.dateJoined}</Text>
      </View>

      {/* Streak */}
      <View style={styles.streakContainer}>
        <FlameGradientIcon size={20} />
        <Text style={styles.streakText}>{item.streak}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardTab() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    }, [fadeAnim, navigation])
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>Who is closest to their dream self?</Text>
          </View>

          <FlatList
            data={MOCK_LEADERBOARD_DATA}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <LeaderboardItem item={item} index={index} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </SafeAreaView>
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
  title: { 
    fontSize: 32, 
    fontFamily: Fonts.primary.regular, 
    color: Colors.textPrimary 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    fontFamily: Fonts.secondary.regular, 
    marginTop: 8 
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
  rankContainer: {
    width: 32,
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
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
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.regular,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
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
    fontWeight: '700',
    color: '#FF9A9E',
    fontFamily: Fonts.secondary.bold,
  },
});
