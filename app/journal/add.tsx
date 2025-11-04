import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
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

export default function AddJournalScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [mood, setMood] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What's on your mind?</Text>
          <Input
            placeholder="Write about your day, thoughts, feelings..."
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
            style={styles.textInput}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Save Journal Entry"
          onPress={handleSave}
          loading={saving}
          size="large"
          disabled={mood === null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#666666',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
    gap: 32,
  },
  section: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodOption: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  moodOptionSelected: {
    borderWidth: 2,
    backgroundColor: '#F9FAFB',
  },
  moodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: '#000000',
  },
  textInput: {
    minHeight: 200,
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});


