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
          {format(new Date(journal.created_at), 'EEEE')}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.moodCard}>
          <View style={styles.moodIcon}>
            {getMoodEmoji(journal.mood)}
          </View>
          <Text style={styles.moodLabel}>
            {getMoodLabel(journal.mood)}
          </Text>
        </Card>

        {journal.text && (
          <Card style={styles.textCard}>
            <Text style={styles.text}>{journal.text}</Text>
          </Card>
        )}

        <Button
          title="Delete Entry"
          onPress={handleDelete}
          loading={deleting}
          variant="outline"
          size="medium"
          icon={<Trash2 size={18} color="#EF4444" />}
          style={styles.deleteButton}
        />
      </ScrollView>
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
    gap: 24,
  },
  moodCard: {
    alignItems: 'center',
    padding: 24,
  },
  moodIcon: {
    marginBottom: 12,
  },
  moodLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  textCard: {
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  deleteButton: {
    marginTop: 16,
  },
});





