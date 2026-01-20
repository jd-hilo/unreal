import React from 'react';
import { Text, TextProps } from 'react-native';

interface LigatureFreeTextProps extends TextProps {
  text: string;
}

export function LigatureFreeText({ text, style, ...props }: LigatureFreeTextProps) {
  // Use Zero Width Non-Joiner (U+200C) to break ligatures without adding space
  // This is the standard way to prevent ligatures
  const cleanText = text
    .replace(/fi/g, 'f\u200Ci')
    .replace(/fl/g, 'f\u200Cl')
    .replace(/ff/g, 'f\u200Cf')
    .replace(/ft/g, 'f\u200Ct')
    .replace(/Fi/g, 'F\u200Ci')
    .replace(/Fl/g, 'F\u200Cl');

  return <Text style={style} {...props}>{cleanText}</Text>;
}
