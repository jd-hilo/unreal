import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { MapPin } from 'lucide-react-native';
import { getProfile, updateProfileFields, getRelationships } from '@/lib/storage';

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
      backgroundGradient={['#050505', '#0F0F18', '#0D0D15', '#050505']}
      buttonGradient={['rgba(65, 105, 225, 0.9)', 'rgba(30, 58, 138, 0.8)', 'rgba(65, 105, 225, 0.7)']}
      progressBarGradient={['#87CEFA', '#87CEFA']}
      buttonShadowColor="rgba(65, 105, 225, 0.5)"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MapPin size={48} color="#4169E1" strokeWidth={1.5} />
        </View>

        <Text style={styles.description}>
          Helps your AI twin understand your context for more accurate predictions.
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
          <Text style={styles.exampleText}>• Austin, Texas • San Francisco, CA • New York City, NY</Text>
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
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(200, 200, 200, 0.85)',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  exampleBox: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.7)',
    lineHeight: 18,
  },
});

