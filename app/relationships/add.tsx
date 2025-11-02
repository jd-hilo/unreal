import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

const RELATIONSHIP_TYPES = [
  'Partner', 'Spouse', 'Family', 'Friend', 'Mentor', 
  'Coworker', 'Boss', 'Other'
];

const CONTACT_FREQUENCIES = [
  'Daily', 'Weekly', 'Monthly', 'Rarely'
];

export default function AddRelationshipScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [name, setName] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [yearsKnown, setYearsKnown] = useState('');
  const [contactFrequency, setContactFrequency] = useState('');
  const [location, setLocation] = useState('');
  const [influence, setInfluence] = useState('50');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
          influence: parseFloat(influence) / 100,
        });

      if (saveError) throw saveError;

      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save relationship');
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Relationship</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Influence on Decisions: {influence}%
          </Text>
          <Text style={styles.sectionHelp}>
            How much does this person influence your major decisions?
          </Text>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0%</Text>
              <Text style={styles.sliderLabel}>100%</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill, 
                  { width: `${influence}%` }
                ]} 
              />
            </View>
            <View style={styles.sliderButtons}>
              {[0, 25, 50, 75, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.sliderButton,
                    influence === String(val) && styles.sliderButtonActive
                  ]}
                  onPress={() => setInfluence(String(val))}
                >
                  <Text style={[
                    styles.sliderButtonText,
                    influence === String(val) && styles.sliderButtonTextActive
                  ]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Save Relationship"
          onPress={handleSave}
          loading={saving}
          size="large"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#666666',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
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
    color: '#000000',
    marginBottom: 8,
  },
  sectionHelp: {
    fontSize: 14,
    color: '#666666',
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
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
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
    color: '#999999',
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
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
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
    color: '#666666',
  },
  sliderButtonTextActive: {
    color: '#FFFFFF',
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});

