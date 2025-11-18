import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getJournals, getTodayJournal } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Plus, BookOpen, Smile, Meh, Frown } from 'lucide-react-native';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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
        <BlurView intensity={80} tint="dark" style={styles.todayCard}>
          <LinearGradient
            colors={['rgba(135, 206, 250, 0.1)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassHighlight}
          />
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
              <View style={styles.todayIconContainer}>
                <BookOpen size={32} color="rgba(135, 206, 250, 0.8)" />
              </View>
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
        </BlurView>

        {journals.length === 0 && !loading ? (
          <BlurView intensity={80} tint="dark" style={styles.emptyCard}>
            <LinearGradient
              colors={['rgba(135, 206, 250, 0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassHighlight}
            />
            <BookOpen size={48} color="rgba(135, 206, 250, 0.6)" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No journal entries yet</Text>
            <Text style={styles.emptyText}>
              Start journaling to track your mood and reflect on your days
            </Text>
          </BlurView>
        ) : (
          <View style={styles.list}>
            <Text style={styles.listTitle}>Past Entries</Text>
            {journals.map((journal) => (
              <TouchableOpacity
                key={journal.id}
                onPress={() => handleViewJournal(journal.id)}
                activeOpacity={0.8}
              >
                <View style={styles.journalCardWrapper}>
                  <BlurView intensity={80} tint="dark" style={styles.journalCard}>
                    <LinearGradient
                      colors={['rgba(135, 206, 250, 0.08)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.glassHighlightCard}
                    />
                    <View style={styles.journalIcon}>
                      {getMoodEmoji(journal.mood)}
                    </View>
                    <View style={styles.journalContent}>
                      <View style={styles.journalHeader}>
                        <View style={styles.journalHeaderLeft}>
                          <Text style={styles.journalDate}>
                            {format(new Date(journal.created_at), 'MMM d, yyyy')}
                          </Text>
                          <View style={styles.journalMoodBadge}>
                            <Text style={styles.journalMood}>
                              {getMoodLabel(journal.mood)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {journal.text && (
                        <Text style={styles.journalPreview} numberOfLines={3}>
                          {journal.text}
                        </Text>
                      )}
                    </View>
                  </BlurView>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    borderBottomColor: 'rgba(135, 206, 250, 0.15)',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: 'rgba(135, 206, 250, 0.8)',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(135, 206, 250, 0.7)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  todayCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  todayIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(20, 30, 50, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
  },
  todayIcon: {
    marginBottom: 12,
  },
  todayComplete: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  todayText: {
    fontSize: 15,
    color: 'rgba(135, 206, 250, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  todayButton: {
    minWidth: 200,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(135, 206, 250, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  list: {
    gap: 16,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  journalCardWrapper: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.4)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  journalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  glassHighlightCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  journalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(20, 30, 50, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 250, 0.25)',
    marginRight: 14,
  },
  journalContent: {
    flex: 1,
    gap: 10,
  },
  journalHeader: {
    marginBottom: 4,
  },
  journalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  journalDate: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
  journalMoodBadge: {
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.25)',
  },
  journalMood: {
    fontSize: 12,
    color: 'rgba(135, 206, 250, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  journalPreview: {
    fontSize: 15,
    color: 'rgba(220, 220, 220, 0.75)',
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#0C0C10',
  },
});


