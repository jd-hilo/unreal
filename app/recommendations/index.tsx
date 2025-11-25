import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getInterestProgress } from '@/lib/storage';
import { getRecommendationCategories, type RecommendationCategory } from '@/lib/recommendations';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Lock, MapPin, Sparkles, Briefcase, Music, BookOpen, Headphones, Plane, Dumbbell, Palette, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Conditionally import expo-location
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

const CATEGORY_ICONS: Record<string, any> = {
  local: MapPin,
  side_hustles: Briefcase,
  music_artists: Music,
  books: BookOpen,
  podcasts: Headphones,
  travel_destinations: Plane,
  fitness_activities: Dumbbell,
  hobbies: Palette,
};

export default function RecommendationsIndexScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [interestProgress, setInterestProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  async function loadData() {
    if (!user) return;
    
    try {
      const progress = await getInterestProgress(user.id);
      setInterestProgress(progress);
      
      // Check location permission status
      if (Location) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          setLocationEnabled(status === 'granted');
        } catch (error) {
          console.warn('Failed to check location permission:', error);
          setLocationEnabled(false);
        }
      } else {
        setLocationEnabled(false);
      }
    } catch (error) {
      console.error('Failed to load interest progress:', error);
    } finally {
      setLoading(false);
    }
  }

  function isInterestsComplete(): boolean {
    // Consider interests complete if user has answered at least 30 questions (50% progress)
    return interestProgress >= 50;
  }

  function isCategoryUnlocked(category: RecommendationCategory): boolean {
    // Local recommendations require premium, interests complete, AND location enabled
    if (category === 'local') {
      return isPremium && isInterestsComplete() && locationEnabled;
    }
    // Other categories only need premium and interests complete
    return isPremium && isInterestsComplete();
  }

  function getLockReason(category: RecommendationCategory): string | null {
    if (!isPremium) {
      return 'Premium';
    }
    if (!isInterestsComplete()) {
      return 'Complete Interests';
    }
    // For local category, check location
    if (category === 'local' && !locationEnabled) {
      return 'Enable Location';
    }
    return null;
  }

  async function handleCategoryPress(category: RecommendationCategory) {
    const categoryInfo = getRecommendationCategories()[category];
    const lockReason = getLockReason(category);

    if (lockReason) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      if (lockReason === 'Premium') {
        Alert.alert(
          'Premium Feature',
          'Unlock personalized recommendations by upgrading to unreal+.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade', 
              onPress: () => router.push('/premium' as any),
              style: 'default'
            },
          ]
        );
      } else if (lockReason === 'Enable Location') {
        // Request location permission directly
        if (Location) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              setLocationEnabled(true);
              // Now that location is enabled, navigate to the category
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/recommendations/${category}` as any);
            } else {
              Alert.alert(
                'Location Permission Required',
                'Local recommendations require location access. Please enable location services in your device settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Open Settings', 
                    onPress: () => {
                      // On iOS, this will open app settings
                      if (Platform.OS === 'ios') {
                        Linking.openURL('app-settings:');
                      }
                    },
                    style: 'default'
                  },
                ]
              );
            }
          } catch (error) {
            console.error('Error requesting location permission:', error);
            Alert.alert(
              'Location Permission Required',
              'Please enable location services in your device settings to use local recommendations.',
              [{ text: 'OK', style: 'default' }]
            );
          }
        } else {
          Alert.alert(
            'Location Not Available',
            'Location services are not available. Please rebuild the app to enable location features.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else {
        Alert.alert(
          'Complete Your Interests',
          'Answer more "This or That" questions to unlock personalized recommendations.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Interests', 
              onPress: () => router.push('/interests' as any),
              style: 'default'
            },
          ]
        );
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/recommendations/${category}` as any);
  }

  const categories = Object.entries(getRecommendationCategories()) as Array<[RecommendationCategory, { title: string; description: string; requiresLocation: boolean }]>;

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
            <Text style={styles.headerTitle}>Unreal Recommendations</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isInterestsComplete() ? (
              <>
                <Text style={styles.sectionTitle}>Personalized for You</Text>
                <Text style={styles.sectionSubtitle}>
                  {isPremium
                    ? 'Discover recommendations tailored to your interests and preferences'
                    : 'Upgrade to premium to unlock personalized recommendations'}
                </Text>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/interests' as any);
                }}
                activeOpacity={0.9}
                style={styles.completeInterestsButton}
              >
                <BlurView intensity={80} tint="dark" style={styles.completeInterestsButtonBlur}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.glassHighlight}
                    pointerEvents="none"
                  />
                  <View style={styles.completeInterestsButtonInner}>
                    <Text style={styles.completeInterestsButtonText}>Complete Interests to See Recommendations</Text>
                    <ChevronRight size={20} color="#FFFFFF" />
                  </View>
                </BlurView>
              </TouchableOpacity>
            )}

            <View style={styles.categories}>
              {categories.map(([categoryId, categoryInfo]) => {
                const isUnlocked = isCategoryUnlocked(categoryId);
                const lockReason = getLockReason(categoryId);
                const emoji = (categoryInfo as any).emoji || '✨';

                return (
                  <TouchableOpacity
                    key={categoryId}
                    onPress={() => handleCategoryPress(categoryId)}
                    activeOpacity={0.85}
                    style={styles.categoryCardWrapper}
                    disabled={loading}
                  >
                    <BlurView 
                      intensity={80} 
                      tint="dark" 
                      style={[
                        styles.categoryCard,
                        !isUnlocked && styles.categoryCardLocked
                      ]}
                    >
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
                        <View style={styles.categoryEmojiContainer}>
                          <Text style={styles.categoryEmoji}>{emoji}</Text>
                          {!isUnlocked && (
                            <View style={styles.lockOverlay}>
                              <Lock size={16} color="rgba(255,255,255,0.9)" />
                            </View>
                          )}
                        </View>
                        <View style={styles.categoryContent}>
                          <Text 
                            style={[
                              styles.categoryTitle,
                              !isUnlocked && styles.categoryTitleLocked
                            ]}
                            numberOfLines={2}
                            adjustsFontSizeToFit={false}
                          >
                            {categoryInfo.title}
                          </Text>
                          {lockReason && (
                            <View style={styles.lockBadge}>
                              <Lock size={10} color="rgba(255,255,255,0.8)" />
                              <Text style={styles.lockBadgeText}>{lockReason}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  categoryCardWrapper: {
    width: '47%', // Two columns with proper gap
    aspectRatio: 1, // Square
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
    flex: 1,
  },
  categoryCardLocked: {
    backgroundColor: 'rgba(20, 20, 20, 0.3)',
    borderColor: 'rgba(100, 100, 100, 0.2)',
    opacity: 0.6,
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
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  categoryEmojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  categoryEmoji: {
    fontSize: 28,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 0,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  categoryTitleLocked: {
    color: 'rgba(150, 150, 150, 0.7)',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
  },
  completeInterestsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  completeInterestsButtonBlur: {
    borderRadius: 20,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  completeInterestsButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    zIndex: 1,
  },
  completeInterestsButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

