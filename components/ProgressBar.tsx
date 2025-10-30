import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  height?: number;
}

export function ProgressBar({ progress, showLabel = true, height = 8 }: ProgressBarProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 15,
      stiffness: 100,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value}%`,
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <Animated.View style={[styles.fill, { height }, animatedStyle]} />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  track: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: '#000000',
    borderRadius: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    minWidth: 45,
  },
});
