import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Zap, Lock, TrendingUp, Brain, Clock } from 'lucide-react-native';
import { usePremium } from '@/hooks/usePremium';
import { StatusBar } from 'expo-status-bar';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

type BillingPeriod = 'monthly' | 'yearly';

export default function PremiumScreen() {
  const router = useRouter();
  const { isPremium, packages, loading, purchasing, restoring, purchase, restore } = usePremium();
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('yearly');

  // Track premium screen viewed
  useEffect(() => {
    trackEvent(MixpanelEvents.PREMIUM_SCREEN_VIEWED, {
      is_premium: isPremium
    });
  }, []);

  async function handlePurchase() {
    if (!packages || packages.length === 0) {
      Alert.alert('Error', 'No packages available. Please try again later.');
      return;
    }

    // Find the appropriate package based on selected period
    let pkg = selectedPeriod === 'monthly' 
      ? packages.find(p => 
          p.packageType === 'MONTHLY' || 
          p.identifier === '$rc_monthly' ||
          p.product.identifier === 'unreal_monthly_sub' ||
          p.identifier.includes('monthly')
        )
      : packages.find(p => 
          p.packageType === 'ANNUAL' || 
          p.identifier === '$rc_annual' ||
          p.product.identifier === 'unreal_yearly_sub' ||
          p.identifier.includes('annual') || 
          p.identifier.includes('yearly')
        );

    if (!pkg) {
      // Debug: log available packages
      console.log('❌ Could not find package for:', selectedPeriod);
      console.log('Available packages:', packages.map(p => ({
        identifier: p.identifier,
        type: p.packageType,
        product: p.product.identifier
      })));
      
      Alert.alert('Error', `Could not find ${selectedPeriod} subscription package. Please try again.`);
      return;
    }

    // Track purchase started
    trackEvent(MixpanelEvents.PREMIUM_PURCHASE_STARTED, {
      plan_type: selectedPeriod,
      product_id: pkg.product.identifier
    });

    const success = await purchase(pkg);
    if (success) {
      Alert.alert('Welcome to unreal+!', 'You now have access to all premium features.', [
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
      icon: Brain,
      title: 'Full Bio Metrics',
      description: 'See detailed biometric predictions for all your what-if scenarios',
    },
    {
      icon: Zap,
      title: 'Life Trajectory Simulations',
      description: 'Simulate the long-term outcomes of every decision you make',
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

          {/* Billing Period Toggle */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedPeriod === 'monthly' && styles.billingOptionSelected,
              ]}
              onPress={() => setSelectedPeriod('monthly')}
              activeOpacity={0.7}
            >
              <BlurView intensity={80} tint="dark" style={styles.billingOptionBlur}>
                <Text style={[
                  styles.billingOptionTitle,
                  selectedPeriod === 'monthly' && styles.billingOptionTitleSelected,
                ]}>
                  Monthly
                </Text>
                <Text style={[
                  styles.billingOptionPrice,
                  selectedPeriod === 'monthly' && styles.billingOptionPriceSelected,
                ]}>
                  $9.99/mo
                </Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedPeriod === 'yearly' && styles.billingOptionSelected,
              ]}
              onPress={() => setSelectedPeriod('yearly')}
              activeOpacity={0.7}
            >
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>SAVE 20%</Text>
              </View>
              <BlurView intensity={80} tint="dark" style={styles.billingOptionBlur}>
                <Text style={[
                  styles.billingOptionTitle,
                  selectedPeriod === 'yearly' && styles.billingOptionTitleSelected,
                ]}>
                  Yearly
                </Text>
                <Text style={[
                  styles.billingOptionPrice,
                  selectedPeriod === 'yearly' && styles.billingOptionPriceSelected,
                ]}>
                  $94.99/yr
                </Text>
                <Text style={styles.billingOptionDetail}>$7.92/mo</Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What You'll Get</Text>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Icon size={24} color="rgba(135, 206, 250, 0.9)" strokeWidth={2} />
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
          <TouchableOpacity
            style={[styles.purchaseButton, (purchasing || loading) && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.purchaseButtonGradient}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Lock size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.purchaseButtonText}>
                    {selectedPeriod === 'monthly' ? 'Start Monthly Subscription' : 'Start Yearly Subscription'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore Button */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring || loading}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="rgba(135, 206, 250, 0.9)" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          {/* Fine Print */}
          <Text style={styles.finePrint}>
            Subscription will auto-renew unless cancelled. Cancel anytime in App Store settings.
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
    gap: 12,
    marginBottom: 40,
  },
  billingOption: {
    flex: 1,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  billingOptionSelected: {
    borderColor: 'rgba(135, 206, 250, 0.6)',
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
  },
  billingOptionBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
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
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: 'rgba(135, 206, 250, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
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
    color: 'rgba(135, 206, 250, 0.9)',
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

