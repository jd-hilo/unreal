import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';

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
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#000000'} />
      ) : (
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
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <View style={[
        styles.buttonWrapper,
        styles[`button_${size}`],
        isDisabled && styles.button_disabled,
        style,
      ]}>
        <BlurView intensity={80} tint="dark" style={styles.button}>
          {/* Classic glass border */}
          <View style={styles.glassBorder} />
          {/* Subtle inner highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassHighlight}
            pointerEvents="none"
          />
          <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.9}
            style={[
              styles.buttonInner,
              styles[`button_${size}`],
            ]}
          >
            {buttonContent}
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        isDisabled && styles.button_disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {buttonContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
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
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    zIndex: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button_primary: {
    backgroundColor: 'transparent',
  },
  button_secondary: {
    backgroundColor: 'rgba(59, 37, 109, 0.3)',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  button_small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontWeight: '600',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: '#FFFFFF',
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
