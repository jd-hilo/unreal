import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { twinChatReply } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Chat with Your Twin</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#4169E1" />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Chat with Your Twin</Text>
      </View>

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
          placeholderTextColor="rgba(200,200,200,0.5)"
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
    backgroundColor: '#0C0C10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 10,
  },
  loadingText: {
    color: '#4169E1',
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
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 16,
    gap: 8,
  },
  introTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  introText: {
    color: 'rgba(200, 200, 200, 0.85)',
    fontSize: 14,
  },
  introHint: {
    color: 'rgba(200, 200, 200, 0.65)',
    fontSize: 12,
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
    backgroundColor: 'rgba(35, 30, 55, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(120, 90, 200, 0.25)',
  },
  userBubble: {
    backgroundColor: '#5B3DF5',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    color: 'rgba(200, 200, 200, 0.45)',
    fontSize: 10,
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.3)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 30, 0.9)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#5B3DF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


