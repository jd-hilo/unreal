import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';

interface SwipeableOptionCardProps {
  option: string;
  index: number;
  onDelete?: () => void;
  onEdit?: () => void;
  delay?: number;
}

export function SwipeableOptionCard({
  option,
  index,
  onDelete,
  onEdit,
  delay = 0,
}: SwipeableOptionCardProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEdit?.();
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.blurCard}>
          <View style={styles.cardContent}>
            {/* Edit button on left */}
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.iconButton}
              activeOpacity={0.6}
            >
              <Edit2 size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            {/* Number badge */}
            <View style={styles.numberBadge}>
              <LinearGradient
                colors={['#FF9F43', '#FF6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.numberBadgeGradient}
              >
                <Text style={styles.numberText}>{index + 1}</Text>
              </LinearGradient>
            </View>

            {/* Option text */}
            <View style={styles.textContainer}>
              <Text style={styles.optionText}>{option}</Text>
            </View>

            {/* Delete button on right */}
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.iconButton}
              activeOpacity={0.6}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  blurCard: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  numberBadgeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 21,
    fontFamily: Fonts.secondary.bold,
  },
});

