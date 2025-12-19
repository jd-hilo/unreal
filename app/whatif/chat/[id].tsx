import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Home } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { twinChatReply } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

type Bubble = {
  id: string;
  sender: 'user' | 'twin';
  text: string;
  ts: number;
};

export default function WhatIfChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuth((s) => s.user);
  const [whatIf, setWhatIf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [corePack, setCorePack] = useState<string>('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, [id, user?.id]);

  async function loadData() {
    if (!id || typeof id !== 'string' || !user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('what_if')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setWhatIf(data);

      const pack = await buildCorePack(user.id);
      setCorePack(pack);
    } catch (e) {
      console.error('Failed to init chat:', e);
    } finally {
      setLoading(false);
    }
  }

  const whatIfSummary = useMemo(() => {
    return (whatIf?.summary as string) || '';
  }, [whatIf]);

  function appendMessage(sender: 'user' | 'twin', text: string) {
    const bubble: Bubble = {
      id: Math.random().toString(36).slice(2),
      sender,
      text: text.trim(),
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, bubble]);
    // Auto-scroll down
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 10);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');
    appendMessage('user', trimmed);
    try {
      const history = messages.concat([{ id: 'temp', sender: 'user', text: trimmed, ts: Date.now() }]).slice(-12); // keep last 12
      const chatMessages = history.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const reply = await twinChatReply({
        corePack,
        whatIfSummary,
        metrics: whatIf?.metrics,
        biometrics: whatIf?.biometrics,
        messages: chatMessages,
      });
      appendMessage('twin', reply);
    } catch (e) {
      console.error('Send chat error:', e);
      appendMessage('twin', "Sorry — I couldn't respond just now. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Chat with Your Twin</Text>
        </SafeAreaView>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.textSecondary} />
          <Text style={styles.loadingText}>Loading twin context...</Text>
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
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Chat with Your Twin</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
          <Home size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent}>
        {!messages.length && (
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Today, if you took that path...</Text>
            <Text style={styles.introText}>
              Ask your alternate-timeline self about life today, challenges, and concrete next steps.
            </Text>
            {whatIfSummary ? (
              <Text style={styles.introHint}>
                Based on this scenario: {whatIfSummary}
              </Text>
            ) : null}
          </View>
        )}

        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubbleWrap,
              m.sender === 'user' ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            <View
              style={[
                styles.bubble,
                m.sender === 'user' ? styles.userBubble : styles.twinBubble,
              ]}
            >
              <Text style={styles.bubbleText}>{m.text}</Text>
            </View>
            <Text style={styles.timestamp}>
              {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message your twin..."
          placeholderTextColor={Colors.textTertiary}
          value={input}
          onChangeText={setInput}
          editable={!sending}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSend} disabled={sending} style={styles.sendBtn}>
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Send size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 16,
    gap: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
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
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  introCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    gap: 8,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  introTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    fontFamily: Fonts.secondary.bold,
  },
  introText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.secondary.bold,
  },
  introHint: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: Fonts.secondary.bold,
  },
  bubbleWrap: {
    marginTop: 8,
    maxWidth: '80%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  twinBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  userBubble: {
    backgroundColor: '#84FAB0', // Turquoise background for user
  },
  bubbleText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  timestamp: {
    color: Colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
    fontFamily: Fonts.secondary.bold,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: Colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    fontFamily: Fonts.secondary.bold,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#84FAB0', // Match user bubble
    alignItems: 'center',
    justifyContent: 'center',
  },
});


