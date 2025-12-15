import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Users } from 'lucide-react-native';

export default function SetupRelationshipsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!user) return;

    setLoading(true);
    try {
      // Navigate to relationships add page, which will route back to simulation create when done
      router.push('/relationships/add?next=/simulate/new?auto=true');
    } catch (error) {
      console.error('Failed to navigate:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingScreen
      title="Add your relationships"
      progress={1.0}
      onNext={handleNext}
      canContinue={true}
      loading={loading}
      nextLabel="Continue"
      backgroundGradient={['#050505', '#0F0F18', '#0D0D15', '#050505']}
      buttonGradient={['rgba(65, 105, 225, 0.9)', 'rgba(30, 58, 138, 0.8)', 'rgba(65, 105, 225, 0.7)']}
      progressBarGradient={['#87CEFA', '#87CEFA']}
      buttonShadowColor="rgba(65, 105, 225, 0.5)"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Users size={48} color="#EC4899" strokeWidth={1.5} />
        </View>

        <Text style={styles.description}>
          We need at least one relationship to simulate your social life accurately. Add the important people in your life.
        </Text>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            💡 You can add partners, family, friends, mentors, or coworkers. The more relationships you add, the better your simulation will be.
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(200, 200, 200, 0.85)',
    marginBottom: 32,
    textAlign: 'center',
  },
  noteBox: {
    backgroundColor: 'rgba(183, 149, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(200, 200, 200, 0.85)',
  },
});

