import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useAuth } from '@/store/useAuth';
import { extractBriefingPatchFromChat } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { applyLifeChatTwinPatches } from '@/lib/lifeChatTwinUpdate';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

export default function TwinUpdateScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [updateText, setUpdateText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goBack = useCallback(() => {
    const t = updateText.trim();
    if (t && !submitting) {
      Alert.alert('Discard update?', 'Your draft will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [updateText, submitting, router]);

  const onSubmit = useCallback(async () => {
    const t = updateText.trim();
    if (!user?.id || !t || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const corePack = await buildCorePack(user.id);
      const patch = await extractBriefingPatchFromChat({
        corePack,
        messages: [{ role: 'user', content: t }],
      });
      const applied = await applyLifeChatTwinPatches(user.id, patch);
      if (applied.length > 0) {
        Alert.alert(
          'Twin updated',
          'We refreshed your twin from what you shared.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Thanks for sharing',
          'We did not need to change stored twin details yet — that is OK.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err) {
      console.error('Twin update submit:', err);
      Alert.alert(
        'Could not update your twin',
        'Please try again in a moment.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, updateText, submitting, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={submitting}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.architectIcon}>
              <Zap size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headline}>Tell me what has changed in your life</Text>
            <Text style={styles.lead}>
              A few sentences is enough. We will only update your twin when your message clearly calls for it.
            </Text>
          </View>

          <FloatingLabelInput
            label="Your update"
            value={updateText}
            onChangeText={setUpdateText}
            multiline
            placeholder="e.g. I moved to Austin, started a new job, and I am prioritizing health more."
            containerStyle={styles.input}
            editable={!submitting}
          />

          <TouchableOpacity
            style={[
              styles.submitWrap,
              (!updateText.trim() || submitting) && styles.submitDisabled,
            ]}
            onPress={onSubmit}
            disabled={!updateText.trim() || submitting}
          >
            <LinearGradient
              colors={['#25729f', '#62edb9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Update my twin</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  architectIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#25729f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  lead: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Fonts.secondary.regular,
    maxWidth: 340,
  },
  input: {
    marginBottom: 24,
  },
  submitWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
