import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { ArrowLeft, UserPlus, Lock, Share as ShareIcon, Info, X, Copy, ArrowUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/Theme';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { getUserByTwinCode } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

export default function AddTwinScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = usePremium();
  const [twinCode, setTwinCode] = useState('');
  const [twinCodeError, setTwinCodeError] = useState('');
  const [lookingUpTwin, setLookingUpTwin] = useState(false);
  const [foundTwin, setFoundTwin] = useState<{ userId: string; name: string; code: string } | null>(null);
  const [hasShared, setHasShared] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Check premium status
  if (!isPremium) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.premiumScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Unlock Compatibility 🔮</Text>
            <Text style={styles.subtitle}>Compare your twin with another</Text>

            <View style={styles.mockupContainer}>
              <View style={styles.iphoneFrame}>
                <View style={styles.iphoneScreen}>
                  <View style={styles.iphoneNotch} />
                  
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.mockScroll} scrollEnabled={false}>
                    {/* Mock Header */}
                    <View style={styles.mockHeader}>
                      <Text style={styles.mockHeaderTitle}>Compatibility</Text>
                      <View style={styles.mockHeaderBadge}>
                        <Text style={styles.mockHeaderBadgeText}>PRO</Text>
                      </View>
                    </View>

                    {/* Mock Score Card */}
                    <View style={styles.mockScoreCard}>
                      <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={styles.mockScoreLabel}>Overall Match</Text>
                      <Text style={styles.mockScoreValue}>94%</Text>
                      <View style={styles.mockAvatarsRow}>
                        <Image 
                          source={require('@/assets/images/manwhite.png')} 
                          style={styles.mockAvatarImage}
                          resizeMode="contain"
                        />
                        <View style={styles.mockConnector} />
                        <Image 
                          source={require('@/assets/images/manwhite.png')} 
                          style={[styles.mockAvatarImage, styles.mockAvatarImageFlipped]}
                          resizeMode="contain"
                        />
                      </View>
                    </View>

                    {/* Mock Insight */}
                    <View style={styles.mockInsightCard}>
                      <Text style={styles.mockInsightTitle}>Dynamic ⚡️</Text>
                      <Text style={styles.mockInsightText}>
                        You and Sarah balance each other out perfectly. Your decisive nature complements her analytical approach.
                      </Text>
                    </View>

                    {/* Mock Values */}
                    <View style={styles.mockValuesRow}>
                      <View style={styles.mockValueCard}>
                        <Text style={styles.mockValueLabel}>Values</Text>
                        <Text style={styles.mockValueScore}>High</Text>
                      </View>
                      <View style={styles.mockValueCard}>
                        <Text style={styles.mockValueLabel}>Goals</Text>
                        <Text style={styles.mockValueScore}>Med</Text>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.premiumActionContainer}>
              <View style={styles.lockInfoRow}>
                <Lock size={16} color="#A855F7" />
                <Text style={styles.premiumMiniDescription}>
                  mora+ required for the user running the report (the other twin doesn't need it!)
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/premium');
                }}
                activeOpacity={0.9}
                style={styles.premiumButton}
              >
                <LinearGradient
                  colors={Colors.gradients.purple}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.premiumButtonText}>Upgrade to mora+</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await Share.share({
        message: 'Build your digital twin and see our compatability today! Once signed up, send your mora#.\n\nhttps://apps.apple.com/us/app/mora-simulate-your-life/id6754901842'
      });
      
      setHasShared(true);
      trackEvent(MixpanelEvents.COMPATIBILITY_INVITE_SENT);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  async function handleLookupTwin() {
    if (!twinCode.trim() || twinCode.length !== 6) {
      setTwinCodeError('Enter a valid 6-digit code');
      return;
    }

    if (!user) return;

    setLookingUpTwin(true);
    setTwinCodeError('');
    setFoundTwin(null);

    try {
      const twinProfile = await getUserByTwinCode(twinCode.trim());
      
      if (!twinProfile) {
        setTwinCodeError('Twin code not found');
        setLookingUpTwin(false);
        return;
      }

      if (twinProfile.user_id === user.id) {
        setTwinCodeError('Cannot compare with yourself');
        setLookingUpTwin(false);
        return;
      }

      const twinName = twinProfile.first_name || 'Someone';

      setFoundTwin({
        userId: twinProfile.user_id,
        name: twinName,
        code: twinProfile.twin_code || twinCode.trim()
      });

      trackEvent(MixpanelEvents.COMPATIBILITY_TWIN_FOUND, {
        twin_code: twinCode.trim(),
        twin_name: twinName,
      });
    } catch (error) {
      console.error('Error looking up twin:', error);
      setTwinCodeError('Failed to look up code');
    } finally {
      setLookingUpTwin(false);
    }
  }

  function handleStartTest() {
    if (!foundTwin || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(MixpanelEvents.COMPATIBILITY_TEST_STARTED, {
      twin_user_id: foundTwin.userId,
      twin_name: foundTwin.name,
    });

    router.push({
      pathname: '/compatibility/loading',
      params: {
        twinUserId: foundTwin.userId,
        twinName: foundTwin.name,
        twinCode: foundTwin.code,
      },
    });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowInfoModal(true)}
              style={styles.infoButtonHeader}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Info size={20} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Add Twin 🔗</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>Enter their 6-digit mora#</Text>
          </View>

          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['rgba(45, 212, 191, 0.2)', 'rgba(45, 212, 191, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <UserPlus size={40} color={Colors.gradients.turquoise[0]} strokeWidth={2.5} />
            </LinearGradient>
          </View>

          {!hasShared ? (
            <View style={styles.shareContainer}>
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.9}
                style={styles.shareButton}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.shareButtonContent}>
                  <ShareIcon size={24} color="#FFFFFF" style={styles.shareIcon} />
                  <Text style={styles.shareButtonText}>Invite a Friend</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.shareText}>
                Send them a link to join mora and see your compatibility score! 🔮
              </Text>
            </View>
          ) : (
            <>
              <FloatingLabelInput
                label="6-digit code"
                value={twinCode}
                onChangeText={(text) => {
                  setTwinCode(text);
                  setTwinCodeError('');
                  setFoundTwin(null);
                }}
                maxLength={6}
                keyboardType="number-pad"
                error={twinCodeError}
                returnKeyType="done"
                onSubmitEditing={handleLookupTwin}
              />

              {foundTwin && (
                <View style={styles.foundTwinCard}>
                  <View style={styles.foundTwinContent}>
                    <View style={styles.foundTwinIcon}>
                      <UserPlus size={20} color={Colors.gradients.turquoise[0]} />
                    </View>
                    <View style={styles.foundTwinInfo}>
                      <Text style={styles.foundTwinName}>{foundTwin.name}</Text>
                      <Text style={styles.foundTwinCode}>#{foundTwin.code}</Text>
                    </View>
                  </View>
                </View>
              )}

              {!foundTwin && (
                <TouchableOpacity
                  onPress={handleLookupTwin}
                  disabled={lookingUpTwin || twinCode.length !== 6}
                  style={[
                    styles.lookupButton,
                    (lookingUpTwin || twinCode.length !== 6) && styles.lookupButtonDisabled
                  ]}
                  activeOpacity={0.9}
                >
                  {lookingUpTwin ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.lookupButtonText}>Find Twin</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Start Test Button */}
              {foundTwin && (
                <TouchableOpacity
                  onPress={handleStartTest}
                  activeOpacity={0.9}
                  style={styles.startButton}
                >
                  <LinearGradient
                    colors={Colors.gradients.turquoise}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.startButtonText}>Check Compatibility ⚡️</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <TouchableOpacity 
              onPress={() => setShowInfoModal(false)}
              style={styles.infoModalCloseButton}
            >
              <X size={24} color={Colors.textTertiary} />
            </TouchableOpacity>
            
            <Text style={styles.infoModalTitle}>Where to find it</Text>
            
            <View style={styles.mockProfilePreview}>
              <View style={styles.mockAvatar} />
              <Text style={styles.mockName}>Friend's Name</Text>
              <View style={styles.mockCodeContainer}>
                <Text style={styles.mockCode}>mora#123456</Text>
                <Copy size={12} color={Colors.textTertiary} />
              </View>
              
              <View style={styles.pointerContainer}>
                <ArrowUp size={24} color={Colors.gradients.turquoise[0]} />
                <Text style={styles.pointerText}>It's right here!</Text>
              </View>
            </View>

            <Text style={styles.infoModalText}>
              Your friend can find their 6-digit code on their twin's page, right under their name.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
    paddingLeft: 16,
    paddingRight: 16,
  },
  infoButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mockupContainer: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iphoneFrame: {
    width: 240,
    height: 420,
    backgroundColor: '#1a1a1a',
    borderRadius: 36,
    padding: 8,
    borderWidth: 3,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iphoneScreen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  iphoneNotch: {
    width: 100,
    height: 18,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -50,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  mockScroll: {
    flex: 1,
    padding: 16,
    paddingTop: 32,
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mockHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
  },
  mockHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#A855F7',
    borderRadius: 8,
  },
  mockHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  mockScoreCard: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mockScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  mockScoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
  },
  mockAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockAvatarImage: {
    width: 32,
    height: 32,
  },
  mockAvatarImageFlipped: {
    transform: [{ scaleX: -1 }],
  },
  mockConnector: {
    width: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  mockInsightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  mockInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    fontFamily: Fonts.primary.regular,
  },
  mockInsightText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  mockValuesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mockValueCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  mockValueLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontFamily: Fonts.secondary.bold,
  },
  mockValueScore: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gradients.turquoise[0],
    fontFamily: Fonts.primary.regular,
  },
  premiumActionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  lockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  premiumMiniDescription: {
    fontSize: 13,
    color: '#A855F7',
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 24,
    textAlign: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 32,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareContainer: {
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
  },
  shareText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  shareButton: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shareButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    marginRight: 12,
  },
  shareButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 0.5,
  },
  lookupButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gradients.turquoise[0],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: Colors.gradients.turquoise[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  lookupButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  lookupButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  foundTwinCard: {
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
  },
  foundTwinContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foundTwinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundTwinInfo: {
    flex: 1,
  },
  foundTwinName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
    fontFamily: Fonts.secondary.bold,
  },
  foundTwinCode: {
    fontSize: 14,
    color: Colors.gradients.turquoise[0],
    fontFamily: Fonts.secondary.bold,
  },
  startButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: Colors.gradients.turquoise[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  premiumCard: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 24,
    overflow: 'hidden',
  },
  premiumIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Fonts.primary.regular,
  },
  premiumDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: Fonts.secondary.bold,
  },
  premiumButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.gradients.purple[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  infoModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  infoModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.semibold,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 24,
    marginTop: 8,
  },
  infoModalText: {
    fontSize: 15,
    fontFamily: Fonts.fallback.secondary,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 20,
  },
  mockProfilePreview: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mockAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  mockName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    fontFamily: Fonts.primary.regular,
  },
  mockCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  mockCode: {
    fontSize: 13,
    fontFamily: Fonts.secondary.bold,
    color: Colors.textSecondary,
  },
  pointerContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  pointerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gradients.turquoise[0],
    marginTop: 4,
    fontFamily: Fonts.secondary.bold,
  },
});
