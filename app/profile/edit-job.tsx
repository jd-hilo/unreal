import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { getProfile, refreshLifeSituationAfterIdentityUpdate, refreshDreamProgressAfterIdentityUpdate } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { CoreJsonData } from '@/types/database';
import { TwinUpdatingOverlay } from '@/components/TwinUpdatingOverlay';

export default function EditJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const user = useAuth((state) => state.user);
  const [job, setJob] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingTwin, setUpdatingTwin] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile?.core_json) {
        const coreJson = profile.core_json as CoreJsonData;
        setJob(coreJson.primary_role || '');
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
      const profileBefore = await getProfile(user.id);
      const currentCoreJson = (profileBefore?.core_json as CoreJsonData) || {};
      
      const updatedCoreJson: CoreJsonData = {
        ...currentCoreJson,
        primary_role: job.trim() || undefined,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          core_json: updatedCoreJson as any,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      const trimmedJob = job.trim();
      setUpdatingTwin(true);
      try {
        if (trimmedJob) await refreshLifeSituationAfterIdentityUpdate(user.id, 'Job', trimmedJob);
        await refreshDreamProgressAfterIdentityUpdate(user.id, profileBefore);
      } finally {
        setUpdatingTwin(false);
      }

      if (params.next) {
        router.push(params.next as any);
      } else {
        router.back();
      }
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
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gradientBackground}>
      <TwinUpdatingOverlay visible={updatingTwin} />
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>
          What is your current job or role?
        </Text>

        <View style={styles.inputWrapper}>
          <Input
            placeholder="e.g., Software Engineer, Product Manager, Designer"
            value={job}
            onChangeText={setJob}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            containerStyle={styles.inputContainer}
            style={styles.input}
            autoFocus
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.saveButtonWrapper,
            loading && styles.saveButtonDisabled,
            !loading && {
              transform: [{ translateY: pressed ? 4 : 0 }],
              shadowOffset: { width: 0, height: pressed ? 0 : 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: pressed ? 2 : 8,
            }
          ]}
        >
          <View style={[
            styles.saveButton,
            !loading && styles.saveButtonActive,
            loading && styles.saveButtonDisabled
          ]}>
            {!loading ? (
              <LinearGradient
                colors={['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text style={[
              styles.saveButtonText,
              loading && styles.saveButtonTextDisabled
            ]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
            <ChevronRight 
              size={20} 
              color={loading ? Colors.textTertiary : "#FFFFFF"} 
            />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 28,
    marginBottom: 24,
  },
  inputWrapper: {
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 0,
    padding: 0,
  },
  input: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 0,
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
  saveButtonActive: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
