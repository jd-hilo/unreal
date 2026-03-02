import { useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { View, StyleSheet, Text, ScrollView, Dimensions } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Colors, Fonts } from '@/constants/Theme';
import { Star } from 'lucide-react-native';
import { trackEvent } from '@/lib/mixpanel';

const { width } = Dimensions.get('window');

const reviews = [
  { name: 'Sarah K.', text: 'This app completely changed how I approach big life decisions. My twin predicted exactly what would happen with my career move.' },
  { name: 'Marcus T.', text: 'I was skeptical at first but the simulations are eerily accurate. Helped me decide between two job offers and I couldn\'t be happier.' },
  { name: 'Priya S.', text: 'The daily tasks actually move the needle. I\'ve made more progress in 2 weeks than in 6 months of journaling alone.' },
  { name: 'James L.', text: 'Finally an app that takes self-improvement seriously. The decision engine is like having a life coach available 24/7.' },
  { name: 'Emily R.', text: 'Ran a 5-year simulation and it opened my eyes. Changed my savings strategy completely based on what my twin showed me.' },
  { name: 'David W.', text: 'The architect gives incredibly thoughtful advice. It actually understands my personality and values. Best purchase I\'ve made.' },
];

export default function MotivateReviewsScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - motivate-reviews');
    }, [])
  );

  function handleContinue() {
    router.push('/onboarding/01-values-multiselect');
  }

  return (
    <OnboardingScreen
      title="Loved by thousands"
      subtitle="Real people, real results."
      onNext={handleContinue}
      nextLabel="Continue"
      progress={0.32}
      showProgress={false}
    >
      <View style={styles.container}>
        {/* Rating header */}
        <View style={styles.ratingHeader}>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map((i) => (
              <Star key={i} size={13} color="#FFB800" fill="#FFB800" />
            ))}
          </View>
          <Text style={styles.ratingLabel}>4.9 · 127 ratings</Text>
        </View>

        {/* Horizontal card scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={210}
        >
          {reviews.map((review, idx) => (
            <View key={idx} style={styles.reviewCard}>
              <View style={styles.cardStars}>
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} size={9} color="#FFB800" fill="#FFB800" />
                ))}
              </View>
              <Text style={styles.reviewText} numberOfLines={5}>{review.text}</Text>
              <Text style={styles.reviewAuthor}>{review.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 24,
  },
  reviewCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardStars: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 10,
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
});
