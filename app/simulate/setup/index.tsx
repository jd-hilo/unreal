import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { getProfile, getRelationships } from '@/lib/storage';
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

      // Check what's missing and route to the first missing step
      if (!profile?.net_worth) {
        router.replace('/simulate/setup/networth');
        return;
      }

      if (!profile?.current_location) {
        router.replace('/simulate/setup/location');
        return;
      }

      if (!relationships || relationships.length === 0) {
        router.replace('/simulate/setup/relationships');
        return;
      }

      // All values are present, go back to simulation create
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

