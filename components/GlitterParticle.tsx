import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlitterParticleProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete?: () => void;
  delay?: number;
}

export function GlitterParticle({ 
  startX, 
  startY, 
  endX, 
  endY, 
  onComplete,
  delay = 0 
}: GlitterParticleProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Use parallel animations with delays for a smoother, overlapping effect
    Animated.parallel([
      // Move X - Smooth ease out
      Animated.timing(translateX, {
        toValue: deltaX,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        delay: delay,
        useNativeDriver: true,
      }),
      // Move Y - Smooth ease out
      Animated.timing(translateY, {
        toValue: deltaY,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        delay: delay,
        useNativeDriver: true,
      }),
      // Rotate - Continuous spin
      Animated.timing(rotation, {
        toValue: 1, 
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        delay: delay,
        useNativeDriver: true,
      }),
      // Scale Sequence (Pop in -> Stay -> Shrink)
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)), // Pop out effect
          useNativeDriver: true,
        }),
        Animated.delay(400), // Stay visible
        Animated.timing(scale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]),
      // Opacity Sequence (Fade in -> Stay -> Fade out)
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      if (onComplete) onComplete();
    });
  }, [startX, startY, endX, endY, delay]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['#25729f', '#62edb9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sparkle}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    zIndex: 9999,
  },
  sparkle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#25729f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});
