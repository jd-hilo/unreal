import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getJournals, getTodayJournal } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Plus, BookOpen, Smile, Meh, Frown, ArrowLeft } from 'lucide-react-native';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#050505', '#0F0F18', '#0D0D15', '#050505']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Journal</Text>
            <Text style={styles.subtitle}>
              Share your daily experiences to help your digital twin understand you better
            </Text>
          </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.todayCardWrapper}>
          <View style={styles.todayCard}>
            <BlurView intensity={80} tint="dark" style={styles.todayCardBlur}>
              {todayJournal ? (
                <View style={styles.todayCardContent}>
                  <View style={styles.todayIconContainer}>
                    {getMoodEmoji(todayJournal.mood)}
                  </View>
                  <Text style={styles.todayCardTitle}>Today's journal complete!</Text>
                  <Text style={styles.todayCardSubtitle}>
                    {getMoodLabel(todayJournal.mood)}
                  </Text>
                  <View style={styles.todayButtonContainer}>
                    <Button
                      title="View Today's Entry"
                      onPress={handleAddJournal}
                      size="medium"
                      variant="outline"
                      style={styles.todayButton}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.todayCardContent}>
                  <View style={styles.todayIconContainer}>
                    <BookOpen size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.todayCardTitle}>How are you feeling today?</Text>
                  <View style={styles.todayButtonContainer}>
                    <Button
                      title="Begin"
                      onPress={handleAddJournal}
                      size="medium"
                      style={styles.todayButton}
                    />
                  </View>
                </View>
              )}
            </BlurView>
          </View>
        </View>

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
                  <View style={styles.journalCard}>
                    <BlurView intensity={80} tint="dark" style={styles.journalCardBlur}>
                      <View style={styles.journalCardContent}>
                        <View style={styles.journalIcon}>
                          {getMoodEmoji(journal.mood)}
                        </View>
                        <View style={styles.journalTextContent}>
                          <Text style={styles.journalCardTitle}>
                            {format(new Date(journal.created_at), 'MMM d, yyyy')}
                          </Text>
                          <Text style={styles.journalCardSubtitle}>
                            {getMoodLabel(journal.mood)}
                          </Text>
                          {journal.text && (
                            <Text style={styles.journalPreview} numberOfLines={2}>
                              {journal.text}
                            </Text>
                          )}
                        </View>
                      </View>
                    </BlurView>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 24,
  },
  todayCardWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  todayCard: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  todayCardBlur: {
    padding: 20,
  },
  todayCardContent: {
    alignItems: 'flex-start',
    gap: 16,
  },
  todayIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    marginBottom: 4,
  },
  todayCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  todayCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  todayButtonContainer: {
    width: '100%',
    marginTop: 8,
  },
  todayButton: {
    minWidth: 200,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    overflow: 'hidden',
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
    borderRadius: 32,
    overflow: 'hidden',
  },
  journalCard: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  journalCardBlur: {
    padding: 20,
  },
  journalCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  journalIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  journalTextContent: {
    flex: 1,
    gap: 4,
  },
  journalCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  journalCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
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


