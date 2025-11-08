import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getJournal, deleteJournal } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Smile, Meh, Frown, SmilePlus, Angry, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';

interface Journal {
  id: string;
  mood: number | null;
  text: string | null;
  created_at: string;
}

export default function ViewJournalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadJournal();
  }, [id]);

  async function loadJournal() {
    if (!id || typeof id !== 'string') return;
    
    try {
      const data = await getJournal(id);
      setJournal(data as Journal);
    } catch (error) {
      console.error('Failed to load journal:', error);
    } finally {
      setLoading(false);
    }
  }

  function getMoodEmoji(mood: number | null) {
    if (mood === null) return <Meh size={32} color="#999999" />;
    if (mood === 5) return <SmilePlus size={32} color="#10B981" />;
    if (mood === 4) return <Smile size={32} color="#34D399" />;
    if (mood === 3) return <Meh size={32} color="#F59E0B" />;
    if (mood === 2) return <Frown size={32} color="#F97316" />;
    if (mood === 1) return <Angry size={32} color="#EF4444" />;
    return <Angry size={32} color="#DC2626" />;
  }

  function getMoodLabel(mood: number | null) {
    if (mood === null) return 'No mood';
    if (mood === 5) return 'Amazing';
    if (mood === 4) return 'Good';
    if (mood === 3) return 'Okay';
    if (mood === 2) return 'Not great';
    if (mood === 1) return 'Rough';
    return 'Very rough';
  }

  function handleDelete() {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            
            setDeleting(true);
            try {
              await deleteJournal(id);
              router.back();
            } catch (error) {
              console.error('Failed to delete journal:', error);
              Alert.alert('Error', 'Failed to delete journal entry');
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (loading || !journal) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {format(new Date(journal.created_at), 'MMMM d, yyyy')}
        </Text>
        <Text style={styles.subtitle}>
          {format(new Date(journal.created_at), 'EEEE • ' + format(new Date(journal.created_at), 'h:mm a'))}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.moodCard}>
          <View style={styles.moodIconContainer}>
            {getMoodEmoji(journal.mood)}
          </View>
          <Text style={styles.moodLabel}>
            {getMoodLabel(journal.mood)}
          </Text>
        </View>

        {journal.text && (
          <View style={styles.textCard}>
            <Text style={styles.text}>{journal.text}</Text>
            <View style={styles.textMeta}>
              <Text style={styles.wordCount}>
                {journal.text.split(/\s+/).filter(Boolean).length} words
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color="#EF4444" />
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Deleting...' : 'Delete Entry'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.7)',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 28,
  },
  moodCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: 'rgba(20, 18, 30, 0.5)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.3)',
  },
  moodIconContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(10, 8, 15, 0.6)',
    borderRadius: 32,
  },
  moodLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  textCard: {
    padding: 26,
    backgroundColor: 'rgba(20, 18, 30, 0.4)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 37, 109, 0.25)',
  },
  text: {
    fontSize: 17,
    color: 'rgba(220, 220, 220, 0.9)',
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  textMeta: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
  },
  wordCount: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.5)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});











