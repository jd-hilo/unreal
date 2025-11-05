import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { supabase } from '@/lib/supabase';
import { mineRelationships } from '@/lib/ai';
import { completeOnboarding } from '@/lib/storage';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Sparkles, CheckCircle2, Circle } from 'lucide-react-native';

const RELATIONSHIP_TYPES = [
  'Partner', 'Spouse', 'Family', 'Friend', 'Mentor', 
  'Coworker', 'Boss', 'Other'
];

const CONTACT_FREQUENCIES = [
  'Daily', 'Weekly', 'Monthly', 'Rarely'
];

interface ExtractedRelationship {
  name: string;
  relationship_type: string;
  duration?: string;
  contact_frequency?: string;
  influence?: number;
  location?: string;
  sentiment?: string;
  selected: boolean;
}

export default function AddRelationshipScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isOnboarding = params.onboarding === 'true';
  const user = useAuth((state) => state.user);
  const { setOnboardingComplete } = useTwin();
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  
  // AI Mode
  const [paragraph, setParagraph] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedRelationship[]>([]);
  
  // Manual Mode
  const [name, setName] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [yearsKnown, setYearsKnown] = useState('');
  const [contactFrequency, setContactFrequency] = useState('');
  const [location, setLocation] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleExtract() {
    if (!paragraph.trim()) {
      setError('Please write about your relationships');
      return;
    }

    setExtracting(true);
    setError('');

    try {
      const results = await mineRelationships(paragraph);
      
      // Ensure results is an array
      const resultsArray = Array.isArray(results) ? results : [];
      
      if (resultsArray.length === 0) {
        setError('No relationships found. Try providing more details about people in your life.');
        setExtracting(false);
        return;
      }
      
      const formatted = resultsArray.map(r => ({
        name: r.name || 'Unknown',
        relationship_type: r.relationship_type || 'friend',
        duration: r.duration,
        contact_frequency: r.contact_frequency,
        influence: r.influence,
        location: r.location,
        sentiment: r.sentiment,
        selected: true,
      }));
      setExtracted(formatted);
    } catch (err: any) {
      setError(err.message || 'Failed to extract relationships');
    } finally {
      setExtracting(false);
    }
  }

  function toggleSelection(index: number) {
    setExtracted(prev => prev.map((rel, i) => 
      i === index ? { ...rel, selected: !rel.selected } : rel
    ));
  }

  async function handleSaveExtracted() {
    if (!user) return;
    
    const selected = extracted.filter(r => r.selected);
    if (selected.length === 0) {
      setError('Please select at least one relationship');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const toInsert = selected.map(r => ({
        user_id: user.id,
        name: r.name,
        relationship_type: r.relationship_type.toLowerCase(),
        years_known: r.duration ? parseFloat(r.duration) : null,
        contact_frequency: r.contact_frequency?.toLowerCase() || null,
        location: r.location || null,
        influence: 0.5, // Default influence
      }));

      const { error: saveError } = await supabase
        .from('relationships')
        .insert(toInsert as any);

      if (saveError) throw saveError;

      if (isOnboarding) {
        await completeOnboarding(user.id, {});
        setOnboardingComplete(true);
        router.replace('/(tabs)/home');
      } else {
      router.back();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save relationships');
      setSaving(false);
    }
  }
  
  async function handleSkip() {
    if (!user || !isOnboarding) return;
    
    try {
      await completeOnboarding(user.id, {});
      setOnboardingComplete(true);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to complete onboarding');
    }
  }

  async function handleSave() {
    if (!user || !name.trim() || !relationshipType) {
      setError('Please fill in name and relationship type');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: saveError } = await supabase
        .from('relationships')
        .insert({
          user_id: user.id,
          name: name.trim(),
          relationship_type: relationshipType.toLowerCase(),
          years_known: yearsKnown ? parseFloat(yearsKnown) : null,
          contact_frequency: contactFrequency.toLowerCase() || null,
          location: location.trim() || null,
          influence: 0.5, // Default influence
        });

      if (saveError) throw saveError;

      if (isOnboarding) {
        await completeOnboarding(user.id, {});
        setOnboardingComplete(true);
        router.replace('/(tabs)/home');
      } else {
      router.back();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save relationship');
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!isOnboarding && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        )}
        <Text style={styles.title}>{isOnboarding ? 'Who influences your decisions?' : 'Add Relationships'}</Text>
        {isOnboarding && (
          <Text style={styles.subtitle}>Add key people in your life (optional)</Text>
        )}
        
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'ai' && styles.modeButtonActive]}
            onPress={() => setMode('ai')}
          >
            <Sparkles size={16} color={mode === 'ai' ? '#FFFFFF' : '#666666'} />
            <Text style={[styles.modeButtonText, mode === 'ai' && styles.modeButtonTextActive]}>
              AI Extract
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
            onPress={() => setMode('manual')}
          >
            <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
              Manual
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'ai' ? (
          <>
            {extracted.length === 0 ? (
              <>
                <Text style={styles.aiInstructions}>
                  Write a paragraph about the people in your life and AI will extract them for you.
                </Text>
                <Input
                  placeholder="E.g., My partner Sarah has been with me for 5 years in NYC. My best friend Mike from college lives in SF and we talk weekly. My mentor Jane helped shape my career..."
                  value={paragraph}
                  onChangeText={setParagraph}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  style={styles.paragraphInput}
                />
                {error && <Text style={styles.error}>{error}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.extractedTitle}>
                  Select relationships to add ({extracted.filter(r => r.selected).length} selected)
                </Text>
                <View style={styles.extractedList}>
                  {extracted.map((rel, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.extractedCard,
                        rel.selected && styles.extractedCardSelected
                      ]}
                      onPress={() => toggleSelection(index)}
                    >
                      <View style={styles.extractedIcon}>
                        {rel.selected ? (
                          <CheckCircle2 size={24} color="#10B981" />
                        ) : (
                          <Circle size={24} color="#D1D5DB" />
                        )}
                      </View>
                      <View style={styles.extractedContent}>
                        <Text style={styles.extractedName}>{rel.name}</Text>
                        <Text style={styles.extractedDetails}>
                          {rel.relationship_type}
                          {rel.duration && ` • ${rel.duration} years`}
                          {rel.location && ` • ${rel.location}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                {error && <Text style={styles.error}>{error}</Text>}
              </>
            )}
          </>
        ) : (
          <>
        <Input
          label="Name *"
          placeholder="Their name"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Relationship Type *</Text>
          <View style={styles.optionsGrid}>
            {RELATIONSHIP_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  relationshipType === type && styles.optionSelected
                ]}
                onPress={() => setRelationshipType(type)}
              >
                <Text style={[
                  styles.optionText,
                  relationshipType === type && styles.optionTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Years Known"
          placeholder="How many years?"
          value={yearsKnown}
          onChangeText={setYearsKnown}
          keyboardType="numeric"
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact Frequency</Text>
          <View style={styles.optionsGrid}>
            {CONTACT_FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.option,
                  contactFrequency === freq && styles.optionSelected
                ]}
                onPress={() => setContactFrequency(freq)}
              >
                <Text style={[
                  styles.optionText,
                  contactFrequency === freq && styles.optionTextSelected
                ]}>
                  {freq}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Location"
          placeholder="Where they live"
          value={location}
          onChangeText={setLocation}
        />

        {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isOnboarding && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        {mode === 'ai' ? (
          extracted.length === 0 ? (
            <Button
              title="Extract Relationships"
              onPress={handleExtract}
              loading={extracting}
              size="large"
              icon={<Sparkles size={20} color="#FFFFFF" />}
            />
          ) : (
            <View style={styles.footerButtons}>
              <Button
                title="Back"
                onPress={() => setExtracted([])}
                variant="outline"
                size="large"
                style={{ flex: 1 }}
              />
              <Button
                title={isOnboarding ? 'Continue' : `Add ${extracted.filter(r => r.selected).length}`}
                onPress={handleSaveExtracted}
                loading={saving}
                size="large"
                style={{ flex: 1 }}
              />
            </View>
          )
        ) : (
          <Button
            title={isOnboarding ? 'Continue' : 'Save Relationship'}
            onPress={handleSave}
            loading={saving}
            size="large"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#0C0C10',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
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
    marginBottom: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: '#0C0C10',
    gap: 6,
  },
  modeButtonActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
    gap: 24,
  },
  section: {
    gap: 8,
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
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: '#0C0C10',
  },
  optionSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  sliderContainer: {
    gap: 12,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: 'rgba(150, 150, 150, 0.6)',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#000000',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: '#0C0C10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  sliderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  sliderButtonTextActive: {
    color: '#FFFFFF',
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  aiInstructions: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 20,
    marginBottom: 8,
  },
  paragraphInput: {
    minHeight: 200,
  },
  extractedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  extractedList: {
    gap: 12,
  },
  extractedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0C10',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    gap: 12,
  },
  extractedCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  extractedIcon: {
    width: 24,
    height: 24,
  },
  extractedContent: {
    flex: 1,
    gap: 4,
  },
  extractedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  extractedDetails: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'capitalize',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});


