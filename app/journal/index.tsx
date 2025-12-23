import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getJournals, getTodayJournal } from '@/lib/storage';
import { ArrowLeft, BookOpen, Smile, Meh, Frown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';

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
    if (mood === null) return <Meh size={24} color={Colors.textTertiary} />;
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
        <StatusBar style="dark" />
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
              <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
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
                <Text style={styles.greetingRest}>Keep your twin aligned</Text>
              </Text>
            </View>

            {/* Reflect Button */}
            <TouchableOpacity
              onPress={handleAddJournal}
              activeOpacity={0.9}
              style={styles.reflectButton}
            >
              <LinearGradient
                colors={Colors.gradients.turquoise}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reflectGradient}
              >
                <View style={styles.reflectContent}>
                  <Text style={styles.reflectTitle}>Reflect on Your Day</Text>
                  {todayJournal && (
                    <Text style={styles.reflectSubtitle}>
                      {getMoodLabel(todayJournal.mood)}
                    </Text>
                  )}
                </View>
                <Image 
                  source={require('@/assets/images/cube.png')} 
                  style={styles.reflectImage}
                  resizeMode="contain"
                />
              </LinearGradient>
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
                      <View style={styles.journalCard}>
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
                      </View>
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
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -0.5,
  },
  greetingName: {
    color: Colors.textTertiary,
    fontFamily: Fonts.primary.regular,
  },
  greetingRest: {
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  reflectButton: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 120,
    marginBottom: 40,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  reflectGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  reflectContent: {
    flex: 1,
    zIndex: 2,
  },
  reflectTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Fonts.primary.regular,
    marginBottom: 6,
  },
  reflectSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
  reflectImage: {
    width: 80,
    height: 80,
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.9,
    transform: [{rotate: '-10deg'}],
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  entriesSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    fontFamily: Fonts.secondary.bold,
  },
  journalCardWrapper: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  journalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: Fonts.secondary.bold,
  },
  journalMoodBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  journalMood: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  journalPreview: {
    fontSize: 14,
    color: Colors.textTertiary,
    lineHeight: 20,
    fontFamily: Fonts.secondary.bold,
  },
});
