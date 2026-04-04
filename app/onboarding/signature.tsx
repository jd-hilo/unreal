import { useState, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, Text, Pressable, Dimensions } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

const CANVAS_W = Dimensions.get('window').width - 48;
const CANVAS_H = 180;

const webStyle = `
  .m-signature-pad { box-shadow: none; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; background: #fff; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none !important; }
  body, html { width: ${CANVAS_W}px; height: ${CANVAS_H}px; margin: 0; padding: 0; }
`;

export default function SignatureScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [signed, setSigned] = useState(false);
  const signatureRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - signature');
    }, [])
  );

  const handleOK = useCallback((data: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSigned(true);
  }, []);

  const handleEmpty = useCallback(() => {
    setSigned(false);
  }, []);

  const handleClear = useCallback(() => {
    setSigned(false);
  }, []);

  const handleEnd = useCallback(() => {
    signatureRef.current?.readSignature();
  }, []);

  function handleClearPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    signatureRef.current?.clearSignature();
    setSigned(false);
  }

  async function handleNext() {
    if (!user || !signed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const payload = JSON.stringify({
        signed_at: new Date().toISOString(),
        committed: true,
      });
      await saveOnboardingResponse(user.id, 'signature', payload);
      trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
        step: 'signature',
        step_name: 'Signature',
      });
    } catch (error) {
      console.error('Failed to save signature:', error);
    }
    router.push('/onboarding/enable-notifications');
  }

  return (
    <OnboardingScreen
      title={null}
      subtitle="This is your promise to yourself"
      progress={0.85}
      onNext={handleNext}
      canContinue={signed}
      nextLabel="I commit"
    >
      <View style={styles.content}>
        <Text style={styles.prompt}>Sign here to commit to achieving your dreams.</Text>
        <View style={styles.signatureWrapper}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleOK}
            onEmpty={handleEmpty}
            onClear={handleClear}
            onEnd={handleEnd}
            webStyle={webStyle}
            penColor="#1a1a2e"
            backgroundColor="rgba(255,255,255,1)"
            style={styles.canvas}
            autoClear={false}
            descriptionText=""
            clearText=""
            confirmText=""
            webviewProps={{
              nestedScrollEnabled: true,
              scrollEnabled: false,
            }}
          />
        </View>

        <Pressable onPress={handleClearPress} style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: { marginTop: 8, paddingHorizontal: 4 },
  prompt: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
    marginBottom: 20,
  },
  signatureWrapper: {
    width: CANVAS_W,
    height: CANVAS_H,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  canvas: {
    flex: 1,
    width: CANVAS_W,
    height: CANVAS_H,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearBtnPressed: { opacity: 0.6 },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.semibold,
  },
});
