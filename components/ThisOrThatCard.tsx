import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface ThisOrThatCardProps {
  option: string;
  imageUrl: string;
  onPress: () => void;
  isSelected?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
}

export function ThisOrThatCard({
  option,
  imageUrl,
  onPress,
  isSelected = false,
  isSaving = false,
  disabled = false,
}: ThisOrThatCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset loading state when imageUrl changes
    if (imageUrl && imageUrl.trim() !== '') {
      setImageLoading(true);
      setImageError(false);
    } else {
      // No image URL - show placeholder immediately, no loading
      setImageLoading(false);
      setImageError(true);
    }
  }, [imageUrl]);

  useEffect(() => {
    if (isSelected) {
      // Pulse animation when selected
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isSelected]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  function handlePress() {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.9}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isSelected && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
              },
            ]}
            pointerEvents="none"
          />
        )}
        <BlurView intensity={80} tint="dark" style={styles.card}>
          {/* Glass border */}
          <View style={[styles.glassBorder, isSelected && styles.glassBorderSelected]} />
          {/* Inner highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassHighlight}
            pointerEvents="none"
          />
          
          {/* Image Container */}
          <View style={styles.imageContainer}>
            {imageLoading && imageUrl && imageUrl.trim() !== '' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(135, 206, 250, 0.9)" />
              </View>
            )}
            {isSaving && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.savingText}>Saving...</Text>
              </View>
            )}
            {!imageUrl || imageUrl.trim() === '' || imageError ? (
              <View style={styles.placeholderContainer}>
                <LinearGradient
                  colors={['rgba(135, 206, 250, 0.2)', 'rgba(100, 181, 246, 0.15)', 'rgba(20, 30, 50, 0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.placeholderGradient}
                />
                <Text style={styles.placeholderText}>{option}</Text>
              </View>
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => {
                  if (imageUrl && imageUrl.trim() !== '') {
                    setImageLoading(true);
                  }
                }}
                onLoadEnd={() => {
                  setImageLoading(false);
                  setImageError(false);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            )}
            {/* Gradient overlay for text readability */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={styles.imageOverlay}
              pointerEvents="none"
            />
          </View>

          {/* Option Label */}
          <View style={styles.labelContainer}>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {option}
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginHorizontal: 0,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 34,
    backgroundColor: 'rgba(135, 206, 250, 0.4)',
    shadowColor: 'rgba(135, 206, 250, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
    zIndex: -1,
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    width: '100%',
    height: 280,
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  glassBorderSelected: {
    borderColor: 'rgba(135, 206, 250, 0.9)',
    borderWidth: 2,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    zIndex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    gap: 8,
  },
  savingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 30, 50, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  placeholderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 2,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 30, 50, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  labelContainer: {
    padding: 20,
    zIndex: 2,
  },
  label: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  labelSelected: {
    color: 'rgba(135, 206, 250, 1)',
    textShadowColor: 'rgba(135, 206, 250, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
    marginTop: 4,
  },
});

