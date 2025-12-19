import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { MapPin } from 'lucide-react-native';
import { getProfile, updateProfileFields, getRelationships } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';

export default function SetupLocationScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [currentLocation, setCurrentLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile) {
        setCurrentLocation(profile.current_location || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async function handleNext() {
    if (!user || !currentLocation.trim()) return;

    setLoading(true);
    try {
      await updateProfileFields(user.id, {
        current_location: currentLocation.trim(),
      });
      
      // Check what's next
      const relationships = await getRelationships(user.id);
      
      if (!relationships || relationships.length === 0) {
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
      title="Where do you currently live?"
      progress={0.67}
      onNext={handleNext}
      canContinue={currentLocation.trim().length > 0}
      loading={loading}
      nextLabel="Continue"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MapPin size={48} color={Colors.gradients.purple[0]} strokeWidth={1.5} />
        </View>

        <Text style={styles.description}>
          This helps your AI twin understand your context and make more accurate predictions about your life trajectory.
        </Text>

        <Input
          placeholder="e.g., Austin, Texas"
          value={currentLocation}
          onChangeText={setCurrentLocation}
          returnKeyType="done"
          containerStyle={styles.inputContainer}
          autoFocus
        />

        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>Examples:</Text>
          <Text style={styles.exampleText}>• Austin, Texas</Text>
          <Text style={styles.exampleText}>• San Francisco, CA</Text>
          <Text style={styles.exampleText}>• New York City, NY</Text>
          <Text style={styles.exampleText}>• London, UK</Text>
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

