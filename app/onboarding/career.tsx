import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { uploadResume, isLinkedInAvailable } from '@/lib/integrations/career';
import { Linkedin, FileText, Type, Mic } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';

type CareerMethod = 'linkedin' | 'resume' | 'text';

export default function CareerScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [value, setValue] = useState('');
  const [method, setMethod] = useState<CareerMethod>('text');
  const [resumeLoading, setResumeLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - career');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const raw = profile?.core_json?.onboarding_responses?.['career'];
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed?.content) {
            setValue(parsed.content);
            setMethod((parsed.method as CareerMethod) || 'text');
          }
        } catch {
          if (typeof raw === 'string') setValue(raw);
        }
      }
    } catch (error) {
      console.error('Failed to load career:', error);
    }
  }

  async function handleLinkedIn() {
    if (isLinkedInAvailable()) {
      Alert.alert(
        'LinkedIn',
        'To connect LinkedIn, you\'ll need a LinkedIn Developer App and token exchange backend. For now, describe your career below.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Coming soon',
        'LinkedIn connection will be available in a future update. Describe your career below for now.',
        [{ text: 'OK' }]
      );
    }
    setMethod('text');
  }

  async function handleUploadResume() {
    setResumeLoading(true);
    try {
      const result = await uploadResume();
      if (result?.content) {
        setValue(result.content);
        setMethod('resume');
      } else if (result === null) {
        // User canceled picker
      } else {
        Alert.alert('Couldn\'t read file', 'Try a .txt or .pdf file, or describe your career below.');
      }
    } catch (e) {
      Alert.alert('Upload failed', 'Please describe your career below instead.');
      setMethod('text');
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleNext() {
    if (!user || !value.trim()) return;
    try {
      const payload = JSON.stringify({ method, content: value.trim() });
      await saveOnboardingResponse(user.id, 'career', payload);
      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'career',
        step_name: 'Career',
      });
    } catch (error) {
      console.error('Failed to save career:', error);
    }
    router.push('/onboarding/health');
  }

  return (
    <OnboardingScreen
      title="Tell us about your career"
      subtitle="Connect, upload, or describe"
      progress={0.50}
      onNext={handleNext}
      canContinue={value.trim().length > 10}
    >
      <View style={styles.options}>
        <TouchableOpacity
          style={[styles.option, method === 'linkedin' && styles.optionSelected]}
          onPress={handleLinkedIn}
        >
          <Linkedin size={20} color={method === 'linkedin' ? '#25729f' : Colors.textSecondary} />
          <Text
            style={[styles.optionLabel, method === 'linkedin' && styles.optionLabelSelected]}
            numberOfLines={1}
          >
            LinkedIn
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, method === 'resume' && styles.optionSelected]}
          onPress={handleUploadResume}
          disabled={resumeLoading}
        >
          {resumeLoading ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <FileText size={20} color={method === 'resume' ? '#25729f' : Colors.textSecondary} />
          )}
          <Text
            style={[styles.optionLabel, method === 'resume' && styles.optionLabelSelected]}
            numberOfLines={1}
          >
            Upload resume
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, method === 'text' && styles.optionSelected]}
          onPress={() => setMethod('text')}
        >
          <Type size={20} color={method === 'text' ? '#25729f' : Colors.textSecondary} />
          <Text
            style={[styles.optionLabel, method === 'text' && styles.optionLabelSelected]}
            numberOfLines={1}
          >
            Describe
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.composerSection}>
        <View style={styles.composerCard}>
          <View style={styles.tooltip}>
            <Mic size={12} color="#25729f" strokeWidth={2.2} />
            <Text style={styles.tooltipText}>Use the microphone to transcribe it</Text>
          </View>

          <Text style={styles.composerLabel}>Career</Text>
          <TextInput
            style={styles.composerInput}
            value={value}
            onChangeText={setValue}
            placeholder="e.g. Software engineer at a startup, exploring product management"
            placeholderTextColor={Colors.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={1200}
          />
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  optionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.gradients.turquoise[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.turquoise[1],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'center',
    flexShrink: 1,
  },
  optionLabelSelected: { color: Colors.textPrimary },
  composerSection: {
    marginTop: 4,
    paddingBottom: 8,
  },
  composerCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    minHeight: 170,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  tooltip: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 114, 159, 0.08)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '72%',
  },
  tooltipText: {
    fontSize: 11,
    color: '#25729f',
    fontFamily: Fonts.secondary.bold,
    flexShrink: 1,
  },
  composerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
  },
  composerInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
    paddingTop: 36,
    lineHeight: 26,
    minHeight: 120,
    maxHeight: 220,
  },
});
