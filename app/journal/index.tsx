import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getJournals, getTodayJournal } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Plus, BookOpen, Smile, Meh, Frown } from 'lucide-react-native';
import { format } from 'date-fns';

interface Journal {
  id: string;
  mood: number | null;
  text: string | null;
  created_at: string;
}

export default function JournalScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [todayJournal, setTodayJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadJournals();
    }, [user])
  );

  async function loadJournals() {
    if (!user) return;
    
    try {
      const [data, today] = await Promise.all([
        getJournals(user.id),
        getTodayJournal(user.id)
      ]);
      setJournals(data as Journal[]);
      setTodayJournal(today as Journal | null);
    } catch (error) {
      console.error('Failed to load journals:', error);
    } finally {
      setLoading(false);
    }
  }

  function getMoodEmoji(mood: number | null) {
    if (mood === null) return <Meh size={24} color="#999999" />;
    if (mood >= 4) return <Smile size={24} color="#10B981" />;
    if (mood >= 2) return <Meh size={24} color="#F59E0B" />;
    return <Frown size={24} color="#EF4444" />;
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

  function handleAddJournal() {
    if (todayJournal) {
      // If there's already a journal for today, view it instead
      router.push(`/journal/${todayJournal.id}` as any);
    } else {
      router.push('/journal/add' as any);
    }
  }

  function handleViewJournal(id: string) {
    router.push(`/journal/${id}` as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>
          Track your daily mood and thoughts
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.todayCard}>
          {todayJournal ? (
            <>
              <View style={styles.todayComplete}>
                {getMoodEmoji(todayJournal.mood)}
              </View>
              <Text style={styles.todayTitle}>Today's journal complete!</Text>
              <Text style={styles.todayText}>
                {getMoodLabel(todayJournal.mood)}
              </Text>
              <Button
                title="View Today's Entry"
                onPress={handleAddJournal}
                size="medium"
                variant="outline"
                style={styles.todayButton}
              />
            </>
          ) : (
            <>
              <BookOpen size={32} color="#666666" style={styles.todayIcon} />
              <Text style={styles.todayTitle}>How are you feeling today?</Text>
              <Text style={styles.todayText}>
                Take a moment to journal about your day
              </Text>
              <Button
                title="Journal Today"
                onPress={handleAddJournal}
                size="medium"
                style={styles.todayButton}
              />
            </>
          )}
        </Card>

        {journals.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={48} color="#D1D5DB" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No journal entries yet</Text>
            <Text style={styles.emptyText}>
              Start journaling to track your mood and reflect on your days
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            <Text style={styles.listTitle}>Past Entries</Text>
            {journals.map((journal) => (
              <TouchableOpacity
                key={journal.id}
                style={styles.journalCard}
                onPress={() => handleViewJournal(journal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.journalIcon}>
                  {getMoodEmoji(journal.mood)}
                </View>
                <View style={styles.journalContent}>
                  <View style={styles.journalHeader}>
                    <Text style={styles.journalDate}>
                      {format(new Date(journal.created_at), 'MMM d, yyyy')}
                    </Text>
                    <Text style={styles.journalMood}>
                      {getMoodLabel(journal.mood)}
                    </Text>
                  </View>
                  {journal.text && (
                    <Text style={styles.journalPreview} numberOfLines={2}>
                      {journal.text}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={todayJournal ? "View Today's Entry" : "New Journal Entry"}
          onPress={handleAddJournal}
          icon={todayJournal ? undefined : <Plus size={20} color="#FFFFFF" />}
          size="large"
          variant={todayJournal ? "outline" : "primary"}
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
    marginBottom: 8,
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
    paddingBottom: 100,
    gap: 24,
  },
  todayCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  todayIcon: {
    marginBottom: 12,
  },
  todayComplete: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  todayText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  todayButton: {
    minWidth: 200,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  journalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  journalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalContent: {
    flex: 1,
    gap: 8,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journalDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  journalMood: {
    fontSize: 14,
    color: '#666666',
  },
  journalPreview: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
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


