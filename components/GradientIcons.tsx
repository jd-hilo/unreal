import React from 'react';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';

type IconProps = {
  size?: number;
};

// Peach Gradient: #FF9A9E to #FECFEF
export function CompassGradientIcon({ size = 20 }: IconProps) {
  const s = size;
  const center = s / 2;
  const r = s / 2 - 1;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF9A9E" />
          <Stop offset="100%" stopColor="#FECFEF" />
        </SvgLinearGradient>
        <SvgLinearGradient id="compFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF9A9E" />
          <Stop offset="100%" stopColor="#FECFEF" />
        </SvgLinearGradient>
      </Defs>
      {/* outer subtle inner ring to mimic icon styling */}
      <Circle cx={center} cy={center} r={r} stroke="url(#ringGrad)" strokeWidth={1.8} fill="none" />
      {/* diamond / compass */}
      <Path
        d={`M ${center} ${center - r * 0.45} L ${center + r * 0.35} ${center} L ${center} ${center + r * 0.45} L ${center - r * 0.35} ${center} Z`}
        fill="url(#compFill)"
      />
    </Svg>
  );
}

// Purple Gradient: #E0C3FC to #8EC5FC
export function StarGradientIcon({ size = 20 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="starStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E0C3FC" />
          <Stop offset="100%" stopColor="#8EC5FC" />
        </SvgLinearGradient>
      </Defs>
      {/* smooth 4-point star using cubic curves */}
      <Path
        d="M12 3.5 C12.8 7.5 16.5 11.2 20.5 12 C16.5 12.8 12.8 16.5 12 20.5 C11.2 16.5 7.5 12.8 3.5 12 C7.5 11.2 11.2 7.5 12 3.5 Z"
        fill="none"
        stroke="url(#starStroke)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Turquoise Gradient: #84FAB0 to #8FD3F4
export function HomeGradientIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="homeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#84FAB0" />
          <Stop offset="50%" stopColor="#8FD3F4" />
          <Stop offset="100%" stopColor="#A1C4FD" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill="none"
        stroke="url(#homeGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V12H15V21"
        fill="none"
        stroke="url(#homeGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Peach Gradient: #FF9A9E to #FECFEF (reused for user profile)
export function UserGradientIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF9A9E" />
          <Stop offset="50%" stopColor="#FECFEF" />
          <Stop offset="100%" stopColor="#FAD0C4" />
        </SvgLinearGradient>
      </Defs>
      <Circle
        cx="12"
        cy="8"
        r="4"
        fill="none"
        stroke="url(#userGrad)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M6 21C6 17.134 8.686 14 12 14C15.314 14 18 17.134 18 21"
        fill="none"
        stroke="url(#userGrad)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Purple Gradient: #E0C3FC to #8EC5FC
export function SimulationsGradientIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="simulationsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E0C3FC" />
          <Stop offset="50%" stopColor="#8EC5FC" />
          <Stop offset="100%" stopColor="#A8C0EE" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        fill="none"
        stroke="url(#simulationsGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 17L12 22L22 17"
        fill="none"
        stroke="url(#simulationsGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 12L12 17L22 12"
        fill="none"
        stroke="url(#simulationsGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Orange/Red Gradient: #FF9A9E to #FECFEF (Flame)
export function FlameGradientIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF9A9E" />
          <Stop offset="50%" stopColor="#FECFEF" />
          <Stop offset="100%" stopColor="#FF6B6B" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3.1.3.4.7.9 1.8z"
        fill="url(#flameGrad)"
        stroke="none"
      />
    </Svg>
  );
}


