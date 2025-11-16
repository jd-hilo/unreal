import { TextInput, View, Text, StyleSheet, TextInputProps, Animated, Platform, TouchableOpacity, Keyboard } from 'react-native';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as Haptics from 'expo-haptics';

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  error?: string;
  showCharCount?: boolean;
  maxCharCount?: number;
  containerStyle?: any;
  returnKeyType?: 'done' | 'next' | 'search' | 'send' | 'go' | 'default';
}

export const FloatingLabelInput = forwardRef<TextInput, FloatingLabelInputProps>(({
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
  returnKeyType,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(100);
  const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => inputRef.current as TextInput);

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

  const handleLabelPress = () => {
    inputRef.current?.focus();
  };

  const handleSubmitEditing = () => {
    if (returnKeyType === 'done') {
      Keyboard.dismiss();
      inputRef.current?.blur();
    }
  };

  const handleKeyPress = (e: any) => {
    if (returnKeyType === 'done' && e.nativeEvent.key === 'Enter') {
      e.preventDefault();
      Keyboard.dismiss();
      inputRef.current?.blur();
    }
  };

  const handleChangeText = (text: string) => {
    // Prevent newlines when returnKeyType is 'done'
    if (returnKeyType === 'done' && text.includes('\n')) {
      const textWithoutNewlines = text.replace(/\n/g, '');
      onChangeText?.(textWithoutNewlines);
      Keyboard.dismiss();
      inputRef.current?.blur();
      return;
    }
    onChangeText?.(text);
  };

  const labelContainerStyle = {
    top: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [12, -8],
    }),
  };

  const labelStyle = {
    fontSize: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 14],
    }),
    color: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 255, 255, 0.5)', '#4169E1'],
    }),
  };

  const borderColor = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(65, 105, 225, 0.3)', '#4169E1'],
  });

  const glowOpacity = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const charCount = typeof value === 'string' ? value.length : 0;
  const isOverLimit = maxCharCount && charCount > maxCharCount;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputWrapper}>
        {/* Floating label */}
        <Animated.View style={[styles.labelTouchable, labelContainerStyle]}>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={handleLabelPress}
          >
            <Animated.Text style={[styles.label, labelStyle]}>
              {label}
            </Animated.Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Input field */}
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                multiline && styles.inputMultiline,
                multiline && { height: Math.max(contentHeight, 28) },
                style,
              ]}
              value={value}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholderTextColor="rgba(150, 150, 150, 0.5)"
              multiline={multiline}
              returnKeyType={returnKeyType || (multiline ? 'default' : 'done')}
              onSubmitEditing={handleSubmitEditing}
              blurOnSubmit={returnKeyType === 'done' || !multiline}
              onKeyPress={handleKeyPress}
              onContentSizeChange={(e) => {
                if (multiline && Platform.OS !== 'web') {
                  setContentHeight(e.nativeEvent.contentSize.height);
                }
              }}
              {...props}
            />
        
        {/* Underline */}
        <View style={[styles.underline, { backgroundColor: isFocused ? 'rgba(74, 144, 226, 0.5)' : 'rgba(74, 144, 226, 0.3)' }]} />
        
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
    marginTop: 8,
    paddingTop: 40,
    marginBottom: 8,
  },
  labelTouchable: {
    position: 'absolute',
    left: 0,
    zIndex: 2,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  label: {
    backgroundColor: '#0C0C10',
    paddingHorizontal: 0,
    fontWeight: '600',
  },
  input: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 20,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 24,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 28,
    lineHeight: 20,
  },
  underline: {
    height: 2,
    marginTop: 4,
    borderRadius: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 0,
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

