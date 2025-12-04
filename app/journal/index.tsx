import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getJournals, getTodayJournal } from '@/lib/storage';
import { ArrowLeft, BookOpen, Smile, Meh, Frown } from 'lucide-react-native';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (todayJournal) {
      router.push(`/journal/${todayJournal.id}` as any);
    } else {
      router.push('/journal/add' as any);
    }
  }

  function handleViewJournal(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/journal/${id}` as any);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.back();
              }} 
              style={styles.iconButton}
            >
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>
                <Text style={styles.greetingName}>Journal{'\n'}</Text>
                <Text style={styles.greetingRest}>Track your daily{'\n'}experiences</Text>
              </Text>
            </View>

            {/* Today's Card */}
            <TouchableOpacity
              onPress={handleAddJournal}
              activeOpacity={0.8}
              style={styles.todayCardWrapper}
            >
              <BlurView intensity={40} tint="dark" style={styles.todayCard}>
                <View style={styles.todayCardContent}>
                  {todayJournal ? (
                    <>
                      <View style={styles.todayIconContainer}>
                        {getMoodEmoji(todayJournal.mood)}
                      </View>
                      <Text style={styles.todayCardTitle}>Today's Entry</Text>
                      <Text style={styles.todayCardSubtitle}>
                        {getMoodLabel(todayJournal.mood)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.todayIconContainer}>
                        <BookOpen size={32} color="#FFFFFF" strokeWidth={1.5} />
                      </View>
                      <Text style={styles.todayCardTitle}>How are you feeling?</Text>
                      <Text style={styles.todayCardSubtitle}>Start your daily reflection</Text>
                    </>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Past Entries */}
            {journals.length === 0 && !loading ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptyTitle}>No entries yet</Text>
                <Text style={styles.emptyText}>
                  Your journal entries will appear here
                </Text>
              </View>
            ) : (
              journals.length > 0 && (
                <View style={styles.entriesSection}>
                  <Text style={styles.sectionTitle}>Past Entries</Text>
                  {journals.map((journal) => (
                    <TouchableOpacity
                      key={journal.id}
                      onPress={() => handleViewJournal(journal.id)}
                      activeOpacity={0.8}
                      style={styles.journalCardWrapper}
                    >
                      <BlurView intensity={40} tint="dark" style={styles.journalCard}>
                        <View style={styles.journalCardContent}>
                          <View style={styles.journalIcon}>
                            {getMoodEmoji(journal.mood)}
                          </View>
                          <View style={styles.journalContent}>
                            <View style={styles.journalHeader}>
                              <Text style={styles.journalDate}>
                                {format(new Date(journal.created_at), 'MMM d, yyyy')}
                              </Text>
                              <View style={styles.journalMoodBadge}>
                                <Text style={styles.journalMood}>
                                  {getMoodLabel(journal.mood)}
                                </Text>
                              </View>
                            </View>
                            {journal.text && (
                              <Text style={styles.journalPreview} numberOfLines={2}>
                                {journal.text}
                              </Text>
                            )}
                          </View>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
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
    backgroundColor: '#050505',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
    letterSpacing: -0.5,
  },
  greetingName: {
    color: '#999999',
  },
  greetingRest: {
    color: '#FFFFFF',
  },
  todayCardWrapper: {
    marginBottom: 40,
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
  todayCardContent: {
    padding: 20,
    alignItems: 'flex-start',
  },
  todayIconContainer: {
    marginBottom: 16,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  todayCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 24,
  },
  todayCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  entriesSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  journalCardWrapper: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  journalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  journalCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  journalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalContent: {
    flex: 1,
    gap: 8,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  journalDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  journalMoodBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  journalMood: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  journalPreview: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 20,
  },
});
