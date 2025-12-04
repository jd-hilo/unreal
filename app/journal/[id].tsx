import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getJournal, deleteJournal } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Smile, Meh, Frown, SmilePlus, Angry, Trash2, ArrowLeft } from 'lucide-react-native';
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
        <StatusBar style="light" />
        <LinearGradient
          colors={['#050505', '#0F0F18', '#0D0D15', '#050505']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
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
            <BlurView intensity={80} tint="dark" style={styles.moodCardBlur}>
              {/* Glass border */}
              <View style={styles.glassBorder} />
              {/* Inner highlight */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.glassHighlight}
                pointerEvents="none"
              />
              <View style={styles.moodIconContainer}>
                {getMoodEmoji(journal.mood)}
              </View>
              <Text style={styles.moodLabel}>
                {getMoodLabel(journal.mood)}
              </Text>
            </BlurView>
          </View>
        </View>

        {journal.text && (
          <View style={styles.textCardWrapper}>
            <View style={styles.textCard}>
              <BlurView intensity={80} tint="dark" style={styles.textCardBlur}>
                {/* Glass border */}
                <View style={styles.glassBorder} />
                {/* Inner highlight */}
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.glassHighlight}
                  pointerEvents="none"
                />
                <Text style={styles.text}>{journal.text}</Text>
                <View style={styles.textMeta}>
                  <Text style={styles.wordCount}>
                    {journal.text.split(/\s+/).filter(Boolean).length} words
                  </Text>
                </View>
              </BlurView>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          activeOpacity={0.7}
        >
          <BlurView intensity={80} tint="dark" style={styles.deleteButtonBlur}>
            {/* Glass border */}
            <View style={styles.deleteGlassBorder} />
            {/* Inner highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.deleteGlassHighlight}
              pointerEvents="none"
            />
            <Trash2 size={18} color="rgba(239, 68, 68, 0.9)" />
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting...' : 'Delete Entry'}
            </Text>
          </BlurView>
        </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 20,
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
  moodCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  moodCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  moodCardBlur: {
    alignItems: 'center',
    padding: 32,
    position: 'relative',
  },
  moodIconContainer: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: 'rgba(20, 30, 50, 0.4)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    zIndex: 1,
  },
  textCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  textCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  textCardBlur: {
    padding: 28,
    position: 'relative',
  },
  text: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 30,
    letterSpacing: 0.1,
    fontWeight: '400',
    zIndex: 1,
  },
  textMeta: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  wordCount: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  deleteButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  deleteButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    position: 'relative',
    zIndex: 1,
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  deleteGlassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    pointerEvents: 'none',
  },
  deleteGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(239, 68, 68, 0.9)',
  },
});











