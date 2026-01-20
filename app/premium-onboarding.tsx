import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Alert, Image, Linking, Animated, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Circle, Brain, Zap, Infinity, Sparkles } from 'lucide-react-native';
import { usePremium } from '@/hooks/usePremium';
import { StatusBar } from 'expo-status-bar';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { useAuth } from '@/store/useAuth';

type PurchaseOption = 'weekly' | 'lifetime';
const { width } = Dimensions.get('window');

export default function PremiumOnboardingScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium, packages, loading, purchasing, restoring, purchase, restore } = usePremium();
  const [selectedOption, setSelectedOption] = useState<PurchaseOption>('lifetime'); // Default to lifetime/best value
  
  // Animation values for button effects
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track premium screen viewed
  useEffect(() => {
    trackEvent(MixpanelEvents.PREMIUM_SCREEN_VIEWED, {
      is_premium: isPremium,
      from_onboarding: true
    });
  }, []);

  // Pulse animation
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
    if (!packages || packages.length === 0) {
      Alert.alert('Error', 'No packages available. Please try again later.');
      return;
    }

    // Find the appropriate package based on selected option
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

    // Track purchase started
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
          onPress: () => router.replace('/onboarding/07-clarifier')
        }
      ]);
    }
  }

  async function handleRestore() {
    const success = await restore();
    if (success) {
      Alert.alert('Success!', 'Your premium subscription has been restored.', [
        { 
          text: 'Continue', 
          onPress: () => router.replace('/onboarding/07-clarifier')
        }
      ]);
    } else {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
    }
  }

  if (isPremium) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={() => router.replace('/onboarding/07-clarifier')} 
                style={styles.closeButton}
              >
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.alreadyPremiumContainer}>
            <View style={styles.premiumBadgeContainer}>
              <Image 
                source={require('@/assets/images/premium.png')}
                style={styles.premiumBadgeImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.alreadyPremiumTitle}>Welcome to mora+</Text>
            <Text style={styles.alreadyPremiumText}>
              You have access to all mora+ features including biometrics and simulations.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => router.replace('/onboarding/07-clarifier')} 
              style={styles.closeButton}
            >
              <X size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Image 
                source={require('@/assets/images/cube.png')}
                style={styles.heroIconImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>
              Your digital twin is waiting for you
            </Text>
          </View>

          {/* Pricing Cards */}
          <View style={styles.pricingContainer}>
            {/* Lifetime Card (Best Value) */}
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
                <LinearGradient
                  colors={Colors.gradients.peach}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBadge}
                >
                  <Text style={styles.saveBadgeText}>Best Value</Text>
                </LinearGradient>

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

            {/* Weekly Card */}
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
                  <Text style={styles.cardPeriod}>/ week</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Continue Button */}
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
              <Text style={styles.purchaseButtonText}>Continue</Text>
            </Pressable>
          </Animated.View>

          {/* Trial Text */}
          <Text style={styles.finePrint}>
            {selectedOption === 'weekly' 
              ? 'First 3 days free, then $4.99/week'
              : 'One-time payment. No recurring charges.'}
          </Text>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What You'll Get</Text>
            {[
              {
                icon: Infinity,
                title: 'Unlimited Simulations',
                description: 'Create unlimited timelines and simulate unlimited years',
              },
              {
                icon: Zap,
                title: 'Simulate Decision Outcomes',
                description: 'Long-term outcomes for every decision',
              },
              {
                icon: Brain,
                title: 'Future Biometric Prediction',
                description: 'Detailed biometric predictions for scenarios',
              },
              {
                icon: Sparkles,
                title: 'Best Case & Worst Case Scenarios',
                description: 'Optimistic and challenging future predictions',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon3D}>
                    <Icon size={24} color={Colors.textPrimary} strokeWidth={2} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

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

        </ScrollView>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerRight: {
    width: '100%',
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 60,
  },
  
  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 50,
    marginTop: 20,
  },
  heroIconContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroIconImage: {
    width: 100,
    height: 100,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    paddingHorizontal: 20,
    marginBottom: 12,
  },


  // Pricing Cards
  pricingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
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

  // Button
  purchaseButtonWrapper: {
    marginBottom: 16,
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

  // Features Section
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featureIcon3D: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.fallback.secondary,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Footer
  finePrint: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Fonts.secondary.bold,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

  // Already Premium
  alreadyPremiumContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  premiumBadgeContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  premiumBadgeImage: {
    width: 80,
    height: 80,
  },
  alreadyPremiumTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  alreadyPremiumText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Fonts.secondary.bold,
  },
});

