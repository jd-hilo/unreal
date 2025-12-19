import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Users } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';

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
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Users size={48} color={Colors.gradients.purple[2]} strokeWidth={1.5} />
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
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: Fonts.secondary.bold,
  },
  noteBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 16,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
});

