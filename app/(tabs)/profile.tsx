import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, Clipboard } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CheckCircle2, Circle, Edit3, ChevronRight, BookOpen, Copy } from 'lucide-react-native';
import { getProfile, getTodayJournal, getRelationships, deleteAccountData, ensureTwinCode } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTextScramble } from '@/hooks/useTextScramble';
import * as Haptics from 'expo-haptics';

interface ProfileCard {
  id: string;
  title: string;
  subtitle: string;
  onboardingStep?: string;
  route?: string;
  completed: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const { isPremium, setPremium } = useTwin();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [journalComplete, setJournalComplete] = useState(false);
  const [hasRelationships, setHasRelationships] = useState(false);
  const [twinCode, setTwinCode] = useState<string>('');
  const animatedTwinCode = useTextScramble(twinCode, 1500);

  // Reload profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [user])
  );

  useEffect(() => {
    loadProfileData();
  }, [user]);

  async function loadProfileData() {
    if (!user) return;
    
    try {
      const [profile, todayJournal, relationships, code] = await Promise.all([
        getProfile(user.id),
        getTodayJournal(user.id),
        getRelationships(user.id),
        ensureTwinCode(user.id)
      ]);
      setProfileData(profile);
      setJournalComplete(!!todayJournal);
      setHasRelationships(relationships && relationships.length > 0);
      setTwinCode(code);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyTwinCode() {
    if (!twinCode) return;
    
    try {
      Clipboard.setString(twinCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Your unreal# has been copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
  const university = profileData?.university || onboardingResponses.university;
  const hometown = profileData?.hometown || onboardingResponses.hometown;
  const currentLocation = profileData?.current_location;
  const netWorth = profileData?.net_worth;
  const politicalViews = profileData?.political_views;

  const cards: ProfileCard[] = [
    {
      id: '01-now',
      title: 'Current Life Situation',
      subtitle: onboardingResponses['01-now'] 
        ? onboardingResponses['01-now'].substring(0, 50) + '...'
        : 'Where are you in life right now?',
      route: '/profile/edit-lifesituation' as any,
      completed: !!onboardingResponses['01-now'],
    },
    {
      id: '02-path',
      title: 'Life Journey',
      subtitle: onboardingResponses['02-path']
        ? onboardingResponses['02-path'].substring(0, 50) + '...'
        : 'How did you get here?',
      route: '/profile/edit-lifejourney' as any,
      completed: !!onboardingResponses['02-path'],
    },
    {
      id: '03-values',
      title: 'Core Values',
      subtitle: onboardingResponses['03-values']
        ? onboardingResponses['03-values'].substring(0, 50) + '...'
        : 'What matters most to you?',
      route: '/profile/edit-values' as any,
      completed: !!onboardingResponses['03-values'],
    },
    {
      id: '04-style',
      title: 'Decision-Making Style',
      subtitle: onboardingResponses['04-style']
        ? onboardingResponses['04-style'].substring(0, 50) + '...'
        : 'How do you usually make big decisions?',
      route: '/profile/edit-decisionstyle' as any,
      completed: !!onboardingResponses['04-style'],
    },
    {
      id: '05-day',
      title: 'Typical Day',
      subtitle: onboardingResponses['05-day']
        ? onboardingResponses['05-day'].substring(0, 50) + '...'
        : 'Walk me through a typical day',
      route: '/profile/edit-typicalday' as any,
      completed: !!onboardingResponses['05-day'],
    },
    {
      id: '06-stress',
      title: 'Stress Response',
      subtitle: onboardingResponses['06-stress']
        ? onboardingResponses['06-stress'].substring(0, 50) + '...'
        : 'When things get hard, how do you react?',
      route: '/profile/edit-stress' as any,
      completed: !!onboardingResponses['06-stress'],
    },
    {
      id: 'university',
      title: 'Education',
      subtitle: university || 'Add your university',
      route: '/profile/edit-university' as any,
      completed: !!university,
    },
    {
      id: 'hometown',
      title: 'Hometown',
      subtitle: hometown || 'Where did you grow up?',
      route: '/profile/edit-hometown' as any,
      completed: !!hometown,
    },
    {
      id: 'current_location',
      title: 'Current Location',
      subtitle: currentLocation || 'Where do you live now?',
      route: '/profile/edit-location' as any,
      completed: !!currentLocation,
    },
    {
      id: 'net_worth',
      title: 'Net Worth',
      subtitle: netWorth || 'Your approximate net worth',
      route: '/profile/edit-networth' as any,
      completed: !!netWorth,
    },
    {
      id: 'political_views',
      title: 'Political Views',
      subtitle: politicalViews || 'Your political perspective',
      route: '/profile/edit-politics' as any,
      completed: !!politicalViews,
    },
    {
      id: 'relationships',
      title: 'Relationships',
      subtitle: hasRelationships 
        ? 'Manage your relationships'
        : 'Add people who influence your decisions',
      route: '/relationships',
      completed: hasRelationships,
    },
  ];

  const completedCount = cards.filter(card => card.completed).length;
  const totalProgress = Math.round((completedCount / cards.length) * 100);

  function handleCardPress(card: ProfileCard) {
    if (card.onboardingStep) {
      router.push(card.onboardingStep as any);
    } else if (card.route) {
      router.push(card.route as any);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    Alert.alert(
      'Delete Account',
      'This will permanently remove your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountData(user.id);
              await signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.title}>unreal#: {animatedTwinCode || '------'}</Text>
              {twinCode && (
                <TouchableOpacity 
                  onPress={handleCopyTwinCode}
                  style={styles.copyButton}
                  activeOpacity={0.7}
                >
                  <Copy size={20} color="#B795FF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Twin's Understanding Card */}
            <TouchableOpacity
              style={styles.progressCard}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(15, 10, 30, 0.95)', 'rgba(25, 15, 45, 0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.progressCardInner}
              >
                <View style={styles.progressHeader}>
                  <View style={styles.compassIcon}>
                    <Image 
                      source={require('@/assets/images/cube.png')}
                      style={styles.cubeIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.progressTitle}>Twin's Understanding</Text>
                </View>
                <View style={styles.gradientProgressBar}>
                  <LinearGradient
                    colors={['#B795FF', '#8A5CFF', '#6E3DF0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${totalProgress}%` }]}
                  />
                </View>
                <Text style={styles.progressSubtitle}>
                  {completedCount} of {cards.length} sections complete • {totalProgress}%
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Mannequin head between cards */}
            <View style={styles.mannequinContainer}>
              <Image 
                source={require('@/app/profileman.png')}
                style={styles.mannequinImage}
                resizeMode="contain"
              />
            </View>

            {/* Daily Journal Card */}
            <TouchableOpacity
              style={styles.journalCard}
              onPress={() => router.push('/journal' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(15, 10, 30, 0.95)', 'rgba(25, 15, 45, 0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.journalCardInner}
              >
                <View style={styles.journalRow}>
                  <View style={styles.journalIconContainer}>
                    <BookOpen size={24} color="#B795FF" strokeWidth={2} />
                  </View>
                  <View style={styles.journalContent}>
                    <Text style={styles.journalTitle}>Daily Journal</Text>
                    <Text style={styles.journalSubtitle}>
                      {journalComplete 
                        ? "Today's journal complete"
                        : "Journal your days and help your twin understand you"
                      }
                    </Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Profile sections */}
            <View style={styles.cards}>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.card}
                  onPress={() => handleCardPress(card)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardIconContainer}>
                    {card.completed ? (
                      <CheckCircle2 size={20} color="#B795FF" strokeWidth={2.5} />
                    ) : (
                      <Circle size={20} color="rgba(150, 150, 150, 0.6)" strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {card.subtitle}
                    </Text>
                  </View>
                  <View style={styles.cardAction}>
                    <Edit3 size={18} color="rgba(150, 150, 150, 0.6)" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutButton}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={styles.deleteButton}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
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
    backgroundColor: '#0C0C10',
  },
  mannequinContainer: {
    alignSelf: 'center',
    marginVertical: -50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mannequinImage: {
    width: 260,
    height: 260,
    opacity: 1,
  },
  mannequinGlow: {
    position: 'absolute',
    bottom: 20,
    width: 140,
    height: 100,
    borderRadius: 70,
    backgroundColor: '#6E3DF0',
    opacity: 0.35,
    shadowColor: '#6E3DF0',
    shadowOpacity: 0.9,
    shadowRadius: 50,
    elevation: 15,
  },
  gradientProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 6,
    backgroundColor: 'rgba(183, 149, 255, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.3)',
  },
  progressCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  progressCardInner: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  compassIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(110, 61, 240, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cubeIcon: {
    width: 24,
    height: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  progressSubtitle: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    marginTop: 12,
  },
  journalCard: {
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  journalCardInner: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 24,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  journalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(110, 61, 240, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalContent: {
    flex: 1,
  },
  journalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  journalSubtitle: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 18,
  },
  cards: {
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    gap: 14,
  },
  cardIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 18,
  },
  cardAction: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    marginTop: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
