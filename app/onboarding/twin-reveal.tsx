import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Animated, Image, Dimensions, Clipboard } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile, getRelationships, getUserInterests, ensureTwinCode } from '@/lib/storage';
import { generateUniquenessDescription, generateTwinArchetype, TwinArchetypeResult, generateOneYearSimulationVariants, OneYearSimulationVariant } from '@/lib/ai';
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
  Activity,
  CheckCircle2,
  Circle as CircleIcon,
  Copy
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { LigatureFreeText } from '@/components/LigatureFreeText';
import {
  getLifeSituationDisplay,
  getCoreValuesDisplay,
  getHealthWellnessSummary,
  getHealthStressSummary,
} from '@/lib/twinInsights';

const { width } = Dimensions.get('window');
const RELATIONSHIP_GRAPH_HEIGHT = 220;
const GRAPH_CONTENT_WIDTH = 600;
const SATELLITE_SIZE = 50;

// Helper function to truncate text
function truncateText(text: string | undefined, maxLength: number = 60): string {
  if (!text) return 'Not set';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Helper function to get relationship emoji
function getRelationshipEmoji(relationshipType: string): string {
  const type = relationshipType?.toLowerCase() || '';
  if (type.includes('partner') || type.includes('spouse')) return '❤️';
  if (type.includes('family') || type.includes('parent') || type.includes('sibling') || type.includes('child')) return '👨‍👩‍👧‍👦';
  if (type.includes('coworker') || type.includes('boss') || type.includes('colleague') || type.includes('business')) return '💼';
  if (type.includes('mentor')) return '🎓';
  if (type.includes('friend')) return '👤';
  return '👤';
}

const satellitePositions = [
  { x: -110, y: -25 },
  { x: -75, y: -55 },
  { x: -30, y: -75 },
  { x: 30, y: -75 },
  { x: 75, y: -55 },
  { x: 110, y: -25 },
];

export default function TwinRevealScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [twinCode, setTwinCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uniquenessDescription, setUniquenessDescription] = useState<string>('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [archetype, setArchetype] = useState<TwinArchetypeResult | null>(null);
  const [simulationVariants, setSimulationVariants] = useState<OneYearSimulationVariant[]>([]);
  const [loadingSimulations, setLoadingSimulations] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const imageFadeAnim = useRef(new Animated.Value(0)).current;
  const imageSlideAnim = useRef(new Animated.Value(20)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  // Generate unique percentage once
  const uniquePercentage = useMemo(() => {
    return Math.floor(Math.random() * (40 - 10 + 1)) + 10;
  }, []);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - twin-reveal');
    }, [])
  );

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }
    loadData();
  }, [user]);

  useEffect(() => {
    // Start animations immediately, even if still loading
    // This ensures content is visible
    Animated.parallel([
      // Content animations
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
      // Image animations (sync with content)
      Animated.timing(imageFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(imageSlideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start arrow animation after initial animations complete
      const arrowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(arrowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      arrowAnimation.start();
    });
  }, []); // Run once on mount

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

      // Generate archetype and simulation variants
      if (profileData) {
        // Handle Archetype
        const existingArchetype = (profileData.core_json as any)?.twin_archetype;
        
        if (existingArchetype) {
          setArchetype(existingArchetype);
          setLoadingDescription(false);
        } else {
          setLoadingDescription(true);
          generateTwinArchetype(profileData)
            .then(result => {
              if (result) {
                setArchetype(result);
              } else {
                console.warn('Archetype generation returned null/undefined');
                setLoadingDescription(false);
              }
            })
            .catch(error => {
              console.error('Failed to generate archetype/narrative:', error);
              setLoadingDescription(false);
              // Set a fallback archetype so the UI doesn't break
              setArchetype({
                title: 'Your Digital Twin',
                description: 'Your unique decision-making profile is being finalized.',
                traits: {
                  logic: 50,
                  intuition: 30,
                  emotion: 20,
                },
              });
            })
            .finally(() => {
              setLoadingDescription(false);
            });
        }

        // Handle Simulations
        setLoadingSimulations(true);
        generateOneYearSimulationVariants(profileData)
          .then(variants => {
            // Only set variants if we successfully got them (not fallback)
            if (variants && variants.length > 0) {
              setSimulationVariants(variants);
            }
          })
          .catch(error => {
            console.error('Failed to generate simulations:', error);
            // Don't set variants on error - leave empty array
            setSimulationVariants([]);
          })
          .finally(() => {
            setLoadingSimulations(false);
          });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.BUTTON_CLICKED, {
      button_name: 'Continue',
      screen: 'Twin Reveal',
    });

    // Navigate to dream self welcome
    router.replace('/onboarding/dream-self/welcome');
  }

  function handleCopyTwinCode() {
    if (!twinCode) return;
    try {
      Clipboard.setString(twinCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  function handleCardPress(card: { route?: any }) {
    if (card.route) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(card.route);
    }
  }

  // Extract data from profile (with fallbacks for when data is still loading)
  const onboardingResponses = profile?.core_json?.onboarding_responses || {};
  const coreJson = profile?.core_json || {};
  const firstName = profile?.first_name || 'Friend';
  const hometown = profile?.hometown || profile?.current_location || 'Unknown';
  const relationshipStatus = profile?.relationship_details?.status || 'Not set';
  
  // Try multiple possible locations and keys for birth year
  let birthYearStr = onboardingResponses['birth-year'] || 
                     onboardingResponses['birth_year'] || 
                     onboardingResponses['birthYear'] ||
                     coreJson['birth-year'] ||
                     coreJson['birth_year'] ||
                     coreJson['birthYear'] ||
                     // @ts-ignore - Check top level just in case
                     profile?.birth_year ||
                     null;

  // Clean the string to ensure we get a valid year
  if (birthYearStr) {
    birthYearStr = String(birthYearStr).replace(/[^0-9]/g, '');
  }

  const birthYear = birthYearStr ? parseInt(birthYearStr, 10) : null;
  const currentYear = new Date().getFullYear();
  const age = birthYear && !isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear 
    ? currentYear - birthYear 
    : null;
  
  // Debug logging
  if (__DEV__) {
    console.log('Age calculation:', {
      birthYearStr,
      birthYear,
      currentYear,
      age,
      onboardingResponseKeys: Object.keys(onboardingResponses),
      coreJsonKeys: Object.keys(coreJson),
      fullOnboardingResponses: onboardingResponses,
      profileKeys: Object.keys(profile || {})
    });
  }

  const lifeSituationResp = getLifeSituationDisplay(profile || {});
  const lifeJourneyResp = profile?.life_journey ?? onboardingResponses['02-path'];
  const coreValuesResp = getCoreValuesDisplay(profile || {});
  const healthWellness = getHealthWellnessSummary(onboardingResponses as Record<string, unknown>);
  const healthStress = getHealthStressSummary(onboardingResponses as Record<string, unknown>);

  // Build mindset cards exactly like profile page
  const mindsetCards = [
    { 
      id: '02-now', 
      title: 'Life Situation', 
      subtitle: lifeSituationResp ? truncateText(lifeSituationResp, 80) : 'Where are you now?', 
      route: '/profile/edit-lifesituation' as any,
      completed: !!lifeSituationResp, 
      icon: User 
    },
    { 
      id: '02-path', 
      title: 'Life Journey', 
      subtitle: lifeJourneyResp ? truncateText(lifeJourneyResp, 80) : 'How did you get here?', 
      route: '/profile/edit-lifejourney' as any,
      completed: !!lifeJourneyResp, 
      icon: Briefcase 
    },
    { 
      id: '01-values', 
      title: 'Core Values', 
      subtitle: coreValuesResp ? truncateText(coreValuesResp, 80) : 'What matters most?', 
      route: '/profile/edit-values' as any,
      completed: !!coreValuesResp, 
      icon: Heart 
    },
    { 
      id: '04-style', 
      title: 'Decision Style', 
      subtitle: onboardingResponses['04-style'] ? truncateText(onboardingResponses['04-style'], 80) : 'How do you decide?', 
      route: '/profile/edit-decisionstyle' as any,
      completed: !!onboardingResponses['04-style'], 
      icon: Brain 
    },
    { 
      id: 'health-wellness', 
      title: 'Health & energy', 
      subtitle: healthWellness.text ? truncateText(healthWellness.text, 80) : 'Activity, sleep, diet, energy', 
      route: '/profile/edit-health-wellbeing' as any,
      completed: healthWellness.completed, 
      icon: Activity 
    },
    { 
      id: 'health-stress', 
      title: 'Stress level', 
      subtitle: healthStress.text ? truncateText(healthStress.text, 80) : 'How stress shows up for you', 
      route: '/profile/edit-health-wellbeing' as any,
      completed: healthStress.completed, 
      icon: Zap 
    },
  ];

  // Mindset Section - Grid Layout
  const renderMindset = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mindset</Text>
      <View style={styles.gridContainer}>
        {mindsetCards.map((card) => (
          <TouchableOpacity 
            key={card.id} 
            style={styles.gridCard}
            onPress={() => handleCardPress(card)}
            activeOpacity={0.8}
          >
            <View style={styles.gridIcon}>
              {card.icon && <card.icon size={24} color={card.completed ? '#4ADE80' : Colors.textTertiary} />}
            </View>
            <Text style={styles.gridTitle}>{card.title}</Text>
            {card.subtitle && (
              <Text style={styles.gridSubtitle} numberOfLines={2}>{card.subtitle}</Text>
            )}
            <View style={styles.gridStatus}>
              {card.completed ? <CheckCircle2 size={16} color="#4ADE80" /> : <CircleIcon size={16} color={Colors.textTertiary} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 1-Year Simulations Section
  const renderSimulations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Potential 1-Year Simulations</Text>
      {loadingSimulations ? (
        <View style={styles.simulationLoadingContainer}>
          <Activity size={24} color={Colors.gradients.turquoise[0]} />
          <Text style={styles.simulationLoadingText}>Generating simulations...</Text>
        </View>
      ) : simulationVariants.length > 0 ? (
        <View style={styles.simulationsContainer}>
          {simulationVariants.map((variant) => (
            <View key={variant.variant} style={styles.simulationCard}>
              <View style={styles.simulationHeader}>
                <Text style={styles.simulationVariantLabel}>Variant {variant.variant}</Text>
                <View style={styles.probabilityBadge}>
                  <Text style={styles.probabilityText}>{variant.probability}%</Text>
                </View>
              </View>
              <LigatureFreeText 
                text={variant.description} 
                style={styles.simulationDescription} 
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  // Archetype Section
  const renderArchetype = () => (
    <View style={styles.section}>
      <View style={styles.uniqueCard}>
        {loadingDescription ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Activity size={24} color={Colors.gradients.turquoise[0]} />
            <LigatureFreeText 
              text="Finalizing your digital twin..." 
              style={[styles.uniqueText, { marginTop: 12, textAlign: 'center', letterSpacing: 1 }]} 
            />
          </View>
        ) : archetype ? (
          <>
            <View style={styles.archetypeHeader}>
              <View style={styles.archetypeIconContainer}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.archetypeIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.archetypeLabel}>TWIN ARCHETYPE</Text>
            </View>
            
            <LigatureFreeText text={archetype.title} style={styles.archetypeTitle} />
            <LigatureFreeText text={archetype.description} style={styles.archetypeDescription} />

            <View style={styles.decisionDnaContainer}>
              <View style={styles.dnaHeaderRow}>
                <Text style={styles.dnaLabel}>Decision DNA</Text>
              </View>
              
              {/* Logic Bar */}
              <View style={styles.dnaRow}>
                <Text style={styles.dnaRowLabel}>Logic</Text>
                <View style={styles.dnaBarContainer}>
                  <View style={[styles.dnaBar, { width: `${archetype.traits.logic}%`, backgroundColor: '#8EC5FC' }]} />
                </View>
                <Text style={styles.dnaValue}>{archetype.traits.logic}%</Text>
              </View>

              {/* Intuition Bar */}
              <View style={styles.dnaRow}>
                <Text style={styles.dnaRowLabel}>Intuition</Text>
                <View style={styles.dnaBarContainer}>
                  <View style={[styles.dnaBar, { width: `${archetype.traits.intuition}%`, backgroundColor: '#6BCA9A' }]} />
                </View>
                <Text style={styles.dnaValue}>{archetype.traits.intuition}%</Text>
              </View>

              {/* Emotion Bar */}
              <View style={styles.dnaRow}>
                <Text style={styles.dnaRowLabel}>Emotion</Text>
                <View style={styles.dnaBarContainer}>
                  <View style={[styles.dnaBar, { width: `${archetype.traits.emotion}%`, backgroundColor: '#E87A7F' }]} />
                </View>
                <Text style={styles.dnaValue}>{archetype.traits.emotion}%</Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              {/* Name */}
              <View style={styles.nameRow}>
                <Text style={styles.headerName}>{firstName}</Text>
              </View>
              
              {/* Location with Icon */}
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.textSecondary} />
                <Text style={styles.headerLocation}>{hometown}</Text>
              </View>
              
              {/* Statistics Tags Row */}
              <View style={styles.tagsRow}>
                {relationshipStatus && relationshipStatus !== 'Not set' && (
                  <HeaderTag 
                    icon={<Heart size={10} color="#696969" />}
                    text={relationshipStatus}
                  />
                )}
                {age !== null && age !== undefined && (
                  <HeaderTag 
                    icon={<User size={10} color="#696969" />}
                    text={`Age ${age}`}
                  />
                )}
              </View>
            </View>

            {/* Right Side - Mannequin and Code */}
            <View style={styles.headerRight}>
              <View style={styles.twinCodeContainer}>
                <Text style={styles.twinCodeText}>mora#: {twinCode}</Text>
                <TouchableOpacity 
                  onPress={handleCopyTwinCode}
                  activeOpacity={0.7}
                  style={styles.copyButton}
                >
                  <Copy size={14} color="rgba(0,0,0,0.15)" />
                </TouchableOpacity>
              </View>
              <Animated.View 
                style={[
                  styles.headerImageContainer,
                  {
                    opacity: imageFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.4],
                    }),
                    transform: [{ translateY: imageSlideAnim }]
                  }
                ]}
              >
                <Image 
                  source={require('@/assets/images/manwhite.png')} 
                  style={[styles.headerImage, { transform: [{ scaleX: -1 }] }]}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </View>

          {/* Content Sections */}
          <View style={styles.sectionsContainer}>
            {/* Archetype Section */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {renderArchetype()}
            </Animated.View>

            {/* Mindset Section - Grid Layout */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {renderMindset()}
            </Animated.View>

            {/* 1-Year Simulations Section */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {renderSimulations()}
            </Animated.View>

            {/* Bottom spacing */}
            <View style={{ height: 100 }} />
          </View>
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
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.ctaButtonWrapper,
              {
                shadowColor: '#25729f',
                transform: [{ translateY: pressed ? 2 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                shadowOpacity: pressed ? 0.3 : 0.5,
                shadowRadius: pressed ? 8 : 20,
                elevation: pressed ? 4 : 12,
              }
            ]}
          >
            <LinearGradient
              colors={['#25729f', '#62edb9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.ctaButtonGradient}
            >
              <Text style={styles.ctaText}>Continue</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
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
    letterSpacing: 1,
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
    position: 'relative',
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 16,
    zIndex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    zIndex: 2,
  },
  headerName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: -0.5,
    zIndex: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerLocation: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
  },
  headerAge: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
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
    fontFamily: Fonts.secondary.bold,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 15,
    color: '#696969',
  },
  headerRight: {
    width: 280,
    height: '140%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: -40,
    bottom: -60,
    zIndex: 0,
  },
  headerImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  twinCodeContainer: {
    position: 'absolute',
    top: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  twinCodeText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.15)',
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
  },
  copyButton: {
    padding: 4,
  },

  // Sections Container
  sectionsContainer: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },

  // Unique Card (Now Archetype Card)
  uniqueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  uniqueText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
    letterSpacing: 1,
  },
  archetypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  archetypeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  archetypeIconImage: {
    width: 20,
    height: 20,
  },
  archetypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  archetypeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular, // Recoleta for the big title
    marginBottom: 12,
    lineHeight: 38,
  },
  archetypeDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
    lineHeight: 24,
    marginBottom: 24,
    letterSpacing: 1.5,
  },
  decisionDnaContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
  },
  dnaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dnaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  estDaysBadge: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  estDaysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  dnaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  dnaRowLabel: {
    width: 70,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    flexShrink: 0,
  },
  dnaBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dnaBar: {
    height: '100%',
    borderRadius: 4,
  },
  dnaValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    flexShrink: 0,
  },

  // Mindset Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  gridIcon: {
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 15,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  gridSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
    color: Colors.textTertiary,
    lineHeight: 16,
    marginBottom: 8,
    flex: 1,
  },
  gridStatus: {
    alignSelf: 'flex-end',
  },

  // Relationships Graph
  relationshipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  graphContainer: {
    height: RELATIONSHIP_GRAPH_HEIGHT,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralNode: {
    position: 'absolute',
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralNodeInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  satellite: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: SATELLITE_SIZE,
  },
  satelliteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 4,
  },
  satelliteEmoji: {
    fontSize: 18,
  },
  satelliteName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    width: 70,
  },

  // Simulation Variants
  simulationLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulationLoadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.primary.regular,
  },
  simulationsContainer: {
    gap: 16,
  },
  simulationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  simulationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  simulationVariantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  probabilityBadge: {
    backgroundColor: Colors.gradients.turquoise[0] + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gradients.turquoise[0] + '30',
  },
  probabilityText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gradients.turquoise[0],
    fontFamily: Fonts.secondary.bold,
  },
  simulationDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },

  // CTA Button
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  ctaButtonWrapper: {
    borderRadius: 28,
    overflow: 'visible',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 28,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
