import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  height?: number;
  gradientColors?: readonly [string, string, ...string[]];
  trackColor?: string;
}

export function ProgressBar({ 
  progress, 
  showLabel = true, 
  height = 8, 
  gradientColors = ['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)'],
  trackColor = 'rgba(255, 255, 255, 0.1)'
}: ProgressBarProps) {
  // Commented out Reanimated code - using simple static version
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 15,
      stiffness: 100,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    // Ensure progress is between 0 and 1, then convert to percentage
    const clampedProgress = Math.min(1, Math.max(0, animatedProgress.value));
    return {
      width: `${clampedProgress * 100}%`,
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, backgroundColor: trackColor }]}>
        <Animated.View style={[{ height, borderRadius: 100, overflow: 'hidden' }, animatedStyle]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(progress * 100)}%</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    minWidth: 45,
  },
});
