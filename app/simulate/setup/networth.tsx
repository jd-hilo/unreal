import { View, Text, StyleSheet, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { DollarSign } from 'lucide-react-native';
import { getProfile, updateProfileFields, getRelationships } from '@/lib/storage';
import { useTypewriter } from '@/hooks/useTypewriter';
import { Colors, Fonts } from '@/constants/Theme';

export default function SetupNetWorthScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [netWorth, setNetWorth] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  // Typewriter effect for intro text
  const { displayedLines, isComplete: introComplete } = useTypewriter(
    ["before we begin, we need more info"],
    { speed: 30 }
  );

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Show form after intro completes
  useEffect(() => {
    if (introComplete) {
      setTimeout(() => {
        setShowForm(true);
        Animated.timing(formFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 500);
    }
  }, [introComplete]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile) {
        setNetWorth(profile.net_worth || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async function handleNext() {
    if (!user || !netWorth.trim()) return;

    setLoading(true);
    try {
      await updateProfileFields(user.id, {
        net_worth: netWorth.trim(),
      });
      
      // Check what's next
      const profile = await getProfile(user.id);
      const relationships = await getRelationships(user.id);
      
      if (!profile?.current_location) {
        router.push('/simulate/setup/location');
      } else if (!relationships || relationships.length === 0) {
        router.push('/simulate/setup/relationships');
      } else {
        router.replace('/simulate/new?auto=true');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingScreen
      title={showForm ? "What's your net worth?" : displayedLines[0] || ''}
      progress={0.33}
      onNext={handleNext}
      canContinue={showForm && netWorth.trim().length > 0}
      loading={loading}
      nextLabel="Continue"
    >
      {showForm ? (
        <Animated.View style={[styles.content, { opacity: formFadeAnim }]}>
          <View style={styles.iconContainer}>
            <DollarSign size={48} color={Colors.gradients.turquoise[0]} strokeWidth={1.5} />
          </View>

          <Text style={styles.description}>
            This is the total value of your assets minus your debts. It helps your twin make more realistic financial predictions.
          </Text>

          <Input
            placeholder="e.g., $45k, $250k, $2.5M"
            value={netWorth}
            onChangeText={setNetWorth}
            returnKeyType="done"
            containerStyle={styles.inputContainer}
            autoFocus
          />

          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>Examples:</Text>
            <Text style={styles.exampleText}>• $25k (early career)</Text>
            <Text style={styles.exampleText}>• $150k (established professional)</Text>
            <Text style={styles.exampleText}>• $750k (homeowner with retirement savings)</Text>
            <Text style={styles.exampleText}>• $2.5M (high net worth)</Text>
          </View>
        </Animated.View>
      ) : null}
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
  inputContainer: {
    marginBottom: 24,
  },
  exampleBox: {
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
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
  },
  exampleText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontFamily: Fonts.secondary.bold,
  },
});

