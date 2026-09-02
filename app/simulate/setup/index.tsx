import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getProfile, getRelationships } from '@/lib/storage';
import { resolveSimulationReady } from '@/lib/simulationReady';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

export default function SetupIndexScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);

  useEffect(() => {
    checkMissingValues();
  }, [user]);

  async function checkMissingValues() {
    if (!user) return;

    try {
      const [profile, relationships] = await Promise.all([
        getProfile(user.id),
        getRelationships(user.id),
      ]);

      const simReady = resolveSimulationReady(profile, relationships);

      // Prefill path: onboarding already collected what we need
      if (simReady.ready) {
        router.replace('/simulate/new?auto=true');
        return;
      }

      // Only prompt for fields that are truly missing
      if (simReady.missing.includes('net_worth')) {
        router.replace('/simulate/setup/networth');
        return;
      }

      if (simReady.missing.includes('location')) {
        router.replace('/simulate/setup/location');
        return;
      }

      if (simReady.missing.includes('relationship')) {
        router.replace('/simulate/setup/relationships');
        return;
      }

      router.replace('/simulate/new?auto=true');
    } catch (error) {
      console.error('Failed to check missing values:', error);
      router.replace('/simulate/new');
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gradients.turquoise[0]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
