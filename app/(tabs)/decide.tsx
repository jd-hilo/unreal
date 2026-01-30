import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { CheckCircle, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function DecideTab() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Decide</Text>
            <Text style={styles.subtitle}>Get recommendations and compare outcomes</Text>
          </View>

          <View style={styles.centerContent}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/decision/new');
              }}
              style={({ pressed }) => [
                styles.decideButton,
                {
                  shadowColor: '#fe8c9c',
                  transform: [{ translateY: pressed ? 4 : 0 }],
                  shadowOffset: { width: 0, height: pressed ? 0 : 8 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: pressed ? 2 : 12,
                }
              ]}
            >
              <LinearGradient
                colors={['#fe8c9c', '#fdcca7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              />
              <View style={styles.iconContainer}>
                <CheckCircle size={40} color={Colors.textPrimary} />
              </View>
              <Text style={styles.buttonText}>New Decision</Text>
              <ChevronRight size={24} color={Colors.textTertiary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { marginBottom: 60 },
  title: { fontSize: 32, fontFamily: Fonts.primary.regular, color: Colors.textPrimary },
  subtitle: { fontSize: 16, color: Colors.textSecondary, fontFamily: Fonts.secondary.regular, marginTop: 8 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  decideButton: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  gradient: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  buttonText: { flex: 1, fontSize: 24, fontWeight: '700', fontFamily: Fonts.primary.regular, color: Colors.textPrimary },
});
