import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { getProfile, saveOnboardingResponse, updateProfileFields } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

export default function EditValuesScreen() {
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
      // Prefer dedicated column, then new key '01-values', fallback to legacy '03-values'
      const existing =
        profile?.core_value ??
        profile?.core_json?.onboarding_responses?.['01-values'] ??
        profile?.core_json?.onboarding_responses?.['03-values'];
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
      const trimmedResponse = response.trim();
      // Save to both core_json and dedicated column
      await saveOnboardingResponse(user.id, '01-values', trimmedResponse);
      await saveOnboardingResponse(user.id, '03-values', trimmedResponse); // Also save to legacy key
      await updateProfileFields(user.id, {
        core_value: trimmedResponse,
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
      <View style={styles.gradientBackground}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Core Values</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gradientBackground}>
      <StatusBar style="dark" />
      {/* Background gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(232, 122, 127, 0.15)', // peach
          'rgba(132, 250, 176, 0.15)', // turquoise
          'rgba(192, 132, 252, 0.15)', // purple
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Core Values</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          What matters most to you? Share your core values - the principles and priorities that guide your decisions.
        </Text>

        <Input
          placeholder="e.g., Freedom to work on what I want, financial security, time with family, personal growth, making an impact..."
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
        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={({ pressed }) => [
            styles.saveButtonWrapper,
            pressed && { opacity: 0.9 }
          ]}
        >
          <View style={[
            styles.saveButton,
            loading && styles.saveButtonDisabled
          ]}>
            {!loading && (
              <LinearGradient
                colors={Colors.gradients.turquoise}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[
              styles.saveButtonText,
              loading && styles.saveButtonTextDisabled
            ]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
            {!loading && <ChevronRight size={20} color="#FFFFFF" />}
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
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
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
  },
  saveButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  saveButtonTextDisabled: {
    color: Colors.textTertiary,
  },
});

