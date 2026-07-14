import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, SafeAreaView, Image, Animated, TextInput, Pressable, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowUp } from 'lucide-react-native';
import { useAuth } from '@/store/useAuth';
import { architectDecisionChat } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { getDecision, getDecisionChat, saveDecisionChatMessage, appendArchitectInsight } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

type Message = {
  id: string;
  role: 'user' | 'architect';
  content: string;
  timestamp: number;
};

export default function DecisionChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((s) => s.user);
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [corePack, setCorePack] = useState<string>('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const messageAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputBottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [id, user?.id]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        Animated.timing(inputBottomAnim, {
          toValue: height * 0.8,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
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
      // Load decision and chat history in parallel
      const [decisionData, chatData, pack] = await Promise.all([
        getDecision(id),
        getDecisionChat(id, user.id),
        buildCorePack(user.id),
      ]);
      
      setDecision(decisionData);
      setCorePack(pack);
      
      // Load existing messages if any
      if (chatData && Array.isArray(chatData.messages)) {
        setMessages(chatData.messages);
      }
    } catch (e) {
      console.error('Failed to init decision chat:', e);
    } finally {
      setLoading(false);
    }
  }

  function appendMessage(role: 'user' | 'architect', content: string) {
    const messageId = Math.random().toString(36).slice(2);
    const message: Message = {
      id: messageId,
      role,
      content: content.trim(),
      timestamp: Date.now(),
    };
    
    // Create animation for this message
    const animValue = new Animated.Value(0);
    messageAnimations.current.set(messageId, animValue);
    
    // Animate message entry
    Animated.timing(animValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setMessages((prev) => [...prev, message]);
    // Auto-scroll down
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 350);
    return message;
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending || !decision || !user) return;
    
    setSending(true);
    setInput('');
    
    // Add user message
    const userMessage = appendMessage('user', trimmed);
    
    // Save user message to database
    try {
      await saveDecisionChatMessage(decision.id, user.id, 'user', trimmed);
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    try {
      // Prepare chat history (last 10 messages)
      const history = [...messages, userMessage].slice(-10);
      const chatMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Get options array
      const options = Array.isArray(decision.options) 
        ? decision.options 
        : JSON.parse(decision.options || '[]');

      // Call AI for response
      setIsStreaming(true);
      setStreamingMessage('');
      
      const reply = await architectDecisionChat({
        corePack,
        decision: {
          question: decision.question,
          options,
          context_summary: decision.context_summary,
        },
        prediction: decision.prediction,
        messages: chatMessages,
      });

      // Simulate streaming effect (word by word)
      const words = reply.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingMessage(currentText);
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms per word
      }
      
      setIsStreaming(false);
      setStreamingMessage('');
      
      // Add architect message
      appendMessage('architect', reply);
      
      // Save architect message to database
      try {
        await saveDecisionChatMessage(decision.id, user.id, 'architect', reply);
      } catch (e) {
        console.error('Failed to save architect message:', e);
      }
      void appendArchitectInsight(user.id, reply, 'decision');
    } catch (e) {
      console.error('Send chat error:', e);
      setIsStreaming(false);
      setStreamingMessage('');
      appendMessage('architect', "I apologize, but I'm having trouble responding right now. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Image 
                source={require('@/assets/images/cube.png')}
                style={styles.cubeIcon}
                resizeMode="contain"
              />
              <Text style={styles.title}>Architect</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.textSecondary} />
          <Text style={styles.loadingText}>Loading decision context...</Text>
        </View>
      </View>
    );
  }

  if (!decision) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Image 
                source={require('@/assets/images/cube.png')}
                style={styles.cubeIcon}
                resizeMode="contain"
              />
              <Text style={styles.title}>Architect</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Decision not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Image 
              source={require('@/assets/images/cube.png')}
              style={styles.cubeIcon}
              resizeMode="contain"
            />
            <Text style={styles.title}>Architect</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        ref={scrollRef} 
        style={styles.chat} 
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {!messages.length && !isStreaming && (
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Let's talk through this together...</Text>
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
                  transform: [
                    {
                      translateY: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {m.role === 'user' ? (
                <LinearGradient
                  colors={['#FF9F43', '#FF6B6B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.userBubble]}
                >
                  <Text style={styles.bubbleText}>{m.content}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[styles.bubble, styles.architectBubble]}
                >
                  <Text style={styles.bubbleText}>{m.content}</Text>
                </View>
              )}
              <Text style={[styles.timestamp, m.role === 'user' && styles.timestampRight]}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Animated.View>
          );
        })}

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
            <View style={[styles.bubble, styles.architectBubble]}>
              <Text style={styles.bubbleText}>{streamingMessage}</Text>
            </View>
          </View>
        )}

        {/* Typing indicator */}
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
          }
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Message the Architect"
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
                shadowColor: '#FF9F43',
                transform: [{ translateY: pressed ? 2 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                shadowOpacity: pressed ? 0.3 : 0.5,
                shadowRadius: pressed ? 8 : 12,
                elevation: pressed ? 4 : 8,
              }
            ]}
          >
            {sending ? (
              <LinearGradient
                colors={['#FF9F43', '#FF6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <ActivityIndicator size="small" color="#FFFFFF" />
              </LinearGradient>
            ) : input.trim() ? (
              <LinearGradient
                colors={['#FF9F43', '#FF6B6B']}
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
  cubeIcon: {
    width: 24,
    height: 24,
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
    gap: 10,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    fontSize: 14,
  },
  errorText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    fontSize: 16,
  },
  chat: {
    flex: 1,
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
    color: Colors.textSecondary,
    fontSize: 24,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.3,
    lineHeight: 28,
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
  userBubble: {
    // Gradient applied via LinearGradient component
  },
  bubbleText: {
    color: Colors.textPrimary,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
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
