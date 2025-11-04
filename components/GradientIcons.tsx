import React from 'react';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';

type IconProps = {
  size?: number;
};

export function CompassGradientIcon({ size = 20 }: IconProps) {
  const s = size;
  const center = s / 2;
  const r = s / 2 - 1;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#B77CFF" />
          <Stop offset="100%" stopColor="#5A2DAE" />
        </SvgLinearGradient>
        <SvgLinearGradient id="compFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#DCC8FF" />
          <Stop offset="100%" stopColor="#9E79FF" />
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

export function StarGradientIcon({ size = 20 }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="starStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E9E1FF" />
          <Stop offset="100%" stopColor="#9E79FF" />
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

export function HomeGradientIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="homeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#C5B3FF" />
          <Stop offset="100%" stopColor="#8A5CFF" />
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

export function UserGradientIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#C5B3FF" />
          <Stop offset="100%" stopColor="#8A5CFF" />
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


