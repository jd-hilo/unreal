import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getDecisions, getProfile } from '@/lib/storage';
import { Compass, Sparkles } from 'lucide-react-native';
import { Card, CardTitle, CardContent } from '@/components/Card';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { onboardingComplete, checkOnboardingStatus } = useTwin();
  const [userName, setUserName] = useState('there');
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    // Check onboarding status from database
    checkOnboardingStatus(user.id).then(() => {
      const isComplete = useTwin.getState().onboardingComplete;
      if (!isComplete) {
        router.replace('/onboarding/01-now');
        return;
      }
      loadData();
    });
  }, [user, router, checkOnboardingStatus]);

  async function loadData() {
    if (!user) return;

    try {
      const profile = await getProfile(user.id);
      if (profile?.core_json?.primary_role) {
        setUserName(profile.core_json.primary_role);
      }

      const decisions = await getDecisions(user.id, 3);
      setRecentDecisions(decisions);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey {userName},</Text>
        <Text style={styles.question}>what's on your mind?</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardPrimary]}
          onPress={() => router.push('/decision/new')}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Compass size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>What should I choose?</Text>
          <Text style={styles.actionSubtitle}>Get help deciding between options</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardSecondary]}
          onPress={() => router.push('/whatif/new')}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Sparkles size={32} color="#000000" />
          </View>
          <Text style={[styles.actionTitle, styles.actionTitleDark]}>What if?</Text>
          <Text style={[styles.actionSubtitle, styles.actionSubtitleDark]}>
            Explore alternate life paths
          </Text>
        </TouchableOpacity>
      </View>

      {recentDecisions.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.recentTitle}>Recent Decisions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {recentDecisions.map((decision) => (
              <Card
                key={decision.id}
                style={styles.decisionCard}
                onPress={() => router.push(`/decision/${decision.id}`)}
              >
                <CardContent>
                  <Text style={styles.decisionQuestion} numberOfLines={2}>
                    {decision.question}
                  </Text>
                  {decision.prediction && (
                    <Text style={styles.decisionAnswer}>
                      {decision.prediction.prediction}
                    </Text>
                  )}
                </CardContent>
              </Card>
            ))}
          </ScrollView>
        </View>
      )}
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
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
  question: {
    fontSize: 32,
    fontWeight: '300',
    color: '#666666',
  },
  actions: {
    gap: 16,
    marginBottom: 40,
  },
  actionCard: {
    padding: 32,
    borderRadius: 20,
    minHeight: 160,
  },
  actionCardPrimary: {
    backgroundColor: '#000000',
  },
  actionCardSecondary: {
    backgroundColor: '#F5F5F5',
  },
  iconContainer: {
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  actionTitleDark: {
    color: '#000000',
  },
  actionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionSubtitleDark: {
    color: '#666666',
  },
  recent: {
    marginTop: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  carousel: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  decisionCard: {
    width: 200,
    marginRight: 12,
  },
  decisionQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  decisionAnswer: {
    fontSize: 14,
    color: '#666666',
  },
});
