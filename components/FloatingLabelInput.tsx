import { TextInput, View, Text, StyleSheet, TextInputProps, Animated, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  error?: string;
  showCharCount?: boolean;
  maxCharCount?: number;
  containerStyle?: any;
}

export function FloatingLabelInput({
  label,
  error,
  showCharCount = false,
  maxCharCount,
  containerStyle,
  value = '',
  onFocus,
  onBlur,
  multiline,
  style,
  ...props
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(100);
  const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnimation = useRef(new Animated.Value(0)).current;

  // Animate label when focused or has value
  useEffect(() => {
    Animated.parallel([
      Animated.timing(labelAnimation, {
        toValue: isFocused || value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(borderAnimation, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused, value]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const labelStyle = {
    top: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -10],
    }),
    fontSize: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(150, 150, 150, 0.6)', '#B795FF'],
    }),
  };

  const borderColor = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(59, 37, 109, 0.4)', '#B795FF'],
  });

  const glowOpacity = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const charCount = typeof value === 'string' ? value.length : 0;
  const isOverLimit = maxCharCount && charCount > maxCharCount;

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View 
        style={[
          styles.inputWrapper,
          { borderColor },
          error && styles.inputWrapperError,
        ]}
      >
        {/* Glassmorphic background */}
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <View style={styles.inputContent}>
            {/* Floating label */}
            <Animated.Text style={[styles.label, labelStyle]}>
              {label}
            </Animated.Text>

            {/* Input field */}
            <TextInput
              style={[
                styles.input,
                multiline && styles.inputMultiline,
                multiline && { height: Math.max(60, contentHeight) },
                style,
              ]}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholderTextColor="transparent"
              multiline={multiline}
              onContentSizeChange={(e) => {
                if (multiline && Platform.OS !== 'web') {
                  setContentHeight(e.nativeEvent.contentSize.height);
                }
              }}
              {...props}
            />
          </View>
        </BlurView>

        {/* Focus glow effect */}
        <Animated.View 
          style={[
            styles.glowEffect,
            { opacity: glowOpacity }
          ]}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Character count and error */}
      <View style={styles.footer}>
        {showCharCount && (
          <Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
            {charCount}{maxCharCount ? `/${maxCharCount}` : ''}
          </Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  blurContainer: {
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 18, 30, 0.3)',
  },
  inputContent: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  label: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(12, 12, 16, 0.9)',
    paddingHorizontal: 4,
    fontWeight: '600',
    zIndex: 1,
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    paddingTop: 4,
    minHeight: 24,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#B795FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.6)',
    fontWeight: '500',
  },
  charCountError: {
    color: '#EF4444',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});

