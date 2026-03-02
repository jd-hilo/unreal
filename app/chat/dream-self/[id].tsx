import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  TextInput,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowUp, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/store/useAuth';
import { dreamSelfChat } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { getDreamSelfChat, saveDreamSelfChatMessage, getProfile } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

type Message = {
  id: string;
  role: 'user' | 'dream_self';
  content: string;
  timestamp: number;
};

export default function DreamSelfChatScreen() {
  const router = useRouter();
  const { id, initialMessage } = useLocalSearchParams();
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(true);
  const initialMessageSent = useRef(false);
  const [corePack, setCorePack] = useState<string>('');
  const [dreamVision, setDreamVision] = useState<any>({});
  const [dreamProgress, setDreamProgress] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const messageAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const inputBottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [id, user?.id]);

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

  async function loadData() {
    if (!id || typeof id !== 'string' || !user?.id) return;
    setLoading(true);
    try {
      const [chatData, pack, profile] = await Promise.all([
        getDreamSelfChat(id, user.id),
        buildCorePack(user.id),
        getProfile(user.id),
      ]);
      setCorePack(pack);
      setDreamVision(profile?.dream_vision || {});
      setDreamProgress(profile?.dream_self_progress || {});
      setFirstName(profile?.first_name || '');
      if (chatData && Array.isArray(chatData.messages)) {
        setMessages(chatData.messages);
      }
    } catch (e) {
      console.error('Failed to load dream self chat:', e);
    } finally {
      setLoading(false);
    }
  }

  // Auto-send initial message from hub input
  useEffect(() => {
    if (!loading && initialMessage && typeof initialMessage === 'string' && !initialMessageSent.current && corePack) {
      initialMessageSent.current = true;
      setInput('');
      (async () => {
        setSending(true);
        const userMsg = appendMessage('user', initialMessage);
        try { await saveDreamSelfChatMessage(id as string, user!.id, 'user', initialMessage); } catch (e) {}
        try {
          const history = [userMsg];
          const chatMessages = history.map((m) => ({ role: m.role, content: m.content }));
          setIsStreaming(true);
          setStreamingMessage('');
          const reply = await dreamSelfChat({ corePack, dreamVision, dreamProgress, messages: chatMessages, firstName });
          const words = reply.split(' ');
          let currentText = '';
          for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            setStreamingMessage(currentText);
            await new Promise((r) => setTimeout(r, 50));
          }
          setIsStreaming(false);
          setStreamingMessage('');
          appendMessage('dream_self', reply);
          try { await saveDreamSelfChatMessage(id as string, user!.id, 'dream_self', reply); } catch (e) {}
        } catch (e) {
          setIsStreaming(false);
          setStreamingMessage('');
          appendMessage('dream_self', "I'm having trouble responding right now. Try again in a moment.");
        } finally {
          setSending(false);
        }
      })();
    }
  }, [loading, initialMessage, corePack]);

  function appendMessage(role: 'user' | 'dream_self', content: string) {
    const messageId = Math.random().toString(36).slice(2);
    const message: Message = { id: messageId, role, content: content.trim(), timestamp: Date.now() };
    const animValue = new Animated.Value(0);
    messageAnimations.current.set(messageId, animValue);
    Animated.timing(animValue, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setMessages((prev) => [...prev, message]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
    return message;
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending || !user?.id || !id || typeof id !== 'string') return;

    setSending(true);
    setInput('');

    const userMessage = appendMessage('user', trimmed);

    try {
      await saveDreamSelfChatMessage(id, user.id, 'user', trimmed);
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    try {
      const history = [...messages, userMessage].slice(-10);
      const chatMessages = history.map((m) => ({ role: m.role, content: m.content }));

      setIsStreaming(true);
      setStreamingMessage('');

      const reply = await dreamSelfChat({
        corePack,
        dreamVision,
        dreamProgress,
        messages: chatMessages,
        firstName,
      });

      const words = reply.split(' ');
      let currentText = '';
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingMessage(currentText);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setIsStreaming(false);
      setStreamingMessage('');
      appendMessage('dream_self', reply);

      try {
        await saveDreamSelfChatMessage(id, user.id, 'dream_self', reply);
      } catch (e) {
        console.error('Failed to save dream self message:', e);
      }
    } catch (e) {
      console.error('Send dream self chat error:', e);
      setIsStreaming(false);
      setStreamingMessage('');
      appendMessage('dream_self', "I'm having trouble responding right now. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  const displayName = firstName || 'You';

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <RNSafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <MessageSquare size={22} color={Colors.textPrimary} strokeWidth={2} />
              <Text style={styles.title}>{displayName} (your future version)</Text>
            </View>
          </View>
        </RNSafeAreaView>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.textSecondary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <RNSafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <MessageSquare size={20} color={Colors.textPrimary} strokeWidth={2} />
            <Text style={styles.title}>Your Future Self</Text>
          </View>
        </View>
      </RNSafeAreaView>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {!messages.length && !isStreaming && (
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>
              Hey {displayName}. It's you, just a few years ahead.{'\n'}Ask me anything.
            </Text>
          </View>
        )}

        {messages.map((m) => {
          const animValue = messageAnimations.current.get(m.id) || new Animated.Value(1);
          return (
            <Animated.View
              key={m.id}
              style={[
                styles.bubbleWrap,
                m.role === 'user' ? styles.bubbleRight : styles.bubbleLeft,
                {
                  opacity: animValue,
                  transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
              ]}
            >
              {m.role === 'user' ? (
                <LinearGradient
                  colors={['#25729f', '#62edb9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.userBubble]}
                >
                  <Text style={[styles.bubbleText, styles.userBubbleText]}>{m.content}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.architectBubble]}>
                  <Text style={styles.bubbleText}>{m.content}</Text>
                </View>
              )}
              <Text style={[styles.timestamp, m.role === 'user' && styles.timestampRight]}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Animated.View>
          );
        })}

        {isStreaming && streamingMessage && (
          <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
            <View style={[styles.bubble, styles.architectBubble]}>
              <Text style={styles.bubbleText}>{streamingMessage}</Text>
            </View>
          </View>
        )}

        {sending && !streamingMessage && (
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
            placeholder="Message your future self..."
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            editable={!sending}
            onSubmitEditing={handleSend}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.submitButtonWrapper,
              (!input.trim() || sending) && styles.submitButtonDisabled,
              {
                shadowColor: '#25729f',
                transform: [{ translateY: pressed ? 2 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                shadowOpacity: pressed ? 0.3 : 0.5,
                shadowRadius: pressed ? 8 : 12,
                elevation: pressed ? 4 : 8,
              },
            ]}
          >
            {sending ? (
              <LinearGradient
                colors={['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <ActivityIndicator size="small" color="#FFFFFF" />
              </LinearGradient>
            ) : input.trim() ? (
              <LinearGradient
                colors={['#25729f', '#62edb9']}
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
        <Text style={styles.charCount}>{input.length}/500</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    marginRight: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  chat: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingBottom: 200,
    paddingTop: 8,
  },
  introCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    marginBottom: 24,
  },
  introTitle: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center',
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
  userBubbleText: {
    color: '#FFFFFF',
  },
  timestamp: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
    fontFamily: Fonts.secondary.bold,
  },
  timestampRight: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 4,
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
    backgroundColor: Colors.background,
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
