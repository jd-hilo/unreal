import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { createTimeline, getProfile, getRelationships } from '@/lib/storage';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { Input } from '@/components/Input';

const { width } = Dimensions.get('window');

export default function NewSimulationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ auto?: string }>();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('normal');

  const difficultyOptions = [
    { id: 'easy', label: 'Dreamy', desc: 'Optimistic outcomes', color: '#60A5FA' },
    { id: 'normal', label: 'Realistic', desc: 'Standard probabilities', color: Colors.gradients.turquoise[1] },
    { id: 'hard', label: 'Chaotic', desc: 'Unpredictable events', color: '#F87171' },
  ];

  useEffect(() => {
    if (params.auto === 'true') {
      // Small delay to ensure navigation is complete and UI is ready
      const timer = setTimeout(() => {
        handleCreate();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.auto]);

  async function handleCreate() {
    if (!user) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get profile for age and current life state
      const profile = await getProfile(user.id);
      
      // Check Net Worth (Required for B Users/Simulations)
      if (!profile?.net_worth) {
        setLoading(false);
        router.replace('/simulate/setup');
        return;
      }

      // Check Current Location (Required for B Users/Simulations)
      if (!profile?.current_location) {
        setLoading(false);
        router.replace('/simulate/setup');
        return;
      }

      let age = 25;
      
      // Check for birth year in onboarding responses (handle both key formats)
      const responses = profile?.core_json?.onboarding_responses || {};
      const birthYearVal = responses['birth-year'] || responses['00-birth-year'];
      
      if (birthYearVal) {
        const birthYear = parseInt(birthYearVal);
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      }

      // Get user's current relationships
      const relationships = await getRelationships(user.id);

      // Check Relationships (Required for B Users/Simulations)
      if (!relationships || relationships.length === 0) {
        setLoading(false);
        router.replace('/simulate/setup');
        return;
      }

      const initialRelationships = relationships.map((rel: any) => ({
        name: rel.name,
        type: rel.relationship_type || 'friend',
        status: 'good', // Default status
        description: `Known for ${rel.years_known || 0} years`,
      }));

      // Initialize timeline with user's current life state
      const initialProfile = {
        location: profile?.current_location || profile?.hometown || 'Unknown',
        job: profile?.core_json?.primary_role || profile?.career_entrypoint || 'Not specified',
        netWorth: profile?.net_worth || '$0',
        relationshipStatus: relationships.length > 0 ? 'In relationships' : 'Single',
      };

      // Create timeline with custom settings and current life state
      const newTimeline = await createTimeline(
        user.id,
        name.trim() || `My Simulation`,
        age,
        undefined, // Use default stats
        initialProfile,
        initialRelationships,
        isPremium
      );

      // In a real implementation, we would pass difficulty to the backend/AI
      // For now, we just create the timeline and redirect
      
      router.replace(`/simulate/${newTimeline.id}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Failed to create timeline:', error);
      if (error?.message === 'INSUFFICIENT_CREDITS') {
        router.push('/premium');
      } else {
        alert('Failed to create timeline');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Simulation</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Name Section */}
            <View style={styles.section}>
              <View style={styles.inputWrapper}>
                <Input
                  placeholder="Name your simulation"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus={true}
                  returnKeyType="done"
                  style={styles.input}
                  containerStyle={styles.inputContainer}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>

            {/* Simulation Mode Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={18} color={Colors.gradients.purple[1]} />
                <Text style={styles.sectionTitle}>Simulation Mode</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.horizontalScroll}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {difficultyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      difficulty === option.id && styles.optionCardSelected
                    ]}
                    onPress={() => setDifficulty(option.id)}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, { color: option.color }]}>{option.label}</Text>
                      <Text style={styles.optionDesc}>{option.desc}</Text>
                      {difficulty === option.id && (
                        <View style={[styles.selectedDot, { backgroundColor: option.color }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreate}
              disabled={loading || !name.trim()}
            >
              <LinearGradient
                colors={loading || !name.trim() ? ['#999', '#AAA'] : Colors.gradients.purple}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                <Text style={styles.createText}>{loading ? 'Creating...' : 'Start Simulation'}</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 40, // Balance back button
    alignItems: 'flex-end',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  costText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  inputWrapper: {
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 0,
    padding: 0,
  },
  input: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  horizontalScrollContent: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  optionCard: {
    width: 140,
    height: 100,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: Colors.gradients.purple[1],
  },
  optionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  selectedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    backgroundColor: 'transparent',
  },
  createButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingHorizontal: 24,
  },
  createText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});



