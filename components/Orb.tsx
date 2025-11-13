import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

interface OrbProps {
  status: 'connecting' | 'connected' | 'speaking' | 'listening' | 'disconnected';
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Orb({ status, size = 180 }: OrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation animation (always active)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    // Different animations based on status
    switch (status) {
      case 'speaking':
        // Fast pulse when speaking
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0.95,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        break;

      case 'listening':
        // Gentle breathing pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: false,
        }).start();
        break;

      case 'connecting':
        // Slow fade pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0.98,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }).start();
        break;

      case 'connected':
      case 'disconnected':
      default:
        // Return to normal
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
        break;
    }
  }, [status]);

  const getColors = () => {
    switch (status) {
      case 'speaking':
        return {
          primary: '#F59E0B',
          secondary: '#FBBF24',
          glow: '#F59E0B',
        };
      case 'listening':
        return {
          primary: '#10B981',
          secondary: '#34D399',
          glow: '#10B981',
        };
      case 'connecting':
        return {
          primary: '#3B82F6',
          secondary: '#60A5FA',
          glow: '#3B82F6',
        };
      case 'disconnected':
        return {
          primary: '#6B7280',
          secondary: '#9CA3AF',
          glow: '#6B7280',
        };
      case 'connected':
      default:
        return {
          primary: '#B795FF',
          secondary: '#D4BBFF',
          glow: '#B795FF',
        };
    }
  };

  const colors = getColors();
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.orbContainer,
          {
            transform: [{ scale: pulseAnim }, { rotate: rotation }],
          },
        ]}
      >
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="orbGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
              <Stop offset="50%" stopColor={colors.secondary} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.3" />
            </RadialGradient>
          </Defs>
          
          {/* Main orb */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill="url(#orbGradient)"
          />
          
          {/* Inner glow layer */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 20}
            fill={colors.primary}
            opacity={glowAnim}
          />
          
          {/* Outer ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 5}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            opacity="0.5"
          />
        </Svg>
      </Animated.View>
      
      {/* Glow effect background */}
      <Animated.View
        style={[
          styles.glowBackground,
          {
            backgroundColor: colors.glow,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbContainer: {
    position: 'relative',
    zIndex: 2,
  },
  glowBackground: {
    position: 'absolute',
    zIndex: 1,
  },
});

