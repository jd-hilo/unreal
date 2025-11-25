import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { generateRecommendations, getCachedRecommendations, getRecommendationCategories, type RecommendationCategory, type Recommendation } from '@/lib/recommendations';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Conditionally import expo-location (requires native rebuild)
let Location: typeof import('expo-location') | null = null;
let locationWarningShown = false;
try {
  Location = require('expo-location');
} catch (e) {
  // Only warn once to avoid console spam
  if (!locationWarningShown) {
    locationWarningShown = true;
    // Silently handle - this is expected until native rebuild
  }
}

export default function RecommendationCategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const user = useAuth((state) => state.user);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (category && user) {
      loadRecommendations();
    }
  }, [category, user]);

  async function loadRecommendations() {
    if (!category || !user) return;

    setLoading(true);
    try {
      const categoryKey = category as RecommendationCategory;
      
      // Try to get cached recommendations first
      const cached = await getCachedRecommendations(user.id, categoryKey);
      
      if (cached && cached.length > 0) {
        setRecommendations(cached);
        setLoading(false);
        return;
      }

      // Generate new recommendations
      await generateNewRecommendations(categoryKey);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setLoading(false);
    }
  }

  async function generateNewRecommendations(categoryKey: RecommendationCategory) {
    if (!user) return;

    setGenerating(true);
    try {
      let location: { latitude: number; longitude: number } | string | undefined;

      // For local recommendations, get current location
      if (categoryKey === 'local' && Location) {
        try {
          // Request permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          
          if (status !== 'granted') {
            Alert.alert(
              'Location Permission Required',
              'To provide local recommendations, we need access to your location. You can enable this in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Settings', 
                  onPress: () => {
                    if (Platform.OS === 'ios' && Location) {
                      Location.requestForegroundPermissionsAsync();
                    }
                  }
                },
              ]
            );
            // Fallback to profile location
            location = undefined;
          } else {
            // Get current location
            const currentLocation = await Location!.getCurrentPositionAsync({
              accuracy: Location!.Accuracy.Balanced,
            });
            location = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
          }
        } catch (error) {
          console.warn('Failed to get location:', error);
          // Continue without location - will use profile location as fallback
          location = undefined;
        }
      }

      const newRecommendations = await generateRecommendations(user.id, categoryKey, location);
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations. Please try again.');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }

  async function handleRefresh() {
    if (!category || !user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await generateNewRecommendations(category as RecommendationCategory);
  }

  const categoryInfo = category 
    ? getRecommendationCategories()[category as RecommendationCategory]
    : null;

  if (!categoryInfo) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>Invalid category</Text>
      </View>
    );
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
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{categoryInfo.title}</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.container}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(135, 206, 250, 0.9)" />
                <Text style={styles.loadingText}>Loading recommendations...</Text>
              </View>
            ) : generating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="rgba(135, 206, 250, 0.9)" />
                <Text style={styles.loadingText}>Generating personalized recommendations...</Text>
              </View>
            ) : recommendations.length > 0 ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.description}>{categoryInfo.description}</Text>
                
                <View style={styles.recommendationsList}>
                  {recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationCardWrapper}>
                      <BlurView intensity={80} tint="dark" style={styles.recommendationCard}>
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
                        <View style={styles.recommendationCardInner}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>{rec.rank}</Text>
                          </View>
                          <View style={styles.recommendationContent}>
                            <Text style={styles.recommendationTitle}>{rec.title}</Text>
                            {rec.description && (
                              <Text style={styles.recommendationDescription}>
                                {rec.description}
                              </Text>
                            )}
                          </View>
                        </View>
                      </BlurView>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleRefresh}
                  style={styles.refreshButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.refreshButtonText}>Refresh Recommendations</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No recommendations available</Text>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  description: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 24,
    lineHeight: 22,
  },
  recommendationsList: {
    gap: 12,
    marginBottom: 24,
  },
  recommendationCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recommendationCard: {
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
  recommendationCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    gap: 14,
    zIndex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    fontFamily: 'Inter-SemiBold',
  },
  recommendationDescription: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 20,
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
  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

