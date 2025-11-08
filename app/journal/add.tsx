import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, InputAccessoryView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/useAuth';
import { insertJournal, getTodayJournal } from '@/lib/storage';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Smile, Meh, Frown, SmilePlus, Angry } from 'lucide-react-native';

const MOODS = [
  { value: 5, label: 'Amazing', icon: SmilePlus, color: '#10B981' },
  { value: 4, label: 'Good', icon: Smile, color: '#34D399' },
  { value: 3, label: 'Okay', icon: Meh, color: '#F59E0B' },
  { value: 2, label: 'Not great', icon: Frown, color: '#F97316' },
  { value: 1, label: 'Rough', icon: Angry, color: '#EF4444' },
  { value: 0, label: 'Very rough', icon: Angry, color: '#DC2626' },
];

const PLACEHOLDER_PROMPTS = [
  "What made today meaningful?",
  "What challenged you today?",
  "What are you grateful for?",
  "What did you learn today?",
  "How did you grow today?",
  "What's on your mind right now?",
];

export default function AddJournalScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const scrollRef = useRef<ScrollView>(null);
  const accessoryId = 'journalInputAccessory';
  const [mood, setMood] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if there's already a journal for today
    async function checkTodayJournal() {
      if (!user) return;
      
      try {
        const todayJournal = await getTodayJournal(user.id);
        if (todayJournal) {
          // Redirect to view the existing journal
          router.replace(`/journal/${todayJournal.id}` as any);
        }
      } catch (error) {
        console.error('Failed to check today journal:', error);
      }
    }
    
    checkTodayJournal();
  }, [user]);


  async function handleSave() {
    if (!user) {
      setError('You must be signed in');
      return;
    }

    if (mood === null) {
      setError('Please select how you\'re feeling');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await insertJournal(user.id, mood, text.trim());
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save journal entry');
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Journal Entry</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior="padding"
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustsScrollIndicatorInsets={false}
        >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How are you feeling?</Text>
          <View style={styles.moodsGrid}>
            {MOODS.map((moodOption) => {
              const MoodIcon = moodOption.icon;
              const isSelected = mood === moodOption.value;
              return (
                <TouchableOpacity
                  key={moodOption.value}
                  style={[
                    styles.moodOption,
                    isSelected && styles.moodOptionSelected,
                    isSelected && { borderColor: moodOption.color }
                  ]}
                  onPress={() => setMood(moodOption.value)}
                >
                  <View style={[
                    styles.moodIconContainer,
                    isSelected && { backgroundColor: moodOption.color }
                  ]}>
                    <MoodIcon 
                      size={24} 
                      color={isSelected ? '#FFFFFF' : moodOption.color} 
                    />
                  </View>
                  <Text style={[
                    styles.moodLabel,
                    isSelected && styles.moodLabelSelected
                  ]}>
                    {moodOption.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reflect on your day</Text>
          <View style={styles.textInputCard}>
            <Input
              placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={14}
              textAlignVertical="top"
              style={styles.textInput}
              inputAccessoryViewID={accessoryId}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
            {text.length > 0 && (
              <Text style={styles.charCount}>{text.length} characters</Text>
            )}
          </View>
        </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={mood === null || saving}
              style={[
                styles.accessorySubmitButton,
                (mood === null || saving) && styles.accessorySubmitButtonDisabled
              ]}
            >
              <Text style={[
                styles.accessorySubmitText,
                (mood === null || saving) && styles.accessorySubmitTextDisabled
              ]}>
                {saving ? 'Saving...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      {Platform.OS !== 'ios' && (
        <View style={styles.footer}>
          <Button
            title="Save Journal Entry"
            onPress={handleSave}
            loading={saving}
            size="large"
            disabled={mood === null}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#0C0C10',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
    gap: 32,
    flexGrow: 1,
  },
  section: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  moodOption: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: 'rgba(10, 8, 15, 0.8)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moodOptionSelected: {
    borderWidth: 2.5,
    backgroundColor: 'rgba(20, 18, 30, 0.8)',
    shadowColor: '#B795FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  moodIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(200, 200, 200, 0.7)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  moodLabelSelected: {
    color: '#FFFFFF',
  },
  textInputCard: {
    backgroundColor: 'rgba(20, 18, 30, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    borderRadius: 20,
    padding: 18,
    minHeight: 240,
  },
  textInput: {
    minHeight: 180,
    fontSize: 16,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.5)',
    textAlign: 'right',
    marginTop: 8,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#0C0C10',
  },
  accessoryBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.3)',
  },
  accessorySubmitButton: {
    backgroundColor: '#B795FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  accessorySubmitButtonDisabled: {
    backgroundColor: 'rgba(59, 37, 109, 0.5)',
  },
  accessorySubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accessorySubmitTextDisabled: {
    color: 'rgba(200, 200, 200, 0.5)',
  },
});


