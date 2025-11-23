import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Zap, Lock, TrendingUp, Brain, Clock } from 'lucide-react-native';
import { usePremium } from '@/hooks/usePremium';
import { StatusBar } from 'expo-status-bar';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

type PurchaseOption = 'weekly' | 'lifetime';

export default function PremiumScreen() {
  const router = useRouter();
  const { isPremium, packages, loading, purchasing, restoring, purchase, restore } = usePremium();
  const [selectedOption, setSelectedOption] = useState<PurchaseOption>('weekly');
  
  // Animation values for button effects
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Track premium screen viewed
  useEffect(() => {
    trackEvent(MixpanelEvents.PREMIUM_SCREEN_VIEWED, {
      is_premium: isPremium
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


  // Shimmer animation
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  async function handlePurchase() {
    if (!packages || packages.length === 0) {
      Alert.alert('Error', 'No packages available. Please try again later.');
      return;
    }

    // Find the appropriate package based on selected option
    let pkg = selectedOption === 'weekly' 
      ? packages.find(p => 
          p.packageType === 'WEEKLY' || 
          p.identifier === '$rc_weekly' ||
          p.product.identifier === 'unreal_weekly_sub' ||
          p.identifier.includes('weekly') ||
          p.identifier.includes('week')
        )
      : packages.find(p => 
          p.packageType === 'CUSTOM' || 
          p.packageType === 'LIFETIME' ||
          p.identifier === '$rc_lifetime' ||
          p.product.identifier === 'unreal_lifetime' ||
          p.identifier.includes('lifetime') ||
          p.product.productType === 'NON_CONSUMABLE'
        );

    if (!pkg) {
      // Debug: log available packages
      console.log('❌ Could not find package for:', selectedOption);
      console.log('Available packages:', packages.map(p => ({
        identifier: p.identifier,
        type: p.packageType,
        product: p.product.identifier,
        productType: p.product.productType
      })));
      
      Alert.alert('Error', `Could not find ${selectedOption} package. Please try again.`);
      return;
    }

    // Track purchase started
    trackEvent(MixpanelEvents.PREMIUM_PURCHASE_STARTED, {
      plan_type: selectedOption,
      product_id: pkg.product.identifier
    });

    const success = await purchase(pkg);
    if (success) {
      const message = selectedOption === 'lifetime' 
        ? 'You now have lifetime access to all premium features!'
        : 'You now have access to all premium features.';
      Alert.alert('Welcome to unreal+!', message, [
        { text: 'Get Started', onPress: () => router.back() }
      ]);
    }
  }

  async function handleRestore() {
    const success = await restore();
    if (success) {
      Alert.alert('Success!', 'Your premium subscription has been restored.', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
    }
  }

  if (isPremium) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.alreadyPremiumContainer}>
            <View style={styles.premiumBadgeContainer}>
              <Image 
                source={require('@/assets/images/premium.png')}
                style={styles.premiumBadgeImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.alreadyPremiumTitle}>Welcome to unreal+</Text>
            <Text style={styles.alreadyPremiumText}>
              You have access to all unreal+ features including biometrics and simulations.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const features = [
    {
      icon: Zap,
      title: 'Life Trajectory',
      description: 'Simulate the long-term outcomes of every decision you make',
    },
    {
      icon: Brain,
      title: 'Full Bio Metric Simulations',
      description: 'See detailed biometric predictions for all your what-if scenarios',
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analysis',
      description: 'Get deeper insights into how your choices shape your future',
    },
    {
      icon: Clock,
      title: 'Unlimited Access',
      description: 'No limits on simulations, what-ifs, or decision analyses',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Image 
                source={require('@/assets/images/premium.png')}
                style={styles.heroIconImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Unlock unreal+</Text>
            <Text style={styles.heroSubtitle}>
              Get full access to biometrics and life trajectory simulations
            </Text>
          </View>

          {/* Purchase Options Toggle */}
          <View style={styles.billingToggle}>
            <View style={styles.weeklyOptionWrapper}>
              <TouchableOpacity
                style={[
                  styles.billingOption,
                  selectedOption === 'weekly' && styles.billingOptionSelected,
                ]}
                onPress={() => setSelectedOption('weekly')}
                activeOpacity={0.7}
              >
                <BlurView intensity={80} tint="dark" style={styles.billingOptionBlur}>
                  <Text style={[
                    styles.billingOptionTitle,
                    selectedOption === 'weekly' && styles.billingOptionTitleSelected,
                  ]}>
                    Weekly
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text 
                      style={[
                        styles.billingOptionPrice,
                        selectedOption === 'weekly' && styles.billingOptionPriceSelected,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      $4.99
                    </Text>
                    <Text style={[
                      styles.billingOptionPeriod,
                      selectedOption === 'weekly' && styles.billingOptionPeriodSelected,
                    ]}>
                      /week
                    </Text>
                  </View>
                  <Text style={styles.billingOptionDetailPlaceholder}> </Text>
                </BlurView>
              </TouchableOpacity>
            </View>

            <View style={styles.lifetimeOptionWrapper}>
              <LinearGradient
                colors={['#FFEB3B', '#FFC107', '#FFA000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBadge}
              >
                <Text style={styles.saveBadgeText}>BEST VALUE</Text>
              </LinearGradient>
              <TouchableOpacity
                style={[
                  styles.billingOption,
                  selectedOption === 'lifetime' && styles.billingOptionSelected,
                ]}
                onPress={() => setSelectedOption('lifetime')}
                activeOpacity={0.7}
              >
                <BlurView intensity={80} tint="dark" style={styles.billingOptionBlur}>
                  <Text style={[
                    styles.billingOptionTitle,
                    selectedOption === 'lifetime' && styles.billingOptionTitleSelected,
                  ]}>
                    Lifetime
                  </Text>
                  <Text style={[
                    styles.billingOptionPrice,
                    selectedOption === 'lifetime' && styles.billingOptionPriceSelected,
                  ]}>
                    $29.99
                  </Text>
                  <Text style={styles.billingOptionDetail}>One-time payment</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What You'll Get</Text>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Icon size={24} color="#FFEB3B" strokeWidth={2} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Purchase Button */}
          <Animated.View 
            style={[
              styles.purchaseButtonWrapper,
              {
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <TouchableOpacity
              style={[styles.purchaseButton, (purchasing || loading) && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing || loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFEB3B', '#FFC107', '#FFA000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.purchaseButtonGradient}
              >
                <Animated.View
                  style={[
                    styles.shimmerOverlay,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.3, 0],
                      }),
                      transform: [
                        {
                          translateX: shimmerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-200, 200],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                {purchasing ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {selectedOption === 'weekly' ? 'Start Weekly Subscription' : 'Purchase Lifetime Access'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Restore Button */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring || loading}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="#FFEB3B" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          {/* Fine Print */}
          <Text style={styles.finePrint}>
            {selectedOption === 'weekly' 
              ? 'Subscription will auto-renew unless cancelled. Cancel anytime in App Store settings.'
              : 'Lifetime access is a one-time payment. No recurring charges.'}
          </Text>

          {/* Terms and Privacy Links */}
          <View style={styles.legalLinks}>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://pastoral-supply-662.notion.site/Privacy-Policy-unreal-2a32cec59ddf80098740f16913e6d43d')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://pastoral-supply-662.notion.site/Privacy-Policy-unreal-2a32cec59ddf80098740f16913e6d43d')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
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
    backgroundColor: '#0C0C10',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroIconImage: {
    width: 80,
    height: 80,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  weeklyOptionWrapper: {
    flex: 1,
  },
  billingOption: {
    width: '100%',
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
  },
  lifetimeOptionWrapper: {
    flex: 1,
    position: 'relative',
  },
  billingOptionSelected: {
    borderColor: 'rgba(255, 215, 0, 0.6)',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  billingOptionBlur: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#FFEB3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  billingOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 8,
  },
  billingOptionTitleSelected: {
    color: '#FFFFFF',
  },
  priceContainer: {
    alignItems: 'center',
  },
  billingOptionPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    marginTop: 2,
  },
  billingOptionPeriodSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  billingOptionPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(200, 200, 200, 0.85)',
  },
  billingOptionPriceSelected: {
    color: '#FFFFFF',
  },
  billingOptionDetail: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.65)',
    marginTop: 4,
  },
  billingOptionDetailPlaceholder: {
    fontSize: 13,
    color: 'transparent',
    marginTop: 4,
  },
  featuresSection: {
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 20,
  },
  purchaseButtonWrapper: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButton: {
    borderRadius: 18,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    width: 100,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFEB3B',
  },
  finePrint: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.55)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legalLinkText: {
    fontSize: 12,
    color: '#FFEB3B',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.55)',
  },
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
    color: '#FFFFFF',
    marginBottom: 12,
  },
  alreadyPremiumText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
    lineHeight: 24,
  },
});

