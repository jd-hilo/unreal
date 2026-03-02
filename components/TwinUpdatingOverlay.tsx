import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Image, Animated, StyleSheet, Easing } from 'react-native';
import { Colors, Fonts } from '@/constants/Theme';

type Props = {
  visible: boolean;
};

export function TwinUpdatingOverlay({ visible }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -18,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      floatAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.Image
          source={require('@/assets/images/manwhite.png')}
          style={[
            styles.figure,
            { transform: [{ translateY: floatAnim }] },
          ]}
          resizeMode="contain"
        />
        <Text style={styles.title}>Updating your twin</Text>
        <View style={styles.dotsRow}>
          <PulseDot delay={0} />
          <PulseDot delay={200} />
          <PulseDot delay={400} />
        </View>
      </Animated.View>
    </Modal>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ scale }] }]} />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  figure: {
    width: 160,
    height: 260,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary?.bold ?? undefined,
    letterSpacing: -0.4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textPrimary,
  },
});
