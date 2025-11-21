import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Platform, Animated } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingResponse, getProfile } from '@/lib/storage';
import * as Haptics from 'expo-haptics';

const INTERESTS = [
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎬', label: 'Movies' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '🏋️', label: 'Fitness' },
  { emoji: '🍳', label: 'Cooking' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '📸', label: 'Photography' },
  { emoji: '🧘', label: 'Yoga' },
  { emoji: '🌱', label: 'Gardening' },
  { emoji: '🎭', label: 'Theater' },
  { emoji: '🎲', label: 'Board Games' },
  { emoji: '🏔️', label: 'Hiking' },
  { emoji: '🎸', label: 'Playing Music' },
  { emoji: '✍️', label: 'Writing' },
  { emoji: '🧩', label: 'Puzzles' },
  { emoji: '🎪', label: 'Comedy' },
  { emoji: '🍷', label: 'Wine' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🐕', label: 'Dogs' },
  { emoji: '🐱', label: 'Cats' },
  { emoji: '🌍', label: 'Languages' },
  { emoji: '🔬', label: 'Science' },
  { emoji: '💻', label: 'Coding' },
  { emoji: '📱', label: 'Tech' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🎤', label: 'Singing' },
  { emoji: '💃', label: 'Dancing' },
  { emoji: '🖌️', label: 'Drawing' },
  { emoji: '🧵', label: 'Crafts' },
  { emoji: '🤹', label: 'Circus' },
  { emoji: '🏺', label: 'Pottery' },
  // Sports
  { emoji: '⚽', label: 'Soccer' },
  { emoji: '🏀', label: 'Basketball' },
  { emoji: '🏈', label: 'Football' },
  { emoji: '⚾', label: 'Baseball' },
  { emoji: '🎾', label: 'Tennis' },
  { emoji: '🏐', label: 'Volleyball' },
  { emoji: '🏉', label: 'Rugby' },
  { emoji: '🏓', label: 'Table Tennis' },
  { emoji: '🏸', label: 'Badminton' },
  { emoji: '🏒', label: 'Hockey' },
  { emoji: '🥊', label: 'Boxing' },
  { emoji: '🥋', label: 'Martial Arts' },
  { emoji: '🤺', label: 'Fencing' },
  { emoji: '⛳', label: 'Golf' },
  { emoji: '🏹', label: 'Archery' },
  { emoji: '🎣', label: 'Fishing' },
  { emoji: '🏊', label: 'Swimming' },
  { emoji: '🤽', label: 'Water Polo' },
  { emoji: '🚣', label: 'Rowing' },
  { emoji: '⛷️', label: 'Skiing' },
  { emoji: '🏂', label: 'Snowboarding' },
  { emoji: '🏄', label: 'Surfing' },
  { emoji: '🏇', label: 'Horse Racing' },
  { emoji: '🚴', label: 'Cycling' },
  { emoji: '🏃', label: 'Running' },
  { emoji: '🚶', label: 'Walking' },
  { emoji: '🧗', label: 'Rock Climbing' },
  { emoji: '🏔️', label: 'Mountaineering' },
  { emoji: '🤸', label: 'Gymnastics' },
  { emoji: '🤾', label: 'Handball' },
  { emoji: '🏋️', label: 'Weightlifting' },
  { emoji: '🤼', label: 'Wrestling' },
  { emoji: '⛸️', label: 'Ice Skating' },
  { emoji: '🏎️', label: 'Racing' },
  { emoji: '🏍️', label: 'Motorcycling' },
  { emoji: '🚵', label: 'Mountain Biking' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const existingResponse = profile?.core_json?.onboarding_responses?.['interests'];
      if (existingResponse) {
        try {
          const parsed = JSON.parse(existingResponse);
          if (Array.isArray(parsed)) {
            setSelectedInterests(parsed);
          }
        } catch (e) {
          // If not JSON, ignore
        }
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  function toggleInterest(interest: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      } else {
        return [...prev, interest];
      }
    });
  }

  async function handleNext() {
    if (user) {
      try {
        await saveOnboardingResponse(
          user.id,
          'interests',
          JSON.stringify(selectedInterests)
        );
      } catch (error) {
        console.error('Failed to save interests:', error);
      }
    }
    router.push('/onboarding/06-stress');
  }

  return (
    <OnboardingScreen
      title="What are you interested in?"
      progress={62.5}
      onNext={handleNext}
      canContinue={selectedInterests.length > 0}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <View style={styles.scrollContainer}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          onContentSizeChange={(width, height) => setContentHeight(height)}
          onLayout={(event) => setScrollViewHeight(event.nativeEvent.layout.height)}
          scrollEventThrottle={16}
        >
        <Text style={styles.subtitle}>Select all that apply</Text>
        <View style={styles.interestsGrid}>
          {INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest.label);
            return (
              <TouchableOpacity
                key={interest.label}
                style={[
                  styles.interestCard,
                  isSelected && styles.interestCardSelected,
                ]}
                onPress={() => toggleInterest(interest.label)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{interest.emoji}</Text>
                <Text
                  style={[
                    styles.interestLabel,
                    isSelected && styles.interestLabelSelected,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={false}
                >
                  {interest.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Custom Scrollbar */}
      {contentHeight > scrollViewHeight && (
        <View style={styles.scrollbarTrack}>
          <Animated.View
            style={[
              styles.scrollbarThumb,
              {
                height: Math.max(30, (scrollViewHeight / contentHeight) * scrollViewHeight),
                top: scrollY.interpolate({
                  inputRange: [0, Math.max(1, contentHeight - scrollViewHeight)],
                  outputRange: [0, scrollViewHeight - Math.max(30, (scrollViewHeight / contentHeight) * scrollViewHeight)],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
      )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingRight: 8,
  },
  scrollbarTrack: {
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginLeft: 4,
    position: 'relative',
  },
  scrollbarThumb: {
    width: 4,
    backgroundColor: 'rgba(135, 206, 250, 0.6)',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.7)',
    marginBottom: 20,
    fontWeight: '400',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
    width: '48%',
  },
  interestCardSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderColor: 'rgba(135, 206, 250, 0.8)',
    borderWidth: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
    flexShrink: 1,
  },
  interestLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

