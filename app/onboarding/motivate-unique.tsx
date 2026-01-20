import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, Animated, Dimensions, Image } from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { Colors, Fonts } from '@/constants/Theme';
import { Sparkles, Brain, Clock } from 'lucide-react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function MotivateUniqueScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [profileData, setProfileData] = useState<{
    name: string;
    age: number | null;
    values: string[];
    stressResponse: string | null;
    decisionStyle: string | null;
  }>({ name: '', age: null, values: [], stressResponse: null, decisionStyle: null });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadProfile();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      const name = profile?.first_name || 'User';
      
      // Calculate Age
      let age = null;
      const birthYear = profile?.core_json?.onboarding_responses?.['birth-year'];
      if (birthYear) {
        const currentYear = new Date().getFullYear();
        age = currentYear - parseInt(birthYear);
      }
      
      // Get Values
      const values = profile?.values_json || [];
      const topValues = values.slice(0, 3); // Top 3 values

      // Get Stress Response & Decision Style from core_json
      // The onboarding flow saves answers into core_json.onboarding_responses
      const onboardingResponses = profile?.core_json?.onboarding_responses || {};
      
      // Try to find stress response
      const stress = onboardingResponses['stress'] || 
                     onboardingResponses['06-stress'] || 
                     null;
                     
      // Try to find decision/style response
      const style = onboardingResponses['style'] || 
                    onboardingResponses['04-style'] || 
                    onboardingResponses['decision-style'] || 
                    'Analyzing...';

      setProfileData({
        name,
        age,
        values: topValues,
        stressResponse: stress,
        decisionStyle: style
      });
      
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async function handleContinue() {
    // Small delay to show "Continuing" state and prevent double-clicks
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push('/onboarding/04-style');
  }

  return (
    <OnboardingScreen
      title={
        <Text style={styles.titleMain} numberOfLines={1} adjustsFontSizeToFit>Your twin is almost complete</Text>
      }
      subtitle="Your twin is being built based on your unique profile."
      subtitleStyle={{
        maxWidth: 300,
        textAlign: 'center',
        alignSelf: 'center',
        fontFamily: Fonts.secondary.regular,
      }}
      onNext={handleContinue}
      nextLabel="Continue"
      progress={0.60}
      buttonShadowColor="#25729f"
      is3DButton={true}
    >
      <View style={styles.container}>
        {/* Decorative Background Elements */}
        <View style={styles.backgroundBlob1} />
        <View style={styles.backgroundBlob2} />

        <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.8)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>BUILDING TWIN</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={styles.statIconContainer3D}>
                <Image
                  source={require('@/assets/images/manwhite.png')}
                  style={styles.profileImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Identity</Text>
                <Text style={styles.statValue}>
                  {profileData.name}
                  {profileData.age ? `, ${profileData.age}` : ''}
                </Text>
              </View>
            </View>

            {profileData.values.length > 0 && (
              <View style={styles.statRow}>
                <View style={styles.statIconContainer3D}>
                  <LinearGradient
                    colors={[Colors.gradients.turquoise[0], Colors.gradients.turquoise[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Brain size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Core Values</Text>
                  <Text style={styles.statValue}>
                    {profileData.values.join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {profileData.stressResponse && (
              <View style={styles.statRow}>
                <View style={styles.statIconContainer3D}>
                  <LinearGradient
                    colors={[Colors.gradients.peach[0], Colors.gradients.peach[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Clock size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Stress Response</Text>
                  <Text style={styles.statValue}>
                    {profileData.stressResponse}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.statRow}>
              <View style={styles.statIconContainer3D}>
                <LinearGradient
                  colors={[Colors.gradients.purple[1], Colors.gradients.purple[0]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Decision Making Style</Text>
                <Text style={styles.statValue}>
                  {profileData.decisionStyle || 'Analyzing...'}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Sparkles size={16} color={Colors.textSecondary} />
              <Text style={styles.footerText}>Optimizing neural pathways...</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    position: 'relative',
  },
  titleMain: {
    fontSize: 26,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  backgroundBlob1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(192, 132, 252, 0.2)', // Purple
    zIndex: -1,
  },
  backgroundBlob2: {
    position: 'absolute',
    bottom: 50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(107, 202, 154, 0.15)', // Turquoise
    zIndex: -1,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80', // Green
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
  },
  statsTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconContainer3D: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
    fontFamily: Fonts.secondary.bold,
  },
  statValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
