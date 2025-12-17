import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Colors, Fonts } from '@/constants/Theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonContent = (
    <View style={styles.contentRow}>
      {icon}
      <Text
        style={[
          styles.text,
          styles[`text_${variant}`],
          styles[`text_${size}`],
          isDisabled && styles.text_disabled,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.buttonWrapper,
          styles[`button_${size}`],
          isDisabled && styles.button_disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={Colors.gradients.peach}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.buttonGradient,
            styles[`button_${size}`],
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Secondary and outline variants
  const gradientColors = variant === 'secondary' 
    ? Colors.gradients.purple 
    : Colors.gradients.turquoise;

  return (
    <TouchableOpacity
      style={[
        styles.buttonWrapper,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        isDisabled && styles.button_disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {variant === 'outline' ? (
        <View style={[
          styles.buttonOutline,
          styles[`button_${size}`],
        ]}>
          {buttonContent}
        </View>
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.buttonGradient,
            styles[`button_${size}`],
          ]}
        >
          {buttonContent}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(255, 154, 158, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  buttonOutline: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    backgroundColor: 'transparent',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button_primary: {
    // Handled by gradient
  },
  button_secondary: {
    // Handled by gradient
  },
  button_outline: {
    backgroundColor: 'transparent',
  },
  button_small: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  button_medium: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  button_large: {
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  button_disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: Fonts.secondary.bold,
    fontWeight: '700',
  },
  text_primary: {
    color: Colors.textPrimary,
  },
  text_secondary: {
    color: Colors.textPrimary,
  },
  text_outline: {
    color: Colors.textPrimary,
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_disabled: {
    opacity: 1,
  },
});
