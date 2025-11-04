import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile } from '@/lib/storage';
import { Compass, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { formatDistanceToNow } from 'date-fns';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { checkOnboardingStatus } = useTwin();
  const [userName, setUserName] = useState('there');
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    // Check onboarding status from database
    checkOnboardingStatus(user.id)
      .then(() => {
        const isComplete = useTwin.getState().onboardingComplete;
        if (!isComplete) {
          router.replace('/onboarding/01-now');
          return;
        }
        loadData();
      })
      .catch((error) => {
        console.warn('Failed to confirm onboarding status:', error);
        setIsLoadingDecisions(false);
      });
  }, [user, router, checkOnboardingStatus]);

  async function loadData() {
    if (!user) return;

    try {
      const profile = await getProfile(user.id);
      const profileName = profile?.core_json?.name || profile?.core_json?.primary_role;
      const metadataName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name;

      if (profileName) {
        setUserName(String(profileName).split(' ')[0]);
      } else if (metadataName) {
        setUserName(String(metadataName).split(' ')[0]);
      } else if (user.email) {
        setUserName(user.email.split('@')[0]);
      }

      const decisions = await getDecisions(user.id, 3);
      setRecentDecisions(decisions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoadingDecisions(false);
    }
  }

  function getRelativeUpdate(dateInput?: string | null) {
    if (!dateInput) return 'Tap to revisit';

    try {
      const parsed = new Date(dateInput);
      if (Number.isNaN(parsed.getTime())) {
        return 'Tap to revisit';
      }

      return `Updated ${formatDistanceToNow(parsed, { addSuffix: true })}`;
    } catch (error) {
      console.warn('Failed to format decision timestamp:', error);
      return 'Tap to revisit';
    }
  }

  const echoEntries = recentDecisions.length
    ? recentDecisions.map((decision) => ({
        id: decision.id,
        title: decision.question || 'Untitled Echo',
        subtitle: getRelativeUpdate(decision.updated_at || decision.created_at),
        detail: decision?.prediction?.prediction || 'Revisit this path.',
        route: `/decision/${decision.id}` as const,
        isPlaceholder: false,
      }))
    : [
        {
          id: 'echo-job-offer-placeholder',
          title: 'Job Offer',
          subtitle: 'Last visited 2 days ago',
          detail: 'Compare the paths you saved.',
          isPlaceholder: true,
          route: undefined as string | undefined,
        },
        {
          id: 'echo-career-placeholder',
          title: 'Career Path',
          subtitle: '3 outcomes simulated',
          detail: 'Hop back into your futures.',
          isPlaceholder: true,
          route: undefined as string | undefined,
        },
      ];

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#0C0C10', '#0B0B0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        {/* Purple glow effect */}
        <View style={styles.glowContainer}>
          <LinearGradient
            colors={['rgba(110, 61, 240, 0.15)', 'transparent', 'transparent']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glowEffect}
          />
        </View>

        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.subheading}>Let's explore your next decision.</Text>
            </View>

            <View style={styles.actions}>
              {/* What Should I Choose Card */}
              <TouchableOpacity
                onPress={() => router.push('/decision/new')}
                activeOpacity={0.85}
              >
                <View style={styles.cardWrapperPrimary}>
                  {/* Gradient border - neon purple top-left to dark purple bottom-right */}
                  <LinearGradient
                    colors={['#9D5CFF', '#4A2870', '#1A0F2E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBorder}
                  >
                    <LinearGradient
                      colors={['rgba(10, 5, 20, 0.98)', 'rgba(20, 10, 35, 0.95)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionCard}
                    >
                      <View style={styles.cardContentRow}>
                        <View style={styles.iconCircleContainer}>
                          {/* Neon purple drop-shadow glow */}
                          <View style={styles.iconGlowPrimary} />
                          {/* Gradient ring around the icon */}
                          <LinearGradient
                            colors={["#B77CFF", "#5A2DAE"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconRing}
                          >
                            <View style={styles.iconCirclePrimary}>
                              <Compass size={20} color="#D8C9FF" strokeWidth={2.6} />
                            </View>
                          </LinearGradient>
                        </View>
                        <View style={styles.cardTextContainer}>
                          <Text style={[styles.actionTitlePrimary, styles.actionTitlePrimaryTight]}>What Should{"\n"}I Choose?</Text>
                          <Text style={styles.actionSubtitlePrimary}>
                            Simulate outcomes,
                            {"\n"}compare options.
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </LinearGradient>
                </View>
              </TouchableOpacity>

              {/* What If Card */}
              <TouchableOpacity
                onPress={() => router.push('/whatif/new')}
                activeOpacity={0.85}
              >
                <View style={styles.cardWrapperSecondary}>
                  {/* Gradient border - dark purple top-left to neon purple bottom-right */}
                  <LinearGradient
                    colors={['#1A0F2E', '#4A2870', '#9D5CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBorder}
                  >
                    <LinearGradient
                      colors={['rgba(10, 5, 20, 0.98)', 'rgba(20, 10, 35, 0.95)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionCard}
                    >
                      <View style={styles.cardContentRow}>
                        <View style={styles.iconCircleContainer}>
                          {/* Icon glow effect */}
                          <View style={styles.iconGlow} />
                          <View style={styles.iconCircle}>
                            <Sparkles size={20} color="#E8DCFF" strokeWidth={2.5} />
                          </View>
                        </View>
                        <View style={styles.cardTextContainer}>
                          <Text style={styles.actionTitlePrimary}>What If?</Text>
                          <Text style={styles.actionSubtitlePrimary}>
                            Explore alternate realities
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.echoSection}>
              <Text style={styles.sectionTitle}>Your Echoes</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.echoScrollContent}
                style={styles.echoScrollView}
              >
                {echoEntries.map((echo) => (
                  <TouchableOpacity
                    key={echo.id}
                    style={styles.echoCardWrapper}
                    activeOpacity={echo.route ? 0.8 : 1}
                    onPress={() => {
                      if (echo.route) {
                        router.push(echo.route as any);
                      }
                    }}
                    disabled={!echo.route}
                  >
                    <LinearGradient
                      colors={['rgba(25, 18, 40, 0.85)', 'rgba(35, 25, 55, 0.8)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.echoCard}
                    >
                      <Text style={styles.echoTitle} numberOfLines={1}>
                        {echo.title}
                      </Text>
                      <Text style={styles.echoMeta} numberOfLines={1}>
                        {echo.subtitle}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowEffect: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.8)',
    lineHeight: 20,
  },
  actions: {
    gap: 16,
  },
  cardWrapperPrimary: {},
  cardWrapperSecondary: {},
  cardBorder: {
    borderRadius: 24,
    padding: 1,
    overflow: 'hidden',
  },
  actionCard: {
    borderRadius: 22,
    padding: 22,
    minHeight: 130,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  iconCircleContainer: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  iconGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#9D5CFF',
    shadowColor: '#9D5CFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 16,
    opacity: 0.4,
  },
  iconGlowPrimary: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#B77CFF',
    shadowColor: '#B77CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 18,
    opacity: 0.45,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2.2,
    overflow: 'hidden',
  },
  iconCirclePrimary: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#1A0F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3A1E5F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  actionTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    marginBottom: 6,
    lineHeight: 24,
    fontFamily: 'Inter-SemiBold',
  },
  actionTitlePrimary: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F1EEFF',
    letterSpacing: 0.2,
    lineHeight: 28,
    fontFamily: 'Inter-SemiBold',
  },
  actionTitlePrimaryTight: {
    lineHeight: 24,
  },
  actionSubtitle: {
    fontSize: 13.5,
    color: 'rgba(180, 180, 180, 0.85)',
    lineHeight: 18,
  },
  actionSubtitlePrimary: {
    fontSize: 15,
    color: 'rgba(168, 182, 216, 0.95)',
    lineHeight: 18,
  },
  echoSection: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: 'Inter-SemiBold',
  },
  echoScrollView: {
    marginHorizontal: -20,
  },
  echoScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  echoCardWrapper: {
    width: 180,
  },
  echoCard: {
    borderRadius: 20,
    padding: 18,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  echoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  echoMeta: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.6)',
    lineHeight: 16,
  },
  echoDetail: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(220, 220, 220, 0.7)',
    lineHeight: 16,
  },
});
