import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CheckCircle2, Circle, Edit3, ChevronRight, BookOpen } from 'lucide-react-native';
import { getProfile, getTodayJournal, getRelationships } from '@/lib/storage';

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
      const [profile, todayJournal, relationships] = await Promise.all([
        getProfile(user.id),
        getTodayJournal(user.id),
        getRelationships(user.id)
      ]);
      setProfileData(profile);
      setJournalComplete(!!todayJournal);
      setHasRelationships(relationships && relationships.length > 0);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const onboardingResponses = profileData?.core_json?.onboarding_responses || {};
  const university = profileData?.university || onboardingResponses.university;
  const hometown = profileData?.hometown || onboardingResponses.hometown;

  const cards: ProfileCard[] = [
    {
      id: '01-now',
      title: 'Current Life Situation',
      subtitle: onboardingResponses['01-now'] 
        ? onboardingResponses['01-now'].substring(0, 50) + '...'
        : 'Where are you in life right now?',
      onboardingStep: '/onboarding/01-now',
      completed: !!onboardingResponses['01-now'],
    },
    {
      id: '02-path',
      title: 'Life Journey',
      subtitle: onboardingResponses['02-path']
        ? onboardingResponses['02-path'].substring(0, 50) + '...'
        : 'How did you get here?',
      onboardingStep: '/onboarding/02-path',
      completed: !!onboardingResponses['02-path'],
    },
    {
      id: '03-values',
      title: 'Core Values',
      subtitle: onboardingResponses['03-values']
        ? onboardingResponses['03-values'].substring(0, 50) + '...'
        : 'What matters most to you?',
      onboardingStep: '/onboarding/03-values',
      completed: !!onboardingResponses['03-values'],
    },
    {
      id: '04-style',
      title: 'Decision-Making Style',
      subtitle: onboardingResponses['04-style']
        ? onboardingResponses['04-style'].substring(0, 50) + '...'
        : 'How do you usually make big decisions?',
      onboardingStep: '/onboarding/04-style',
      completed: !!onboardingResponses['04-style'],
    },
    {
      id: '05-day',
      title: 'Typical Day',
      subtitle: onboardingResponses['05-day']
        ? onboardingResponses['05-day'].substring(0, 50) + '...'
        : 'Walk me through a typical day',
      onboardingStep: '/onboarding/05-day',
      completed: !!onboardingResponses['05-day'],
    },
    {
      id: '06-stress',
      title: 'Stress Response',
      subtitle: onboardingResponses['06-stress']
        ? onboardingResponses['06-stress'].substring(0, 50) + '...'
        : 'When things get hard, how do you react?',
      onboardingStep: '/onboarding/06-stress',
      completed: !!onboardingResponses['06-stress'],
    },
    {
      id: 'university',
      title: 'Education',
      subtitle: university || 'Add your university',
      onboardingStep: '/onboarding/07-clarifier',
      completed: !!university,
    },
    {
      id: 'hometown',
      title: 'Hometown',
      subtitle: hometown || 'Where did you grow up?',
      onboardingStep: '/onboarding/07-clarifier',
      completed: !!hometown,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Profile</Text>

      <Card style={styles.progressCard} variant="elevated">
        <Text style={styles.progressTitle}>Twin's Understanding</Text>
        <ProgressBar progress={totalProgress} />
        <Text style={styles.progressSubtitle}>
          {completedCount} of {cards.length} sections complete • Tap any card to edit
        </Text>
      </Card>

      {/* Highlighted Journal Card */}
      <TouchableOpacity
        style={[
          styles.journalHighlight,
          journalComplete && styles.journalHighlightComplete
        ]}
        onPress={() => router.push('/journal' as any)}
        activeOpacity={0.7}
      >
        <View style={styles.journalIcon}>
          {journalComplete ? (
            <CheckCircle2 size={28} color="#10B981" />
          ) : (
            <BookOpen size={28} color="#000000" />
          )}
        </View>
        <View style={styles.journalContent}>
          <Text style={styles.journalTitle}>Daily Journal</Text>
          <Text style={styles.journalSubtitle}>
            {journalComplete 
              ? "Today's journal complete! View or edit anytime"
              : "Journal your days and help your twin understand you"
            }
          </Text>
        </View>
        <ChevronRight size={24} color={journalComplete ? "#10B981" : "#000000"} />
      </TouchableOpacity>

      <View style={styles.cards}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={styles.card}
            onPress={() => handleCardPress(card)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIcon}>
              {card.completed ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <Circle size={24} color="#D1D5DB" />
              )}
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {card.subtitle}
              </Text>
            </View>
            <View style={styles.cardAction}>
              {card.completed ? (
                <Edit3 size={20} color="#666666" />
              ) : (
                <ChevronRight size={20} color="#666666" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.settings}>
        <Text style={styles.settingsTitle}>Settings</Text>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Premium</Text>
            <TouchableOpacity
              style={[styles.toggle, isPremium && styles.toggleActive]}
              onPress={() => setPremium(!isPremium)}
            >
              <View style={[styles.toggleThumb, isPremium && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </Card>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="medium"
          style={styles.signOutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  progressCard: {
    marginBottom: 32,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  journalHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 16,
  },
  journalHighlightComplete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  journalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalContent: {
    flex: 1,
    gap: 4,
  },
  journalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  journalSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  cards: {
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  cardIcon: {
    width: 24,
    height: 24,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  cardAction: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settings: {
    gap: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  settingCard: {
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#000000',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  signOutButton: {
    marginTop: 16,
  },
});
