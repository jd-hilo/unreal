import React from 'react';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';

type MannequinHeadProps = {
  size?: number;
  opacity?: number;
};

export function MannequinHead({ size = 300, opacity = 0.08 }: MannequinHeadProps) {
  return (
    <View style={[styles.container, { width: size, height: size, opacity }]}>
      <Svg width={size} height={size} viewBox="0 0 200 240">
        <Defs>
          <SvgLinearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3B256D" stopOpacity="0.3" />
            <Stop offset="50%" stopColor="#2A1A4D" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#1A0F2E" stopOpacity="0.1" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Head outline - stylized mannequin */}
        <Path
          d="M 100 40 
             C 130 40, 150 60, 150 95
             C 150 110, 145 120, 145 135
             L 145 160
             C 145 165, 142 170, 138 173
             L 130 180
             C 128 182, 125 185, 120 188
             L 110 195
             C 108 197, 105 200, 100 200
             C 95 200, 92 197, 90 195
             L 80 188
             C 75 185, 72 182, 70 180
             L 62 173
             C 58 170, 55 165, 55 160
             L 55 135
             C 55 120, 50 110, 50 95
             C 50 60, 70 40, 100 40 Z"
          fill="url(#headGrad)"
          stroke="rgba(110, 61, 240, 0.15)"
          strokeWidth="1"
        />
        
        {/* Neck */}
        <Path
          d="M 80 188
             C 78 190, 77 195, 77 200
             L 77 220
             C 77 225, 80 230, 85 235
             L 115 235
             C 120 230, 123 225, 123 220
             L 123 200
             C 123 195, 122 190, 120 188
             L 100 200
             L 80 188 Z"
          fill="url(#headGrad)"
          stroke="rgba(110, 61, 240, 0.12)"
          strokeWidth="1"
        />
        
        {/* Facial features outline - minimal */}
        <Path
          d="M 75 85 Q 80 82, 85 85"
          stroke="rgba(110, 61, 240, 0.2)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M 115 85 Q 120 82, 125 85"
          stroke="rgba(110, 61, 240, 0.2)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Nose */}
        <Path
          d="M 100 95 L 95 110 M 100 95 L 105 110"
          stroke="rgba(110, 61, 240, 0.15)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});


