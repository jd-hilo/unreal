import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, returnKeyType, blurOnSubmit, multiline, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Use explicit returnKeyType if provided, otherwise use smart defaults
  const finalReturnKeyType = returnKeyType !== undefined ? returnKeyType : (multiline ? 'default' : 'done');
  const finalBlurOnSubmit = blurOnSubmit !== undefined ? blurOnSubmit : !multiline;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          style,
          isFocused && styles.input_focused,
          error && styles.input_error,
          { color: '#FFFFFF' }, // Ensure text is always white
        ]}
        placeholderTextColor="rgba(150, 150, 150, 0.6)"
        returnKeyType={finalReturnKeyType}
        blurOnSubmit={finalBlurOnSubmit}
        multiline={multiline}
        enablesReturnKeyAutomatically={true}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  input_focused: {
    borderColor: '#B795FF',
  },
  input_error: {
    borderColor: '#EF4444',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
