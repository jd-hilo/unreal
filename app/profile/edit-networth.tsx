import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ArrowLeft, DollarSign } from 'lucide-react-native';
import { getProfile, updateProfileFields } from '@/lib/storage';

export default function EditNetWorthScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [netWorth, setNetWorth] = useState('');
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
        setNetWorth(profile.net_worth || '');
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
        net_worth: netWorth.trim() || undefined,
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
          <Text style={styles.title}>Net Worth</Text>
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
        <Text style={styles.title}>Net Worth</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <DollarSign size={48} color="#10B981" strokeWidth={1.5} />
        </View>

        <Text style={styles.description}>
          What's your approximate net worth? This is the total value of your assets minus your debts.
        </Text>

        <Input
          placeholder="e.g., $45k, $250k, $2.5M"
          value={netWorth}
          onChangeText={setNetWorth}
          returnKeyType="done"
          onSubmitEditing={handleSave}
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

        <View style={styles.note}>
          <Text style={styles.noteText}>
            💡 Your net worth helps your twin make more realistic financial predictions in what-if scenarios.
          </Text>
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
    marginBottom: 16,
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
  note: {
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

