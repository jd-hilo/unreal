import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getJournal, deleteJournal } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Trash2, ArrowLeft, Home } from 'lucide-react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

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
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
            <Home size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            {format(new Date(journal.created_at), 'MMMM d, yyyy')}
          </Text>
          <Text style={styles.subtitle}>
            {format(new Date(journal.created_at), 'EEEE') + ' • ' + format(new Date(journal.created_at), 'h:mm a')}
          </Text>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.moodCardWrapper}>
            <View style={styles.moodCard}>
              <View style={styles.moodCardContent}>
                <View style={styles.moodIconContainer}>
                  {getMoodEmoji(journal.mood)}
                </View>
                <Text style={styles.moodLabel}>
                  {getMoodLabel(journal.mood)}
                </Text>
              </View>
            </View>
          </View>

          {journal.text && (
            <View style={styles.textCardWrapper}>
              <View style={styles.textCard}>
                <View style={styles.textCardContent}>
                  <Text style={styles.text}>{journal.text}</Text>
                  <View style={styles.textMeta}>
                    <Text style={styles.wordCount}>
                      {journal.text.split(/\s+/).filter(Boolean).length} words
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
            activeOpacity={0.7}
          >
            <View style={styles.deleteButtonContent}>
              <Trash2 size={18} color="#EF4444" />
              <Text style={styles.deleteButtonText}>
                {deleting ? 'Deleting...' : 'Delete Entry'}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
    fontFamily: Fonts.primary.regular,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontFamily: Fonts.secondary.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 24,
  },
  moodCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  moodCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  moodCardContent: {
    alignItems: 'center',
    padding: 32,
  },
  moodIconContainer: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 36,
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
  },
  textCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  textCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  textCardContent: {
    padding: 28,
  },
  text: {
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 30,
    letterSpacing: 0.1,
    fontWeight: '400',
    fontFamily: Fonts.secondary.bold,
  },
  textMeta: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  wordCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Fonts.secondary.bold,
  },
  deleteButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    shadowColor: 'rgba(239, 68, 68, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: Fonts.secondary.bold,
  },
});











