import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { OnboardingData } from '@/lib/elevenLabs';
import { mineRelationships } from '@/lib/ai';
import { 
  updateProfileFields, 
  saveOnboardingResponse, 
  completeOnboarding,
  upsertRelationships 
} from '@/lib/storage';
import type { RelationshipExtraction } from '@/types/database';
import { trackEvent, MixpanelEvents, setUserProperty } from '@/lib/mixpanel';

interface ExtractedRelationship extends RelationshipExtraction {
  selected: boolean;
}

export default function AIOnboardingReview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const { setOnboardingComplete } = useTwin();
  
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lifeSituation, setLifeSituation] = useState('');
  const [lifeJourney, setLifeJourney] = useState('');
  const [stressHandling, setStressHandling] = useState('');
  const [hometown, setHometown] = useState('');
  const [college, setCollege] = useState('');
  const [relationshipsText, setRelationshipsText] = useState('');
  const [extractedRelationships, setExtractedRelationships] = useState<ExtractedRelationship[]>([]);
  const [extractingRelationships, setExtractingRelationships] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load data from params
    if (params.data && typeof params.data === 'string') {
      try {
        const data = JSON.parse(params.data) as OnboardingData;
        setOnboardingData(data);
        setFirstName(data.firstName || '');
        setLifeSituation(data.lifeSituation || '');
        setLifeJourney(data.lifeJourney || '');
        setStressHandling(data.stressHandling || '');
        setHometown(data.hometown || '');
        setCollege(data.college || '');
        setRelationshipsText(data.relationships || '');

        // Extract relationships from the text
        if (data.relationships) {
          extractRelationships(data.relationships);
        }
      } catch (err) {
        console.error('Failed to parse onboarding data:', err);
        setError('Failed to load conversation data');
      }
    }
  }, [params.data]);

  async function extractRelationships(text: string) {
    if (!text.trim()) return;

    setExtractingRelationships(true);
    try {
      const relationships = await mineRelationships(text);
      const formatted = relationships.map(r => ({
        ...r,
        selected: true,
      }));
      setExtractedRelationships(formatted);
    } catch (err: any) {
      console.error('Failed to extract relationships:', err);
      // Don't show error, just leave relationships empty
    } finally {
      setExtractingRelationships(false);
    }
  }

  function toggleRelationship(index: number) {
    setExtractedRelationships(prev =>
      prev.map((rel, i) => (i === index ? { ...rel, selected: !rel.selected } : rel))
    );
  }

  function removeRelationship(index: number) {
    setExtractedRelationships(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!user) {
      setError('User not found. Please sign in again.');
      return;
    }

    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Save structured fields
      await updateProfileFields(user.id, {
        first_name: firstName.trim(),
        hometown: hometown.trim() || undefined,
        university: college.trim() || undefined,
      });

      // 2. Save narrative responses in core_json
      if (lifeSituation.trim()) {
        await saveOnboardingResponse(user.id, '01-now', lifeSituation.trim());
      }
      if (lifeJourney.trim()) {
        await saveOnboardingResponse(user.id, '02-path', lifeJourney.trim());
      }
      if (stressHandling.trim()) {
        await saveOnboardingResponse(user.id, '06-stress', stressHandling.trim());
      }

      // 3. Save relationships
      const selectedRelationships = extractedRelationships.filter(r => r.selected);
      if (selectedRelationships.length > 0) {
        await upsertRelationships(user.id, selectedRelationships);
      }

      // 4. Mark onboarding as complete
      await completeOnboarding(user.id, {
        first_name: firstName.trim(),
        hometown: hometown.trim() || undefined,
        university: college.trim() || undefined,
      });

      // Track onboarding completion
      trackEvent(MixpanelEvents.ONBOARDING_COMPLETED, {
        method: 'ai_voice',
        relationships_count: selectedRelationships.length,
      });
      setUserProperty('onboarding_complete', true);
      setUserProperty('onboarding_method', 'ai_voice');

      setOnboardingComplete(true);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('Failed to save onboarding data:', err);
      setError(err.message || 'Failed to save your information. Please try again.');
      setSaving(false);
    }
  }

  if (!onboardingData) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#B795FF" />
          <Text style={styles.loadingText}>Loading your conversation...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Review Your Information</Text>
        <Text style={styles.subtitle}>
          Make any changes you'd like before we create your twin
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>First Name *</Text>
          <Input
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current Life Situation</Text>
          <Input
            value={lifeSituation}
            onChangeText={setLifeSituation}
            placeholder="Where you are in life right now..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Life Journey</Text>
          <Input
            value={lifeJourney}
            onChangeText={setLifeJourney}
            placeholder="Your life story and how you got here..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Stress Handling</Text>
          <Input
            value={stressHandling}
            onChangeText={setStressHandling}
            placeholder="How you handle stress..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hometown</Text>
          <Input
            value={hometown}
            onChangeText={setHometown}
            placeholder="Where you grew up"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>College/University</Text>
          <Input
            value={college}
            onChangeText={setCollege}
            placeholder="Where you went to college"
          />
        </View>

        {/* Relationships Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Important Relationships</Text>
          {extractingRelationships ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#B795FF" />
              <Text style={styles.loadingCardText}>Extracting relationships...</Text>
            </View>
          ) : extractedRelationships.length > 0 ? (
            <>
              <Text style={styles.sectionHelp}>
                We found {extractedRelationships.length} relationship{extractedRelationships.length !== 1 ? 's' : ''} from your conversation. Select which ones to add.
              </Text>
              <View style={styles.relationshipsList}>
                {extractedRelationships.map((rel, index) => (
                  <View
                    key={index}
                    style={[
                      styles.relationshipCard,
                      rel.selected && styles.relationshipCardSelected,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleRelationship(index)}
                      style={styles.relationshipContent}
                    >
                      <View style={styles.relationshipIcon}>
                        {rel.selected ? (
                          <CheckCircle2 size={20} color="#10B981" />
                        ) : (
                          <Circle size={20} color="#D1D5DB" />
                        )}
                      </View>
                      <View style={styles.relationshipInfo}>
                        <Text style={styles.relationshipName}>{rel.name}</Text>
                        <Text style={styles.relationshipDetails}>
                          {rel.relationship_type}
                          {rel.years_known && ` • ${rel.years_known} years`}
                          {rel.location && ` • ${rel.location}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeRelationship(index)}
                      style={styles.removeButton}
                    >
                      <X size={18} color="rgba(200, 200, 200, 0.6)" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No relationships extracted. You can add them later from your profile.
              </Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Save & Complete"
          onPress={handleSave}
          loading={saving}
          size="large"
          disabled={!firstName.trim()}
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Go back to conversation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 150,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionHelp: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 12,
    lineHeight: 20,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 12,
  },
  loadingCardText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  relationshipsList: {
    gap: 12,
  },
  relationshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  relationshipCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  relationshipContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  relationshipIcon: {
    width: 20,
    height: 20,
  },
  relationshipInfo: {
    flex: 1,
    gap: 4,
  },
  relationshipName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  relationshipDetails: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'capitalize',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 20,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.4)',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
  },
  errorCard: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    fontWeight: '600',
  },
});

