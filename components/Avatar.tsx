import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  name?: string;
  size?: number;
  variant?: 'beam' | 'sunset' | 'bauhaus' | 'pixel' | 'ring' | 'marble';
  colors?: string[];
}

const SIZE = 80;

export function Avatar({ name, size = SIZE, variant, colors }: AvatarProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('@/assets/images/cube.png')}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
