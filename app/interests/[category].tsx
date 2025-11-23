import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { saveInterestResponse, getNextInterestQuestion, hasCompletedCategory, getCurrentQuestionNumber } from '@/lib/storage';
import { ThisOrThatCard } from '@/components/ThisOrThatCard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Predefined options for each category
const CATEGORY_OPTIONS: Record<string, string[]> = {
  fashion: [
    'Casual', 'Formal', 'Streetwear', 'Vintage', 'Minimalist', 'Bohemian',
    'Athletic', 'Designer', 'Sustainable', 'Classic', 'Trendy', 'Elegant',
    'Comfortable', 'Bold', 'Neutral', 'Colorful', 'Monochrome', 'Layered',
    'Accessorized', 'Simple'
  ],
  food: [
    'Italian', 'Mexican', 'Japanese', 'Thai', 'Indian', 'Chinese',
    'French', 'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Greek',
    'Spanish', 'Lebanese', 'Ethiopian', 'Brazilian', 'Moroccan', 'Turkish',
    'Caribbean', 'Fusion'
  ],
  music_genres: [
    'Pop', 'Rock', 'Hip Hop', 'Jazz', 'Classical', 'Electronic',
    'Country', 'R&B', 'Reggae', 'Blues', 'Folk', 'Metal',
    'Punk', 'Indie', 'Alternative', 'Dance', 'House', 'Techno',
    'Soul', 'Funk'
  ],
  music_artists: [
    'The Beatles', 'Taylor Swift', 'Drake', 'Beyoncé', 'Ed Sheeran',
    'Ariana Grande', 'The Weeknd', 'Billie Eilish', 'Post Malone', 'Dua Lipa',
    'Harry Styles', 'Bad Bunny', 'Olivia Rodrigo', 'The Rolling Stones',
    'Queen', 'Michael Jackson', 'Prince', 'David Bowie', 'Radiohead', 'Kendrick Lamar'
  ],
  cities: [
    'New York', 'London', 'Paris', 'Tokyo', 'Los Angeles', 'Sydney',
    'Barcelona', 'Amsterdam', 'Berlin', 'Rome', 'Dubai', 'Singapore',
    'San Francisco', 'Chicago', 'Miami', 'Toronto', 'Vancouver', 'Melbourne',
    'Bangkok', 'Istanbul'
  ],
  music: [
    'Live Concerts', 'Music Festivals', 'Vinyl Records', 'Streaming', 'Radio',
    'Podcasts', 'Music Videos', 'Karaoke', 'Music Production', 'DJ Sets',
    'Acoustic', 'Symphony', 'Opera', 'Jazz Clubs', 'Underground', 'Mainstream',
    'Indie Labels', 'Major Labels', 'Music Discovery', 'Classic Hits'
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  fashion: 'Fashion',
  food: 'Food Types',
  music_genres: 'Song Genres',
  music_artists: 'Song Artists',
  cities: 'Cities',
  music: 'Music',
};

interface QuestionPair {
  optionA: string;
  optionB: string;
  imageA: string | null;
  imageB: string | null;
  descriptionA: string | null;
  descriptionB: string | null;
}

export default function CategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const user = useAuth((state) => state.user);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | null>(null);
  const [saving, setSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);

  useEffect(() => {
    if (category && user) {
      loadNextQuestion(true); // Show loading only on initial load
    }
  }, [category, user]);

  async function loadNextQuestion(showLoading = false, clearSaving = false) {
    if (!category || !user) return;

    if (showLoading) {
      setLoading(true);
    }
    setSelectedOption(null);
    
    // Clear saving state if requested (after next question is shown)
    if (clearSaving) {
      setSaving(false);
    }

    try {
      // Check if already completed
      const completed = await hasCompletedCategory(user.id, category);
      if (completed) {
        setIsComplete(true);
        if (showLoading) {
          setLoading(false);
        }
        if (clearSaving) {
          setSaving(false);
        }
        return;
      }

      // Get the next question in order (1-10)
      const question = await getNextInterestQuestion(user.id, category);

      if (!question) {
        // Check again if completed
        const completedCheck = await hasCompletedCategory(user.id, category);
        if (completedCheck) {
          setIsComplete(true);
        }
        if (showLoading) {
          setLoading(false);
        }
        if (clearSaving) {
          setSaving(false);
        }
        return;
      }

      // Preload images before showing the question
      const preloadPromises: Promise<boolean>[] = [];
      if (question.option_a_image_url) {
        preloadPromises.push(
          Image.prefetch(question.option_a_image_url).catch((err) => {
            console.warn('Failed to preload image A:', err);
            return false;
          })
        );
      }
      if (question.option_b_image_url) {
        preloadPromises.push(
          Image.prefetch(question.option_b_image_url).catch((err) => {
            console.warn('Failed to preload image B:', err);
            return false;
          })
        );
      }

      // Wait for images to preload (don't fail if preload fails)
      await Promise.all(preloadPromises);

      setCurrentQuestion({
        optionA: question.option_a,
        optionB: question.option_b,
        imageA: question.option_a_image_url,
        imageB: question.option_b_image_url,
        descriptionA: question.option_a_description,
        descriptionB: question.option_b_description,
      });
      setQuestionNumber(question.question_number);
      setIsComplete(false);
      
      // Clear saving state after question is displayed
      if (clearSaving) {
        setSaving(false);
      }
    } catch (error) {
      console.error('Error loading question:', error);
      if (showLoading) {
        setLoading(false);
      }
      if (clearSaving) {
        setSaving(false);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function handleSelect(option: 'a' | 'b') {
    if (!user || !currentQuestion || saving || selectedOption) return;

    setSelectedOption(option);
    setSaving(true);

    try {
      await saveInterestResponse(
        user.id,
        category!,
        currentQuestion.optionA,
        currentQuestion.optionB,
        option,
        {
          a: currentQuestion.imageA || '',
          b: currentQuestion.imageB || '',
        },
        {
          a: currentQuestion.descriptionA,
          b: currentQuestion.descriptionB,
        }
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Load next question without showing loading spinner
      // Keep saving state true until next question is shown
      setTimeout(() => {
        loadNextQuestion(false, true); // Don't show loading, but clear saving after question loads
      }, 300);
    } catch (error) {
      console.error('Error saving response:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSelectedOption(null);
      setSaving(false);
    }
  }

  const categoryLabel = category ? CATEGORY_LABELS[category] || category : 'Interests';

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
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>This or That: {categoryLabel}</Text>
              {questionNumber > 0 && !isComplete && (
                <Text style={styles.questionCounter}>{questionNumber}/10</Text>
              )}
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Cards Container */}
          <View style={styles.container}>
            {isComplete ? (
              <View style={styles.completeContainer}>
                <Text style={styles.completeTitle}>🎉 All Done!</Text>
                <Text style={styles.completeText}>
                  You've answered all the questions in this category.
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.completeButton}
                  activeOpacity={0.9}
                >
                  <Text style={styles.completeButtonText}>Back to Categories</Text>
                </TouchableOpacity>
              </View>
            ) : loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(135, 206, 250, 0.9)" />
                <Text style={styles.loadingText}>Loading question...</Text>
              </View>
            ) : currentQuestion ? (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.cardsColumn}
                showsVerticalScrollIndicator={false}
              >
                <ThisOrThatCard
                  option={currentQuestion.optionA}
                  imageUrl={currentQuestion.imageA || ''}
                  onPress={() => handleSelect('a')}
                  isSelected={selectedOption === 'a'}
                  isSaving={saving && selectedOption === 'a'}
                  disabled={saving || !!selectedOption}
                />
                <View style={styles.orContainer}>
                  <Text style={styles.orText}>OR</Text>
                </View>
                <ThisOrThatCard
                  option={currentQuestion.optionB}
                  imageUrl={currentQuestion.imageB || ''}
                  onPress={() => handleSelect('b')}
                  isSelected={selectedOption === 'b'}
                  isSaving={saving && selectedOption === 'b'}
                  disabled={saving || !!selectedOption}
                />
              </ScrollView>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Unable to load question</Text>
                <TouchableOpacity
                  onPress={loadNextQuestion}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  cardsColumn: {
    gap: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  orContainer: {
    paddingVertical: 8,
  },
  orText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(135, 206, 250, 0.9)',
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  completeText: {
    fontSize: 18,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
    lineHeight: 26,
  },
  completeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    marginTop: 8,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

