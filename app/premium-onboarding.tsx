import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Alert, Image, Linking, Animated, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Circle, Star, X, Infinity, MessageCircle, BarChart3, GitBranch } from 'lucide-react-native';
import { usePremium } from '@/hooks/usePremium';
import { StatusBar } from 'expo-status-bar';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { completeOnboarding } from '@/lib/storage';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

type PurchaseOption = 'weekly' | 'lifetime';

const REVIEWS = [
  { name: 'Sarah K.', text: 'This app completely changed how I approach big life decisions. My twin predicted exactly what would happen with my career move.' },
  { name: 'Marcus T.', text: 'I was skeptical at first but the simulations are eerily accurate. Helped me decide between two job offers and I couldn\'t be happier.' },
  { name: 'Priya S.', text: 'The daily tasks actually move the needle. I\'ve made more progress in 2 weeks than in 6 months of journaling alone.' },
  { name: 'James L.', text: 'Finally an app that takes self-improvement seriously. The decision engine is like having a life coach available 24/7.' },
  { name: 'Emily R.', text: 'Ran a 5-year simulation and it opened my eyes. Changed my savings strategy completely based on what my twin showed me.' },
  { name: 'David W.', text: 'The architect gives incredibly thoughtful advice. It actually understands my personality and values. Best purchase I\'ve made.' },
];

const FEATURES = [
  { icon: BarChart3, title: 'Curated Path', description: 'Daily tasks personalized to move you toward your dream self' },
  { icon: Infinity, title: 'Unlimited Simulations', description: 'Create unlimited timelines and simulate unlimited years' },
  { icon: MessageCircle, title: 'Discuss Decisions', description: 'Chat with your Architect about any decision' },
  { icon: GitBranch, title: 'Simulation Branches', description: 'Explore alternate timelines and decision points' },
];

export default function PremiumOnboardingScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isOnboarding = from === 'onboarding';
  const exitRoute = '/(tabs)/home';
  const user = useAuth((state) => state.user);
  const { isPremium, packages, loading, purchasing, restoring, purchase, restore } = usePremium();
  const [selectedOption, setSelectedOption] = useState<PurchaseOption>('weekly');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const featureFade1 = useRef(new Animated.Value(0)).current;
  const featureSlide1 = useRef(new Animated.Value(20)).current;
  const featureFade2 = useRef(new Animated.Value(0)).current;
  const featureSlide2 = useRef(new Animated.Value(20)).current;
  const featureFade3 = useRef(new Animated.Value(0)).current;
  const featureSlide3 = useRef(new Animated.Value(20)).current;
  const reviewsFade = useRef(new Animated.Value(0)).current;
  const reviewsSlide = useRef(new Animated.Value(20)).current;

  // Layout position tracking for scroll-triggered animations
  const mainSectionY = useRef(9999);
  const s1LocalY = useRef(9999);
  const s2LocalY = useRef(9999);
  const s3LocalY = useRef(9999);
  const reviewsSectionY = useRef(9999);
  const s1Done = useRef(false);
  const s2Done = useRef(false);
  const s3Done = useRef(false);
  const reviewsDone = useRef(false);

  const triggerAnim = (fade: Animated.Value, slide: Animated.Value) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  };

  const handleFeatureScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const viewH = event.nativeEvent.layoutMeasurement.height;
    const threshold = offsetY + viewH * 0.75;

    const PADDING_TOP = 40;
    const s1Y = PADDING_TOP + mainSectionY.current + s1LocalY.current;
    const s2Y = PADDING_TOP + mainSectionY.current + s2LocalY.current;
    const s3Y = PADDING_TOP + mainSectionY.current + s3LocalY.current;
    const revY = PADDING_TOP + reviewsSectionY.current;

    if (!s1Done.current && s1Y < threshold) {
      s1Done.current = true;
      triggerAnim(featureFade1, featureSlide1);
    }
    if (!s2Done.current && s2Y < threshold) {
      s2Done.current = true;
      triggerAnim(featureFade2, featureSlide2);
    }
    if (!s3Done.current && s3Y < threshold) {
      s3Done.current = true;
      triggerAnim(featureFade3, featureSlide3);
    }
    if (!reviewsDone.current && revY < threshold) {
      reviewsDone.current = true;
      triggerAnim(reviewsFade, reviewsSlide);
    }
  };

  useEffect(() => {
    trackEvent(MixpanelEvents.PREMIUM_SCREEN_VIEWED, {
      is_premium: isPremium,
      from_onboarding: true
    });
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  async function handlePurchase() {
    try {
      if (!packages || packages.length === 0) {
        Alert.alert('Error', 'No packages available. Please try again later.');
        return;
      }

      let pkg = selectedOption === 'weekly' 
        ? packages.find(p => 
            p.product.identifier === 'mora_weekly_sub' ||
            p.packageType === 'WEEKLY' || 
            p.identifier === '$rc_weekly' ||
            p.identifier.includes('weekly') ||
            p.identifier.includes('week')
          )
        : packages.find(p => 
            p.product.identifier === 'mora_lifetime_v2' ||
            p.packageType === 'CUSTOM' || 
            p.packageType === 'LIFETIME' ||
            p.identifier === '$rc_lifetime' ||
            p.product.productType === 'NON_CONSUMABLE' ||
            p.identifier.includes('lifetime')
          );

      if (!pkg) {
        Alert.alert('Error', `Could not find ${selectedOption} package. Please try again.`);
        return;
      }

      trackEvent(MixpanelEvents.PREMIUM_PURCHASE_STARTED, {
        plan_type: selectedOption,
        product_id: pkg.product.identifier,
        from_onboarding: true
      });

      const success = await purchase(pkg);
      if (success) {
        const message = selectedOption === 'lifetime' 
          ? 'You now have lifetime access to all premium features!'
          : 'You now have access to all premium features.';
        Alert.alert('Welcome to mora+!', message, [
          { 
            text: 'Get Started', 
            onPress: () => handleExit()
          }
        ]);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', `Failed to process purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleRestore() {
    const success = await restore();
    if (success) {
      Alert.alert('Success!', 'Your premium subscription has been restored.', [
        { 
          text: 'Continue', 
          onPress: () => handleExit()
        }
      ]);
    } else {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
    }
  }

  async function handleExit() {
    if (isOnboarding && user) {
      try {
        await completeOnboarding(user.id, {});
        useTwin.getState().setOnboardingComplete(true);
      } catch (e) {
        console.warn('Failed to mark onboarding complete:', e);
      }
    }
    router.replace(exitRoute as any);
  }

  function handleSkip() {
    trackEvent(MixpanelEvents.BUTTON_CLICKED, {
      button_name: 'Skip Premium',
      screen: 'Premium Onboarding',
    });
    handleExit();
  }

  if (isPremium) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {!isOnboarding && (
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} activeOpacity={0.7}>
              <X size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
          <View style={styles.premiumActiveContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} color="#FFD700" fill="#FFD700" />
              ))}
            </View>
            <Text style={styles.heroTitle}>You're a mora+ member</Text>
            <Text style={[styles.heroTitle, { fontSize: 16, fontWeight: '400', marginBottom: 8 }]}>You have access to all premium features</Text>
            <Pressable onPress={() => handleExit()} style={styles.goBackButton}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onScroll={handleFeatureScroll}
          scrollEventThrottle={16}
        >
          
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Stars Row */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} color="#FFB800" fill="#FFB800" />
              ))}
              <Text style={styles.starsLabel}>4.9</Text>
            </View>

            {/* Hero Title */}
            <Text style={styles.heroTitle}>
              Your dream self{'\n'}is waiting.
            </Text>

            {/* Pricing Cards */}
            <View style={styles.pricingContainer}>
              {/* Weekly Card (Free Trial) */}
              <View style={styles.pricingCardWrapper}>
                <TouchableOpacity
                  style={[
                    styles.pricingCard,
                    selectedOption === 'weekly' && styles.pricingCardSelected
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedOption('weekly');
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={Colors.gradients.peach}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveBadge}
                  >
                    <Text style={styles.saveBadgeText}>3 Days Free</Text>
                  </LinearGradient>

                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Weekly</Text>
                    {selectedOption === 'weekly' ? (
                      <LinearGradient
                        colors={Colors.gradients.peach}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.checkCircle}
                      >
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </LinearGradient>
                    ) : (
                      <Circle size={20} color={Colors.textTertiary} />
                    )}
                  </View>
                  
                  <View style={styles.cardPriceContainer}>
                    <Text style={styles.cardPrice}>$4.99</Text>
                    <Text style={styles.cardPeriod}>/ week after trial</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Lifetime Card */}
              <View style={styles.pricingCardWrapper}>
                <TouchableOpacity
                  style={[
                    styles.pricingCard,
                    selectedOption === 'lifetime' && styles.pricingCardSelected
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedOption('lifetime');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Lifetime</Text>
                    {selectedOption === 'lifetime' ? (
                      <LinearGradient
                        colors={Colors.gradients.peach}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.checkCircle}
                      >
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </LinearGradient>
                    ) : (
                      <Circle size={20} color={Colors.textTertiary} />
                    )}
                  </View>
                  
                  <View style={styles.cardPriceContainer}>
                    <View style={styles.priceRow}>
                      <Text style={styles.cardPriceOriginal}>$50</Text>
                      <Text style={styles.cardPrice}>$29.99</Text>
                    </View>
                    <Text style={styles.cardPeriod}>one-time</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Features / Benefits */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>What You'll Get</Text>
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <View key={index} style={styles.featureRow}>
                    <View style={styles.featureIconContainer}>
                      <Icon size={20} color={Colors.textPrimary} strokeWidth={2} />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      <Text style={styles.featureDescription}>{feature.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Main Features */}
            <View
              style={styles.mainFeaturesSection}
              onLayout={e => { mainSectionY.current = e.nativeEvent.layout.y; }}
            >
              <Text style={styles.mainFeaturesTitle}>See It In Action</Text>

              {/* Tasks */}
              <Animated.View
                onLayout={e => { s1LocalY.current = e.nativeEvent.layout.y; }}
                style={{ opacity: featureFade1, transform: [{ translateY: featureSlide1 }], marginBottom: 40 }}
              >
                <View style={styles.ftBlockHeader}>
                  <Text style={styles.ftBlockTitle}>Daily Tasks</Text>
                  <Text style={styles.ftBlockSubtitle}>Micro-actions built around your goals</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ftTaskCarousel}>
                  <View style={[styles.ftTaskCard, styles.ftTaskCardCompleted]}>
                    <View style={styles.ftTaskHeader}>
                      <View style={styles.ftCategoryBadge}>
                        <Text style={styles.ftCategoryText}>GROWTH</Text>
                        <Text style={styles.ftCategoryEmoji}>🌱</Text>
                      </View>
                      <LinearGradient colors={['#25729f', '#62edb9']} style={styles.ftPointsBadge}>
                        <Text style={styles.ftPointsText}>+15</Text>
                      </LinearGradient>
                    </View>
                    <Text style={[styles.ftTaskText, styles.ftTaskTextDone]} numberOfLines={3}>Research 3 companies in your target industry</Text>
                    <View style={[styles.ftCheckbox, styles.ftCheckboxDone]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={4} />
                    </View>
                  </View>
                  <View style={styles.ftTaskCard}>
                    <View style={styles.ftTaskHeader}>
                      <View style={styles.ftCategoryBadge}>
                        <Text style={styles.ftCategoryText}>HEALTH</Text>
                        <Text style={styles.ftCategoryEmoji}>💪</Text>
                      </View>
                      <LinearGradient colors={['#25729f', '#62edb9']} style={styles.ftPointsBadge}>
                        <Text style={styles.ftPointsText}>+10</Text>
                      </LinearGradient>
                    </View>
                    <Text style={styles.ftTaskText} numberOfLines={3}>30 min walk or light exercise session</Text>
                    <View style={styles.ftCheckbox}>
                      <View style={styles.ftCheckboxDot} />
                    </View>
                  </View>
                  <View style={styles.ftTaskCard}>
                    <View style={styles.ftTaskHeader}>
                      <View style={styles.ftCategoryBadge}>
                        <Text style={styles.ftCategoryText}>FINANCE</Text>
                        <Text style={styles.ftCategoryEmoji}>💰</Text>
                      </View>
                      <LinearGradient colors={['#25729f', '#62edb9']} style={styles.ftPointsBadge}>
                        <Text style={styles.ftPointsText}>+20</Text>
                      </LinearGradient>
                    </View>
                    <Text style={styles.ftTaskText} numberOfLines={3}>Review and optimize your monthly budget</Text>
                    <View style={styles.ftCheckbox}>
                      <View style={styles.ftCheckboxDot} />
                    </View>
                  </View>
                </ScrollView>
              </Animated.View>

              {/* Decision */}
              <Animated.View
                onLayout={e => { s2LocalY.current = e.nativeEvent.layout.y; }}
                style={{ opacity: featureFade2, transform: [{ translateY: featureSlide2 }], marginBottom: 40 }}
              >
                <View style={styles.ftBlockHeader}>
                  <Text style={styles.ftBlockTitle}>Decisions</Text>
                  <Text style={styles.ftBlockSubtitle}>AI predictions powered by your digital twin</Text>
                </View>
                <View style={styles.ftQuestionCard}>
                  <Text style={styles.ftQuestionLabel}>Question</Text>
                  <Text style={styles.ftQuestionText}>Should I take the new job offer?</Text>
                </View>
                <View style={styles.ftPredictionCard}>
                  <Text style={styles.ftPredLabel}>Recommended</Text>
                  <Text style={styles.ftPredValue}>Yes, take it</Text>
                  <Text style={styles.ftConfidence}>78% confidence</Text>
                </View>
                <View style={styles.ftRationaleCard}>
                  <Text style={styles.ftSectionTitle}>Why this choice?</Text>
                  <Text style={styles.ftRationale}>I know you've been wanting more career growth. This role gives you the autonomy and upside you're looking for right now.</Text>
                </View>
              </Animated.View>

              {/* Simulation */}
              <Animated.View
                onLayout={e => { s3LocalY.current = e.nativeEvent.layout.y; }}
                style={{ opacity: featureFade3, transform: [{ translateY: featureSlide3 }] }}
              >
                <View style={styles.ftBlockHeader}>
                  <Text style={styles.ftBlockTitle}>Simulations</Text>
                  <Text style={styles.ftBlockSubtitle}>Project your career 5–10 years into the future</Text>
                </View>
                <View style={styles.ftOutcomeCard}>
                  <View style={styles.ftOutcomeHeader}>
                    <View style={styles.ftOutcomeIconWrap}>
                      <Image source={require('@/assets/images/icon.png')} style={styles.ftOutcomeIconImg} resizeMode="contain" />
                    </View>
                    <Text style={styles.ftOutcomeHeaderLabel}>Career Outcome</Text>
                    <View style={styles.ftHorizonBadge}>
                      <Text style={styles.ftHorizonText}>10 YEAR</Text>
                    </View>
                  </View>
                  <Text style={styles.ftOutcomeTitle}>VP of Engineering</Text>
                  <View style={styles.ftCompanyRow}>
                    <Text style={styles.ftCompany}>Google</Text>
                  </View>
                  <View style={styles.ftCompContainer}>
                    <View style={styles.ftCompHeaderRow}>
                      <Text style={styles.ftCompLabel}>Total Compensation</Text>
                      <View style={styles.ftMarketBadge}>
                        <Text style={styles.ftMarketText}>+12% vs Market</Text>
                      </View>
                    </View>
                    <Text style={styles.ftCompAmount}>$450K</Text>
                    <Text style={styles.ftLocation}>San Francisco, CA</Text>
                  </View>
                </View>
                <View style={styles.ftTimelineCard}>
                  <Text style={styles.ftSectionTitle}>Timeline</Text>
                  <View style={styles.ftTimeline}>
                    <View style={[styles.ftTimelineDot, { backgroundColor: '#6BCA9A' }]} />
                    <View style={styles.ftTimelineBar} />
                    <View style={[styles.ftTimelineDot, { backgroundColor: '#7AA5E8' }]} />
                    <View style={styles.ftTimelineBar} />
                    <View style={[styles.ftTimelineDot, { backgroundColor: '#E87A7F' }]} />
                    <View style={styles.ftTimelineBar} />
                    <View style={[styles.ftTimelineDot, { backgroundColor: '#E4B5D3' }]} />
                  </View>
                  <View style={styles.ftTimelineLabels}>
                    <Text style={styles.ftTimelineLabel}>Now</Text>
                    <Text style={styles.ftTimelineLabel}>3yr</Text>
                    <Text style={styles.ftTimelineLabel}>7yr</Text>
                    <Text style={styles.ftTimelineLabel}>10yr</Text>
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Reviews Section */}
            <Animated.View
              onLayout={e => { reviewsSectionY.current = e.nativeEvent.layout.y; }}
              style={{ opacity: reviewsFade, transform: [{ translateY: reviewsSlide }] }}
            >
            <View style={styles.reviewsSection}>
              <Text style={styles.reviewsSectionTitle}>Loved by thousands</Text>
              <Text style={styles.reviewsSectionSubtitle}>Real people, real results</Text>
              <View style={styles.reviewsHeader}>
                <View style={styles.reviewStarsSmall}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={10} color="#FFB800" fill="#FFB800" />
                  ))}
                </View>
                <Text style={styles.reviewsCount}>127 ratings</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewsScroll}>
                {REVIEWS.map((review, idx) => (
                  <View key={idx} style={styles.reviewCard}>
                    <View style={styles.reviewCardStars}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={8} color="#FFB800" fill="#FFB800" />
                      ))}
                    </View>
                    <Text style={styles.reviewText} numberOfLines={4}>{review.text}</Text>
                    <Text style={styles.reviewAuthor}>{review.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            </Animated.View>

            {/* Trial Text */}
            <Text style={styles.finePrint}>
              {selectedOption === 'weekly' 
                ? 'Free for 3 days, then $4.99/week. Cancel anytime.'
                : 'One-time payment of $29.99. No recurring charges.'}
            </Text>

            {/* Footer Links */}
            <View style={styles.footerLinks}>
               <TouchableOpacity onPress={handleRestore}>
                 <Text style={styles.footerLinkText}>Restore Purchases</Text>
               </TouchableOpacity>
               <Text style={styles.footerSeparator}>•</Text>
               <TouchableOpacity onPress={() => Linking.openURL('https://pastoral-supply-662.notion.site/Terms-of-Service-mora-2a32cec59ddf80aca5e3ec91fdf8e529?source=copy_link')}>
                 <Text style={styles.footerLinkText}>Terms of Service</Text>
               </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Maybe later</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </Animated.View>
        </ScrollView>

        {/* Sticky bottom purchase button */}
        <View style={styles.stickyBottom}>
          <Animated.View 
            style={[
              styles.purchaseButtonWrapper,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.purchaseButton,
                (purchasing || loading) && styles.purchaseButtonDisabled,
                !(purchasing || loading) && {
                  shadowColor: '#8a98ea',
                  transform: [{ translateY: pressed ? 4 : 0 }],
                  shadowOffset: { width: 0, height: pressed ? 0 : 4 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: pressed ? 2 : 8,
                }
              ]}
              onPress={handlePurchase}
              disabled={purchasing || loading}
            >
              <LinearGradient
                colors={['#8a98ea', '#7468ec']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.purchaseButtonText}>
                {selectedOption === 'weekly' ? 'Start Free Trial' : 'Get Lifetime Access'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 12,
    marginTop: 0,
  },
  starsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginLeft: 6,
  },

  // Hero
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 37,
    marginBottom: 36,
  },

  // Main Features Section
  mainFeaturesSection: {
    marginBottom: 40,
  },
  mainFeaturesTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  ftBlockHeader: {
    marginBottom: 12,
  },
  ftBlockTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  ftBlockSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },

  // Task cards carousel
  ftTaskCarousel: {
    gap: 12,
    paddingRight: 4,
  },
  ftTaskCard: {
    width: 200,
    height: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    paddingBottom: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative' as const,
  },
  ftTaskCardCompleted: {
    backgroundColor: '#F8F8F8',
    borderColor: 'transparent',
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  ftTaskHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  ftCategoryBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ftCategoryText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
  },
  ftCategoryEmoji: {
    fontSize: 10,
  },
  ftPointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37,114,159,0.3)',
  },
  ftPointsText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  ftTaskText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 18,
  },
  ftTaskTextDone: {
    color: Colors.textTertiary,
  },
  ftCheckbox: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
  },
  ftCheckboxDone: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  ftCheckboxDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // Decision feature cards
  ftQuestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  ftQuestionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 6,
  },
  ftQuestionText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 23,
  },
  ftPredictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  ftPredLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  ftPredValue: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 4,
  },
  ftConfidence: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600' as const,
    fontFamily: Fonts.secondary.bold,
  },
  ftRationaleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  ftSectionTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 8,
  },
  ftRationale: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },

  // Simulation feature cards — matches CareerOutcomeCard
  ftOutcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    paddingTop: 24,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  ftOutcomeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    gap: 6,
  },
  ftOutcomeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  ftOutcomeIconImg: {
    width: 18,
    height: 18,
  },
  ftOutcomeHeaderLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.3,
  },
  ftHorizonBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ftHorizonText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  ftOutcomeTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    lineHeight: 34,
    marginBottom: 6,
  },
  ftCompanyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 16,
  },
  ftCompany: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  ftCompContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
  },
  ftCompHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  ftCompLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.3,
  },
  ftMarketBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  ftMarketText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#10B981',
    fontFamily: Fonts.secondary.bold,
  },
  ftCompAmount: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    letterSpacing: -1,
    lineHeight: 46,
    marginBottom: 4,
  },
  ftLocation: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  ftTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  ftTimeline: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  ftTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ftTimelineBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  ftTimelineLabels: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 2,
  },
  ftTimelineLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600' as const,
  },

  // Reviews
  reviewsSection: {
    marginBottom: 40,
  },
  reviewsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  reviewsSectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewStarsSmall: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewsCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  reviewsScroll: {
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
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewCardStars: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },

  // Features
  featuresSection: {
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 14,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 18,
  },

  // Pricing Cards
  pricingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 36,
  },
  pricingCardWrapper: {
    flex: 1,
    position: 'relative',
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    minHeight: 110,
    justifyContent: 'space-between',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  pricingCardSelected: {
    borderColor: Colors.gradients.peach[1],
    borderWidth: 2,
    shadowColor: Colors.gradients.peach[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    zIndex: 10,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPriceContainer: {
    marginTop: 'auto',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardPriceOriginal: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  cardPrice: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  cardPeriod: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },

  // Sticky bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  purchaseButtonWrapper: {
    // No margin needed, sticky handles spacing
  },
  purchaseButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },

  // Footer
  finePrint: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Fonts.secondary.bold,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footerLinkText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  footerSeparator: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },

  // Premium active state
  premiumActiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  goBackButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
});
