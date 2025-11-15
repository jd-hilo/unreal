import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle, Keyboard } from 'react-native';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  returnKeyType,
  blurOnSubmit,
  multiline,
  onSubmitEditing,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Use explicit returnKeyType if provided, otherwise use smart defaults
  const finalReturnKeyType = returnKeyType !== undefined ? returnKeyType : 'done';
  const finalBlurOnSubmit = blurOnSubmit !== undefined ? blurOnSubmit : true;

  const handleSubmitEditing: TextInputProps['onSubmitEditing'] = (event) => {
    onSubmitEditing?.(event);
    Keyboard.dismiss();
  };

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
        placeholderTextColor={props.placeholderTextColor || "rgba(150, 150, 150, 0.6)"}
        returnKeyType={finalReturnKeyType}
        blurOnSubmit={finalBlurOnSubmit}
        multiline={multiline}
        enablesReturnKeyAutomatically={true}
        onSubmitEditing={handleSubmitEditing}
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
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    color: '#FFFFFF',
  },
  input_focused: {
    // No border on focus
  },
  input_error: {
    // Error state can be handled differently if needed
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
