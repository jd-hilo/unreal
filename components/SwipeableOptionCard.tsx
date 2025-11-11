import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { Edit2, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
        <BlurView intensity={30} tint="dark" style={styles.blurCard}>
          <View style={styles.cardContent}>
            {/* Edit button on left */}
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.iconButton}
              activeOpacity={0.6}
            >
              <Edit2 size={18} color="rgba(200, 200, 200, 0.6)" />
            </TouchableOpacity>

            {/* Number badge */}
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
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
              <Trash2 size={18} color="rgba(239, 68, 68, 0.7)" />
            </TouchableOpacity>
          </View>
        </BlurView>
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
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
  },
  blurCard: {
    backgroundColor: 'rgba(20, 18, 30, 0.3)',
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
    backgroundColor: 'rgba(183, 149, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.4)',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B795FF',
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 21,
  },
});

