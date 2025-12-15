import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { createTimeline, getProfile, getRelationships } from '@/lib/storage';
import { ChevronRight, ChevronLeft, User, Briefcase, Heart, Sparkles, Zap, Brain, Globe } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function NewSimulationScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('My Simulation');
  const [focus, setFocus] = useState('balanced');
  const [difficulty, setDifficulty] = useState('normal');

  const focusOptions = [
    { id: 'balanced', label: 'Balanced', icon: Brain, color: '#0EA5E9', desc: 'Equal focus on all aspects' },
    { id: 'wealth', label: 'Wealth', icon: Briefcase, color: '#10B981', desc: 'Focus on career and money' },
    { id: 'love', label: 'Relationships', icon: Heart, color: '#EC4899', desc: 'Focus on social and love' },
    { id: 'adventure', label: 'Adventure', icon: Globe, color: '#F59E0B', desc: 'Focus on travel and experiences' },
  ];

  const difficultyOptions = [
    { id: 'easy', label: 'Dreamy', desc: 'Optimistic outcomes', color: '#60A5FA' },
    { id: 'normal', label: 'Realistic', desc: 'Standard probabilities', color: '#0EA5E9' },
    { id: 'hard', label: 'Chaotic', desc: 'Unpredictable events', color: '#F87171' },
  ];

  async function handleCreate() {
    if (!user) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get profile for age and current life state
      const profile = await getProfile(user.id);
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
      const initialRelationships = relationships.map((rel: any) => ({
        name: rel.name,
        type: rel.relationship_type || 'friend',
        status: 'good', // Default status
        description: `Known for ${rel.years_known || 0} years`,
      }));

      // Initialize timeline with user's current life state
      const initialProfile = {
        location: profile?.current_location || profile?.hometown || 'Unknown',
        job: profile?.career_entrypoint || 'Not specified',
        netWorth: profile?.net_worth || '$0',
        relationshipStatus: relationships.length > 0 ? 'In relationships' : 'Single',
      };

      // Create timeline with custom settings and current life state
      // Note: We might want to store these settings (focus, difficulty) in the timeline metadata later
      const newTimeline = await createTimeline(
        user.id,
        name || `Timeline started at ${age}`,
        age,
        undefined, // Use default stats
        initialProfile,
        initialRelationships,
        isPremium
      );

      // In a real implementation, we would pass focus/difficulty to the backend/AI
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
      <Image 
        source={require('@/assets/images/splash-icon.png')} // Fallback background
        style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
        blurRadius={30}
      />
      <LinearGradient
        colors={['rgba(10,10,12,0.9)', 'rgba(15,15,20,0.95)', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Simulation</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={18} color="#C4B5FD" />
                <Text style={styles.sectionTitle}>Basic Info</Text>
              </View>
              <BlurView intensity={20} tint="dark" style={styles.card}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Name your timeline"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
              </BlurView>
            </View>

            {/* Focus Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Brain size={18} color="#C4B5FD" />
                <Text style={styles.sectionTitle}>Life Focus</Text>
              </View>
              <View style={styles.grid}>
                {focusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.gridItem,
                      focus === option.id && { borderColor: option.color, backgroundColor: `${option.color}20` }
                    ]}
                    onPress={() => setFocus(option.id)}
                  >
                    <View style={[styles.gridIcon, { backgroundColor: `${option.color}30` }]}>
                      <option.icon size={20} color={option.color} />
                    </View>
                    <Text style={styles.gridLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Difficulty/Vibe Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={18} color="#C4B5FD" />
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
                      difficulty === option.id && { borderColor: option.color, transform: [{scale: 1.02}] }
                    ]}
                    onPress={() => setDifficulty(option.id)}
                  >
                    <BlurView intensity={30} tint="dark" style={styles.optionContent}>
                      <Text style={[styles.optionLabel, { color: option.color }]}>{option.label}</Text>
                      <Text style={styles.optionDesc}>{option.desc}</Text>
                      {difficulty === option.id && (
                        <View style={[styles.selectedDot, { backgroundColor: option.color }]} />
                      )}
                    </BlurView>
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
              disabled={loading}
            >
              <LinearGradient
                colors={['#2563EB', '#0EA5E9', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                <Text style={styles.createText}>{loading ? 'Creating...' : 'Start Simulation'}</Text>
                <View style={styles.priceTag}>
                  <Zap size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.priceText}>Start</Text>
                </View>
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
    backgroundColor: '#000',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
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
    marginBottom: 24,
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
    color: '#FFF',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputGroup: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (width - 52) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 12,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  optionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
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
    color: '#FFF',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  priceText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});


