// Theme constants for playful light mode redesign
import { Platform } from 'react-native';

export const Colors = {
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
  
  // Text colors
  textPrimary: '#000000',
  textSecondary: 'rgba(0, 0, 0, 0.7)',
  textTertiary: 'rgba(0, 0, 0, 0.5)',
  
  // Gradients
  gradients: {
    peach: ['#E87A7F', '#E4B5D3', '#E4B8A6'] as const,
    purple: ['#000000', '#1a1a1a', '#2d2d2d'] as const,
    turquoise: ['#6BCA9A', '#6BB8D4', '#7AA5E8'] as const,
  },
  
  // Legacy dark mode colors (for reference, will be replaced)
  dark: {
    background: '#0C0C10',
    backgroundSecondary: '#09090A',
  },
};

export const Fonts = {
  // Primary font - Recoleta
  primary: {
    regular: 'Recoleta-Regular',
    semibold: 'Recoleta-Semibold',
  },
  
  // Secondary font - Inter
  secondary: {
    regular: 'Inter_400Regular',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  
  // Fallback fonts
  fallback: {
    primary: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    secondary: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
};
