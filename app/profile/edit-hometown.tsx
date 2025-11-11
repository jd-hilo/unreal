import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ArrowLeft, Home } from 'lucide-react-native';
import { getProfile, updateProfileFields } from '@/lib/storage';

export default function EditHometownScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [hometown, setHometown] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile) {
        const onboardingHometown = profile.core_json?.onboarding_responses?.hometown;
        setHometown(profile.hometown || onboardingHometown || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    setLoading(true);
    try {
      await updateProfileFields(user.id, {
        hometown: hometown.trim() || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Hometown</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Hometown</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <Home size={48} color="#F59E0B" strokeWidth={1.5} />
        </View>

        <Text style={styles.description}>
          Where did you grow up? This helps your twin understand your background and formative experiences.
        </Text>

        <Input
          placeholder="e.g., Seattle, WA"
          value={hometown}
          onChangeText={setHometown}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          containerStyle={styles.inputContainer}
          autoFocus
        />

        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>Examples:</Text>
          <Text style={styles.exampleText}>• Seattle, Washington</Text>
          <Text style={styles.exampleText}>• Austin, Texas</Text>
          <Text style={styles.exampleText}>• Small town in Ohio</Text>
          <Text style={styles.exampleText}>• London, UK</Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          title={loading ? 'Saving...' : 'Save'}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 12,
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
  inputContainer: {
    marginBottom: 24,
  },
  exampleBox: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.7)',
    marginBottom: 6,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
  },
  saveButton: {
    width: '100%',
  },
});

