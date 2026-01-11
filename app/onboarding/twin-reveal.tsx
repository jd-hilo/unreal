import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile, getRelationships, getUserInterests, ensureTwinCode } from '@/lib/storage';
import {
  Brain,
  Heart,
  Compass,
  Sparkles,
  MapPin,
  ChevronRight,
  Zap,
  Target,
  Users,
  Briefcase,
  User,
  Flag,
  Activity
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import { useTypewriter } from '@/hooks/useTypewriter';

const { width } = Dimensions.get('window');

export default function TwinRevealScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [twinCode, setTwinCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const imageFadeAnim = useRef(new Animated.Value(0)).current;
  const imageSlideAnim = useRef(new Animated.Value(20)).current;

  // Generate unique percentage once
  const uniquePercentage = useMemo(() => {
    return Math.floor(Math.random() * (40 - 10 + 1)) + 10;
  }, []);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (!loading && profile) {
      // Trigger animations
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(imageFadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(imageSlideAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ]).start();
    }
  }, [loading, profile]);

  async function loadData() {
    if (!user) return;

    try {
      const [profileData, relsData, interestsData, code] = await Promise.all([
        getProfile(user.id),
        getRelationships(user.id),
        getUserInterests(user.id),
        ensureTwinCode(user.id)
      ]);

      setProfile(profileData);
      setRelationships(relsData || []);
      setInterests(interestsData || []);
      setTwinCode(code);

      // Track the reveal view
      trackEvent(MixpanelEvents.SCREEN_VIEWED, {
        screen_name: 'Twin Reveal',
        has_profile: !!profileData,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.BUTTON_CLICKED, {
      button_name: 'Explore Your Life',
      screen: 'Twin Reveal',
    });

    // Navigate to main app
    router.replace('/(tabs)/home');
  }

  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Creating your digital twin...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Extract data from profile
  const onboardingResponses = profile?.core_json?.onboarding_responses || {};
  const firstName = profile?.first_name || 'Friend';
  const hometown = profile?.hometown || profile?.current_location || 'Unknown';
  const birthYear = profile?.birth_year;
  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : null;

  const coreValues = onboardingResponses['01-values'] || onboardingResponses['03-values'] || '';
  const decisionStyle = onboardingResponses['04-style'] || 'Balanced';
  const stressResponse = onboardingResponses['06-stress'];
  
  // Format interests for display
  const topInterests = interests.slice(0, 5).map(i => i.item_name).join(', ');

  // Determine status (simple logic for now)
  const status = relationships.length > 0 ? 'Connected' : 'Single';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section (Now inside ScrollView) */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              {/* Name */}
              <View style={styles.nameRow}>
                <Text style={styles.headerName}>{firstName}.</Text>
              </View>
              
              {/* Location */}
              <Text style={styles.headerLocation}>{hometown}</Text>
              
              {/* Statistics Tags Row */}
              <View style={styles.tagsRow}>
                {age && (
                  <HeaderTag 
                    icon={<User size={10} color="#696969" />}
                    text={`Age ${age}`}
                  />
                )}
                <HeaderTag 
                  icon={<Heart size={10} color="#696969" />}
                  text={status}
                />
                <HeaderTag 
                  icon={<Activity size={10} color="#696969" />}
                  text={`Top ${uniquePercentage}%`}
                />
              </View>
            </View>

            {/* Right Side - Mannequin and Code */}
            <View style={styles.headerRight}>
              <Text style={styles.twinCodeText}>mora#: {twinCode}</Text>
              <Animated.View 
                style={[
                  styles.headerImageContainer,
                  {
                    opacity: imageFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.4], // Max opacity 0.4
                    }),
                    transform: [{ translateY: imageSlideAnim }]
                  }
                ]}
              >
                <Image 
                  source={require('@/assets/images/manwhite.png')} 
                  style={[styles.headerImage, { transform: [{ scaleX: -1 }] }]} // Flipped image
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </View>

          {/* Cards Section */}
          <View style={styles.cardsContainer}>
            {/* Mindset Card (Replaces Journey) */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: Colors.gradients.turquoise[0] + '20' }]}>
                    <Brain size={22} color={Colors.gradients.turquoise[0]} strokeWidth={2} />
                  </View>
                  <Text style={styles.cardTitle}>Mindset</Text>
                </View>
                
                <View style={styles.section}>
                  <Text style={styles.label}>Decision Style</Text>
                  <Text style={styles.text}>{decisionStyle}</Text>
                </View>

                {stressResponse && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Under Stress</Text>
                    <Text style={styles.text}>{stressResponse}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Core Values Card */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <CoreValuesCard values={coreValues} />
            </Animated.View>

            {/* Interests Card */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: Colors.gradients.purple[0] + '20' }]}>
                    <Sparkles size={22} color={Colors.gradients.purple[0]} strokeWidth={2} />
                  </View>
                  <Text style={styles.cardTitle}>Interests</Text>
                </View>
                {topInterests ? (
                  <Text style={styles.text}>{topInterests}</Text>
                ) : (
                  <Text style={[styles.text, { color: Colors.textTertiary, fontStyle: 'italic' }]}>
                    No interests added yet
                  </Text>
                )}
              </View>
            </Animated.View>

            {/* Relationships Card */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: Colors.gradients.peach[0] + '20' }]}>
                    <Users size={22} color={Colors.gradients.peach[0]} strokeWidth={2} />
                  </View>
                  <Text style={styles.cardTitle}>Relationships</Text>
                </View>
                {relationships.length > 0 ? (
                  <View style={styles.tagsContainer}>
                    {relationships.slice(0, 5).map((rel, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{rel.name}</Text>
                      </View>
                    ))}
                    {relationships.length > 5 && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>+{relationships.length - 5} more</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.text, { color: Colors.textTertiary, fontStyle: 'italic' }]}>
                    Add relationships to explore social dynamics
                  </Text>
                )}
              </View>
            </Animated.View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* CTA Button */}
        <Animated.View
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.9}
            style={styles.ctaButton}
          >
            <LinearGradient
              colors={Colors.gradients.turquoise}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Explore Your Life</Text>
              <View style={styles.sliderThumb}>
                <LinearGradient 
                  colors={['#FFFFFF', 'rgba(255,255,255,0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.thumbGradient}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// Helper Components

function HeaderTag({ icon, text }: { icon: any, text: string }) {
  return (
    <LinearGradient
      colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerTag}
    >
      {icon}
      <Text style={styles.headerTagText}>{text}</Text>
    </LinearGradient>
  );
}

function CoreValuesCard({ values }: { values: string }) {
  const valuesList = values
    .split(/[,\n]/)
    .map(v => v.trim())
    .filter(v => v.length > 0)
    .slice(0, 6);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: Colors.gradients.peach[0] + '20' }]}>
          <Heart size={22} color={Colors.gradients.peach[0]} strokeWidth={2} />
        </View>
        <Text style={styles.cardTitle}>Core Values</Text>
      </View>
      <View style={styles.tagsContainer}>
        {valuesList.map((value, index) => (
          <View key={index} style={styles.valuePill}>
            <Text style={styles.valuePillText}>{value}</Text>
          </View>
        ))}
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.secondary.bold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  
  // Header Section
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 32,
    marginBottom: 32,
    height: 200,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: -0.5,
  },
  headerLocation: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  headerTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
  },
  headerTagText: {
    fontFamily: Fonts.secondary.bold, // Using theme font for consistency
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 15,
    color: '#696969',
  },
  headerRight: {
    width: 280, // 2x bigger width
    height: '140%', // Allow it to overflow or be taller
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute', // Position absolutely to overlay/allow size
    right: -40, // Shift right to keep it in corner
    bottom: -60, // Lower position
    zIndex: -1, // Ensure text stays on top if needed, but here text is in headerRight
  },
  headerImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    // Opacity is handled by animated value
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  twinCodeText: {
    position: 'absolute',
    top: 60, // Position over forehead area
    alignSelf: 'center', // Center horizontally in the container
    fontSize: 14,
    color: 'rgba(0,0,0,0.3)', // Light gray
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    zIndex: 10,
    letterSpacing: 1,
  },

  // Cards
  cardsContainer: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
  },
  text: {
    fontSize: 17,
    color: Colors.textPrimary,
    lineHeight: 26,
    fontFamily: Fonts.primary.regular,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tagText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  valuePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  valuePillText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  ctaButton: {
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: Colors.gradients.turquoise[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 32,
    paddingRight: 8,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  sliderThumb: {
    width: 80,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  thumbGradient: {
    flex: 1,
    opacity: 0.9,
  },
});
