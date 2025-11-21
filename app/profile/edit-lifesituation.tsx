import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { getProfile, saveOnboardingResponse } from '@/lib/storage';

export default function EditLifeSituationScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      // Prefer new key '02-now', fallback to legacy '01-now'
      const existing =
        profile?.core_json?.onboarding_responses?.['02-now'] ??
        profile?.core_json?.onboarding_responses?.['01-now'];
      if (existing) {
        setResponse(existing);
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
      // Save to the new key
      await saveOnboardingResponse(user.id, '02-now', response.trim());
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
          <Text style={styles.title}>Current Life Situation</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Current Life Situation</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.aiNote}>
          <Text style={styles.aiNoteText}>
            AI generated this response, please add context to it to improve accuracy
          </Text>
        </View>

        <Input
          placeholder="e.g., I'm a software engineer at a startup in Austin, recently moved here, enjoying the tech scene..."
          value={response}
          onChangeText={setResponse}
          multiline
          numberOfLines={6}
          returnKeyType="done"
          blurOnSubmit={true}
          containerStyle={styles.inputContainer}
          autoFocus
        />
      </ScrollView>

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
    paddingBottom: 0,
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
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(200, 200, 200, 0.85)',
    marginBottom: 16,
  },
  aiNote: {
    backgroundColor: 'rgba(135, 206, 250, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(135, 206, 250, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  aiNoteText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(135, 206, 250, 0.9)',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 24,
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

