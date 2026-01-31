import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { Zap, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRef, useCallback } from 'react';

export default function CompatibilityTab() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim])
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Compatibility</Text>
            <Text style={styles.subtitle}>See how your twin vibes with others</Text>
          </View>

          <View style={styles.centerContent}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/compatibility/add-twin');
              }}
              activeOpacity={0.9}
              style={styles.mainCard}
            >
              <LinearGradient
                colors={['rgba(167, 139, 250, 0.1)', 'rgba(244, 114, 182, 0.1)']}
                style={styles.cardGradient}
              />
              <View style={styles.avatarRow}>
                <Image source={require('@/assets/images/manwhite.png')} style={styles.avatar} resizeMode="contain" />
                <View style={styles.zapContainer}>
                  <Zap size={24} color="#A78BFA" fill="#A78BFA" />
                </View>
                <Image source={require('@/assets/images/manwhite.png')} style={[styles.avatar, styles.avatarFlipped]} resizeMode="contain" />
              </View>
              <Text style={styles.cardTitle}>Check Compatibility</Text>
              <Text style={styles.cardSubtitle}>Compare digital twins and find alignment</Text>
              <View style={styles.actionButton}>
                <Text style={styles.actionText}>Start Test</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { marginBottom: 40 },
  title: { fontSize: 32, fontFamily: Fonts.primary.regular, color: Colors.textPrimary },
  subtitle: { fontSize: 16, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, marginTop: 8 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  mainCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 40, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, overflow: 'hidden' },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 32 },
  avatar: { width: 80, height: 80 },
  avatarFlipped: { transform: [{ scaleX: -1 }] },
  zapContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 24, fontWeight: '800', fontFamily: Fonts.primary.regular, color: Colors.textPrimary, marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#A78BFA', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 20, gap: 8 },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
