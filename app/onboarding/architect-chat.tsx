import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Keyboard,
  Alert,
  Animated,
  SafeAreaView,
  Image,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { Colors, Fonts } from '@/constants/Theme';
import type { CoreJsonData } from '@/types/database';
import {
  getProfile,
  completeOnboarding,
  updateProfileFields,
  patchTwinBriefing,
  getTwinBriefingFromCoreJson,
  isBriefingOnboardingReady,
  getTwinBuildProgress,
  describeTwinBriefingChecklistForAi,
} from '@/lib/storage';
import { runBriefingOnboardingTurn } from '@/lib/ai';

/** Room for thread+stakes, four lens lines, near_term+horizon, plus follow-ups. */
const MAX_ASSISTANT_TURNS = 18;
const INPUT_MAX_LEN = 500;
const STREAM_WORD_MS = 50;

/** Onboarding-only chat chrome (distinct from teal life / thread Architect chat). */
const ONBOARDING_USER_GRADIENT = ['#FF9F43', '#FF6B6B'] as const;
const ONBOARDING_ACCENT_SHADOW = '#FF9F43';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; timestamp: number };

function briefingPatchHasContent(p: Record<string, unknown> | undefined): boolean {
  if (!p || typeof p !== 'object') return false;
  if (Array.isArray(p.threads) && p.threads.length > 0) return true;
  if (p.lens && typeof p.lens === 'object' && Object.values(p.lens as object).some((v) => typeof v === 'string' && v.trim()))
    return true;
  if (
    p.direction &&
    typeof p.direction === 'object' &&
    Object.values(p.direction as object).some((v) => typeof v === 'string' && v.trim())
  )
    return true;
  if (
    p.identity &&
    typeof p.identity === 'object' &&
    Object.values(p.identity as object).some((v) => typeof v === 'string' && v.trim())
  )
    return true;
  return false;
}

const SPLASH_HEADLINE = "Let's build your digital twin";
const SPLASH_SUB = 'Chat with our Architect. Should only take a couple minutes.';
const SPLASH_STAT =
  '90% of users report a better sense of life clarity after using Mora';
const SPLASH_TYPE_MS = 38;
const SPLASH_SUB_TYPE_MS = 28;
/** Pause between each major step: headline done → sub, sub done → stat fade */
const SPLASH_GAP_MS = 1000;
/** After the stat pill has fully faded in, wait before entering chat */
const SPLASH_AFTER_PILL_MS = 3000;

/* ─── Splash: typed headline, sub, stat bubble fades in bottom, auto-continue ─── */
function SplashScreen({ onStart }: { onStart: () => void }) {
  const [headlineShown, setHeadlineShown] = useState('');
  const [subShown, setSubShown] = useState('');
  const statOpacity = useRef(new Animated.Value(0)).current;
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    let cancelled = false;
    const timerIds: ReturnType<typeof setTimeout>[] = [];
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timerIds.push(id);
      });

    const run = async () => {
      for (let i = 0; i <= SPLASH_HEADLINE.length; i++) {
        if (cancelled) return;
        setHeadlineShown(SPLASH_HEADLINE.slice(0, i));
        if (i > 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (i < SPLASH_HEADLINE.length) await delay(SPLASH_TYPE_MS);
      }
      if (cancelled) return;
      await delay(SPLASH_GAP_MS);

      for (let i = 0; i <= SPLASH_SUB.length; i++) {
        if (cancelled) return;
        setSubShown(SPLASH_SUB.slice(0, i));
        if (i > 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (i < SPLASH_SUB.length) await delay(SPLASH_SUB_TYPE_MS);
      }
      if (cancelled) return;
      await delay(SPLASH_GAP_MS);

      Animated.timing(statOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        const id = setTimeout(() => {
          if (!cancelled) onStartRef.current();
        }, SPLASH_AFTER_PILL_MS);
        timerIds.push(id);
      });
    };

    void run();

    return () => {
      cancelled = true;
      timerIds.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; onStart via ref
  }, []);

  return (
    <View style={splashStyles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={splashStyles.safe}>
        <View style={splashStyles.centerBlock}>
          <Text style={splashStyles.headline}>{headlineShown}</Text>
          <Text style={splashStyles.sub}>{subShown}</Text>
        </View>

        <Animated.View style={[splashStyles.statBubbleWrap, { opacity: statOpacity }]}>
          <View style={splashStyles.statBubble}>
            <Text style={splashStyles.statText}>{SPLASH_STAT}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 36,
  },
  sub: {
    marginTop: 14,
    fontSize: 15,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    minHeight: 44,
  },
  statBubbleWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 20,
  },
  statBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statText: {
    fontSize: 12,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
});

/* ─── Main chat ─── */
export default function ArchitectOnboardingChat() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { checkOnboardingStatus } = useTwin();

  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [profileSummary, setProfileSummary] = useState('');
  const [briefingReady, setBriefingReady] = useState(false);
  const [twinProgress, setTwinProgress] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputBottomAnim = useRef(new Animated.Value(0)).current;
  const messageAnimations = useRef<Map<string, Animated.Value>>(new Map());

  const assistantTurns = messages.filter((m) => m.role === 'assistant').length;
  const atCap = assistantTurns >= MAX_ASSISTANT_TURNS;
  const canFinish = briefingReady;
  const barPercent = canFinish ? 100 : twinProgress;

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(inputBottomAnim, {
          toValue: e.endCoordinates.height * 0.8,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(inputBottomAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [inputBottomAnim]);

  const loadContext = useCallback(async () => {
    if (!user?.id) return;
    const profile = await getProfile(user.id);
    const name = profile?.first_name || '';
    const lines: string[] = [];
    if (name) lines.push(`First name: ${name}`);

    const briefing = getTwinBriefingFromCoreJson(profile?.core_json as CoreJsonData | undefined);
    if (briefing) {
      setBriefingReady(isBriefingOnboardingReady(briefing));
      setTwinProgress(getTwinBuildProgress(briefing));
      lines.push(describeTwinBriefingChecklistForAi(briefing));
      if (briefing.threads.length) {
        lines.push('Current threads (partial):');
        briefing.threads.slice(0, 5).forEach((t) => {
          lines.push(`- [${t.domain}] ${t.summary.slice(0, 160)}${t.summary.length > 160 ? '...' : ''}`);
        });
      }
      const L = briefing.lens;
      if (L.whats_important) lines.push(`What matters: ${L.whats_important.slice(0, 160)}`);
      if (L.how_they_decide) lines.push(`How they decide: ${L.how_they_decide.slice(0, 120)}`);
      if (L.whats_draining) lines.push(`What drains them: ${L.whats_draining.slice(0, 120)}`);
      if (L.support_system) lines.push(`Support system: ${L.support_system.slice(0, 120)}`);
      if (briefing.direction.near_term) lines.push(`Near term: ${briefing.direction.near_term.slice(0, 120)}`);
      if (briefing.direction.horizon) lines.push(`Horizon: ${briefing.direction.horizon.slice(0, 120)}`);
    } else {
      setBriefingReady(false);
      setTwinProgress(0);
      lines.push(describeTwinBriefingChecklistForAi(null));
      const r = (profile?.core_json as CoreJsonData)?.onboarding_responses || {};
      if (r['02-now']) lines.push(`Life situation (partial): ${String(r['02-now']).slice(0, 200)}`);
      if (r['02-path']) lines.push(`Path (partial): ${String(r['02-path']).slice(0, 200)}`);
    }
    setProfileSummary(lines.join('\n') || '(new user)');
  }, [user?.id]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: barPercent / 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [barPercent, progressAnim]);

  async function streamWords(fullText: string): Promise<void> {
    const words = fullText.split(' ');
    let current = '';
    setIsStreaming(true);
    setStreamingText('');
    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i];
      setStreamingText(current);
      scrollRef.current?.scrollToEnd({ animated: true });
      await new Promise((r) => setTimeout(r, STREAM_WORD_MS));
    }
    setIsStreaming(false);
    setStreamingText('');
  }

  useEffect(() => {
    if (!user?.id || seeded || showSplash) return;
    let cancelled = false;
    (async () => {
      const profile = await getProfile(user.id);
      if (cancelled) return;
      const name = profile?.first_name?.trim();
      const opening = name
        ? `Hey ${name}. I'm going to ask a few pointed questions so Mora can mirror how you actually think, not a generic version of you. What's eating the most mental energy right now? Job, relationship, health, money, something else?`
        : `Hey. I'm the Architect. Give me your first name and the one situation that's taking up the most headspace lately. Doesn't have to be dramatic, just real.`;

      const welcomeId = 'welcome';
      setMessages([{ id: welcomeId, role: 'assistant', content: '', timestamp: Date.now() }]);
      setSeeded(true);

      await streamWords(opening);

      setMessages([{ id: welcomeId, role: 'assistant', content: opening, timestamp: Date.now() }]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, seeded, showSplash]);

  async function applyBriefingPatch(patch: Record<string, unknown> | undefined, firstName?: string) {
    if (!user?.id) return;
    if (firstName) await updateProfileFields(user.id, { first_name: firstName });
    if (briefingPatchHasContent(patch)) await patchTwinBriefing(user.id, patch as any);
  }

  async function finishAndExit() {
    if (!user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await completeOnboarding(user.id, {});
      const p = await getProfile(user.id);
      await updateProfileFields(user.id, {
        core_json: {
          ...(p?.core_json as object),
          architect_onboarding_completed_at: new Date().toISOString(),
        },
      } as any);
      await checkOnboardingStatus(user.id);
      const isPremium = useTwin.getState().isPremium;
      const seenKey = `premium_onboarding_seen_${user.id}`;
      const hasSeenPremiumOnboarding = await AsyncStorage.getItem(seenKey);
      if (!isPremium && !hasSeenPremiumOnboarding) {
        await AsyncStorage.setItem(seenKey, 'true');
        router.replace({ pathname: '/premium-onboarding', params: { from: 'onboarding' } } as any);
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (e) {
      console.error('finish onboarding', e);
      router.replace('/(tabs)/home');
    }
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Leave setup?', 'You can sign in again anytime to continue.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !user?.id || sending || atCap || isStreaming) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const msgId = `u-${Date.now()}`;
    const userMsg: Msg = { id: msgId, role: 'user', content: text, timestamp: Date.now() };
    const animValue = new Animated.Value(0);
    messageAnimations.current.set(msgId, animValue);
    Animated.timing(animValue, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setInput('');
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
    setSending(true);
    try {
      const historySnapshot = [...messages, userMsg];
      const history = historySnapshot.map((m) => ({ role: m.role, content: m.content }));
      const priorAssistant = messages.filter((m) => m.role === 'assistant').length;
      const { reply, patch, first_name } = await runBriefingOnboardingTurn({
        messages: history,
        profileSummary,
        assistantTurnsSoFar: priorAssistant,
      });
      await applyBriefingPatch(patch as Record<string, unknown> | undefined, first_name);
      await loadContext();

      const asstId = `a-${Date.now()}`;
      setMessages((prev) => [...prev, { id: asstId, role: 'assistant', content: '', timestamp: Date.now() }]);
      setSending(false);

      await streamWords(reply);

      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: reply } : m)));
    } catch (e) {
      console.error(e);
      const errId = `err-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errId,
          role: 'assistant',
          content: "I'm having trouble reaching the server. Check your connection and try again.",
          timestamp: Date.now(),
        },
      ]);
      setSending(false);
    }
  }

  if (!user) return null;

  const dismissSplash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onStart={dismissSplash} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="dark" />
      <RNSafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.iconButton} hitSlop={12}>
            <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Image
              source={require('@/assets/images/cube.png')}
              style={styles.cubeIcon}
              resizeMode="contain"
            />
            <View style={styles.titleTextCol}>
              <Text style={styles.title}>Architect</Text>
              <Text style={styles.titleSub}>Setup · building your twin</Text>
            </View>
          </View>
        </View>
        <View style={styles.twinProgressOuter}>
          <View style={styles.twinProgressTrack}>
            <Animated.View
              style={[
                styles.twinProgressFillClip,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={[...ONBOARDING_USER_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.twinProgressCaption}>
            {barPercent >= 100 ? 'Twin ready' : `Building twin · ${barPercent}%`}
          </Text>
        </View>
      </RNSafeAreaView>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={styles.onboardingHint}>
          This chat is only for onboarding. Later, use Decide or Home to talk to the Architect.
        </Text>

        {messages.map((m, idx) => {
          const isLastAssistant = m.role === 'assistant' && idx === messages.length - 1;
          const displayText = isLastAssistant && isStreaming ? streamingText : m.content;
          if (!displayText && !isLastAssistant) return null;
          if (!displayText && isLastAssistant && isStreaming) return null;

          const animValue = messageAnimations.current.get(m.id) ?? new Animated.Value(1);
          return (
            <Animated.View
              key={m.id}
              style={[
                styles.bubbleWrap,
                m.role === 'user' ? styles.bubbleRight : styles.bubbleLeft,
                {
                  opacity: animValue,
                  transform: [
                    {
                      translateY: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {m.role === 'user' ? (
                <LinearGradient
                  colors={[...ONBOARDING_USER_GRADIENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.userBubble]}
                >
                  <Text style={styles.bubbleText}>{displayText}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.architectBubble]}>
                  <Text style={styles.bubbleText}>{displayText}</Text>
                </View>
              )}
            </Animated.View>
          );
        })}

        {(sending || (isStreaming && !streamingText)) && (
          <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
            <View style={[styles.bubble, styles.architectBubble, styles.typingBubble]}>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}

        {canFinish && !isStreaming && (
          <View style={styles.onboardingActions}>
            <TouchableOpacity onPress={finishAndExit} activeOpacity={0.88} style={styles.finishButtonShadow}>
              <LinearGradient
                colors={[...ONBOARDING_USER_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.finishButton}
              >
                <Text style={styles.finishButtonText}>Enter Mora</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Animated.View
        style={[
          styles.inputContainerFixed,
          {
            bottom: inputBottomAnim.interpolate({
              inputRange: [0, 1000],
              outputRange: [60, 1000],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Share honestly with the Architect…"
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            editable={!sending && !atCap && !isStreaming}
            onSubmitEditing={handleSend}
            multiline
            maxLength={INPUT_MAX_LEN}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sending || atCap || isStreaming}
            style={({ pressed }) => [
              styles.submitButtonWrapper,
              (!input.trim() || sending || atCap || isStreaming) && styles.submitButtonDisabled,
              {
                shadowColor: ONBOARDING_ACCENT_SHADOW,
                transform: [{ translateY: pressed ? 2 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                shadowOpacity: pressed ? 0.3 : 0.45,
                shadowRadius: pressed ? 8 : 12,
                elevation: pressed ? 4 : 8,
              },
            ]}
          >
            {sending ? (
              <LinearGradient
                colors={[...ONBOARDING_USER_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <ActivityIndicator size="small" color="#FFFFFF" />
              </LinearGradient>
            ) : input.trim() ? (
              <LinearGradient
                colors={[...ONBOARDING_USER_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            ) : (
              <View style={[styles.submitButtonGradient, { backgroundColor: Colors.textTertiary }]}>
                <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            )}
          </Pressable>
        </View>
        <Text style={styles.charCount}>{input.length}/{INPUT_MAX_LEN}</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cubeIcon: {
    width: 28,
    height: 28,
  },
  titleTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  titleSub: {
    fontSize: 12,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  twinProgressOuter: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  twinProgressTrack: {
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  twinProgressFillClip: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  twinProgressCaption: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingBottom: 200,
    paddingTop: 10,
  },
  onboardingHint: {
    fontSize: 13,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  bubbleWrap: {
    marginTop: 12,
    maxWidth: '85%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  architectBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {},
  bubbleText: {
    color: Colors.textPrimary,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  typingBubble: {
    paddingVertical: 16,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
    opacity: 0.6,
  },
  onboardingActions: {
    marginTop: 24,
    paddingHorizontal: 4,
  },
  finishButtonShadow: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: ONBOARDING_ACCENT_SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  finishButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Fonts.secondary.semibold,
  },
  inputContainerFixed: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: Colors.background,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
    marginRight: 12,
    maxHeight: 120,
  },
  submitButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    fontFamily: Fonts.secondary.regular,
  },
});
