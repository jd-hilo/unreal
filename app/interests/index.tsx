import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getUserInterests, getInterestProgressNew, hasCompletedInterestCategory } from '@/lib/storage';
import { ProgressBar } from '@/components/ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const CATEGORIES = [
  { id: 'food', label: 'Food Types', emoji: '🍕', description: 'Select 5 favorite types of food' },
  { id: 'music_artists', label: 'Music Artists', emoji: '🎤', description: 'Select your favorite artists' },
  { id: 'movies', label: 'Movies', emoji: '🎬', description: 'Select your favorite movies' },
  { id: 'fashion', label: 'Fashion', emoji: '👗', description: 'Select your favorite fashion styles' },
];

export default function InterestsIndexScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryCompletions, setCategoryCompletions] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [user])
  );

  async function loadProgress() {
    if (!user) return;
    
    try {
      // Load completion status for each category
      const completionEntries = await Promise.all(
        CATEGORIES.map(async (c) => {
          const completed = await hasCompletedInterestCategory(user.id!, c.id);
          return [c.id, completed] as const;
        })
      );
      const completions: Record<string, boolean> = Object.fromEntries(completionEntries);
      setCategoryCompletions(completions);
      
      // Get progress using new calculation
      const progress = await getInterestProgressNew(user.id!);
      setProgress(progress);
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryPress(categoryId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/interests/${categoryId}` as any);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Interests</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Interests Completion</Text>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>
            <ProgressBar
              progress={progress / 100}
              showLabel={false}
              gradientColors={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
            />
          </View>

          {/* Categories */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Your Interests</Text>
            <Text style={styles.sectionSubtitle}>
              Select your favorites to help your twin understand you better
            </Text>

            <View style={styles.categories}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => handleCategoryPress(category.id)}
                  activeOpacity={0.85}
                  style={styles.categoryCardWrapper}
                >
                  <BlurView intensity={80} tint="dark" style={styles.categoryCard}>
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
                    <View style={styles.categoryCardInner}>
                      <View style={styles.categoryIcon}>
                        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                      </View>
                      <View style={styles.categoryContent}>
                        <Text style={styles.categoryTitle}>{category.label}</Text>
                        <Text style={styles.categorySubtitle}>
                          {category.description}
                        </Text>
                      </View>
                      {categoryCompletions[category.id] ? (
                        <CheckCircle2 size={20} color="rgba(135, 206, 250, 0.9)" strokeWidth={2.5} />
                      ) : (
                        <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
                      )}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
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
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 32,
  },
  progressSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 24,
    lineHeight: 22,
  },
  categories: {
    gap: 12,
  },
  categoryCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
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
  categoryCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    zIndex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  categorySubtitle: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
    marginTop: 2,
  },
});


