import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CheckCircle2, Circle, Lock } from 'lucide-react-native';

interface CompletionCard {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  isPrivate?: boolean;
  completed: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const { calculateProgress, isPremium, setPremium } = useTwin();
  const [completedCards, setCompletedCards] = useState<string[]>([]);

  const cards: CompletionCard[] = [
    {
      id: 'personality_quiz',
      title: 'Take your personality quiz',
      subtitle: 'Understand your decision-making style',
      progress: 15,
      completed: completedCards.includes('personality_quiz'),
    },
    {
      id: 'relationships',
      title: 'Add relationships',
      subtitle: 'People who influence your decisions',
      progress: 15,
      completed: completedCards.includes('relationships'),
    },
    {
      id: 'career',
      title: 'Add your career to this point',
      subtitle: 'Your professional journey',
      progress: 15,
      completed: completedCards.includes('career'),
    },
    {
      id: 'university',
      title: 'Add university',
      subtitle: 'Where you studied',
      progress: 5,
      completed: completedCards.includes('university'),
    },
    {
      id: 'location',
      title: 'Add city & country',
      subtitle: 'Where you live',
      progress: 5,
      completed: completedCards.includes('location'),
    },
    {
      id: 'sexuality',
      title: 'Add sexuality',
      subtitle: 'Prefer not to say',
      progress: 5,
      isPrivate: true,
      completed: completedCards.includes('sexuality'),
    },
    {
      id: 'journal',
      title: 'Journal today',
      subtitle: 'Track your daily mood and thoughts',
      progress: 10,
      completed: completedCards.includes('journal'),
    },
  ];

  const totalProgress = calculateProgress(completedCards);

  function handleCardPress(cardId: string) {
    console.log('Open card:', cardId);
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
      <Text style={styles.title}>Your Twin</Text>

      <Card style={styles.progressCard} variant="elevated">
        <Text style={styles.progressTitle}>Twin's Understanding</Text>
        <ProgressBar progress={totalProgress} />
        <Text style={styles.progressSubtitle}>
          Complete these cards to improve your twin's accuracy
        </Text>
      </Card>

      <View style={styles.cards}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={styles.card}
            onPress={() => handleCardPress(card.id)}
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
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                {card.isPrivate && (
                  <Lock size={16} color="#999999" />
                )}
              </View>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              <Text style={styles.cardProgress}>+{card.progress}%</Text>
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
    gap: 16,
  },
  cardIcon: {
    width: 24,
    height: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  cardProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
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
