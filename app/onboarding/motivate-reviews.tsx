import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, ScrollView, Dimensions, Animated } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Colors, Fonts } from '@/constants/Theme';
import { Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 80;

const reviews = [
  {
    text: "this app literally changed how I make decisions. my twin's perspective is scarily accurate.",
    author: "Sarah M.",
    rating: 5,
  },
  {
    text: "I've never felt more understood by an app. the simulations are lowkey spot on to my actual life.",
    author: "James T.",
    rating: 5,
  },
  {
    text: "finally an app that actually gets me. helped me dodge a massive career L fr 🤯✨💯",
    author: "Emily R.",
    rating: 5,
  },
  {
    text: "it's like having a bestie who knows you better than you know yourself.",
    author: "Michael K.",
    rating: 5,
  },
];

export default function MotivateReviewsScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % reviews.length;
        scrollViewRef.current?.scrollTo({
          x: next * width,
          animated: true,
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  function handleContinue() {
    router.push('/onboarding/01-values-multiselect');
  }

  return (
    <OnboardingScreen
      title={
        <Text style={styles.customTitle}>Loved by Thousands</Text>
      }
      subtitle="Join a community making better life decisions"
      subtitleStyle={styles.customSubtitle}
      onNext={handleContinue}
      nextLabel="Continue"
      progress={0.32}
      showProgress={false}
    >
      <View style={styles.container}>
        <View style={styles.carouselWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="center"
            contentContainerStyle={styles.scrollContent}
          >
            {reviews.map((review, index) => (
              <View key={index} style={styles.cardWrapper}>
                <View style={styles.reviewCard}>
                  <View style={styles.starsContainer}>
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} size={20} color="#F59E0B" fill="#F59E0B" />
                    ))}
                  </View>
                  <Text style={styles.reviewText}>"{review.text}"</Text>
                  <Text style={styles.reviewAuthor}>— {review.author}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.pagination}>
          {reviews.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    width: dotWidth,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  customTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: Fonts.primary.semibold,
    lineHeight: 36,
  },
  customSubtitle: {
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselWrapper: {
    width: width,
    height: 320,
  },
  scrollContent: {
    alignItems: 'center',
  },
  cardWrapper: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  reviewCard: {
    width: '100%',
    maxWidth: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
  },
  reviewText: {
    fontSize: 18,
    lineHeight: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: Fonts.secondary.bold,
    marginBottom: 20,
  },
  reviewAuthor: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gradients.purple[1],
  },
});
