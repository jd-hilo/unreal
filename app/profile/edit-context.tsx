import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ArrowLeft, MapPin, DollarSign, Users } from 'lucide-react-native';
import { getProfile, updateProfileFields } from '@/lib/storage';

export default function EditContextScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [currentLocation, setCurrentLocation] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [politicalViews, setPoliticalViews] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile) {
        setCurrentLocation(profile.current_location || '');
        setNetWorth(profile.net_worth || '');
        setPoliticalViews(profile.political_views || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    setLoading(true);
    try {
      await updateProfileFields(user.id, {
        current_location: currentLocation.trim() || undefined,
        net_worth: netWorth.trim() || undefined,
        political_views: politicalViews.trim() || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Context Info</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Context Info</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Help your AI twin understand you better by sharing key context about your life.
        </Text>

        {/* Current Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#4169E1" />
            <Text style={styles.sectionTitle}>Current Location</Text>
          </View>
          <Input
            placeholder="e.g., Austin, Texas"
            value={currentLocation}
            onChangeText={setCurrentLocation}
            containerStyle={styles.inputContainer}
          />
          <Text style={styles.helperText}>
            Where do you currently live?
          </Text>
        </View>

        {/* Net Worth */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Net Worth</Text>
          </View>
          <Input
            placeholder="e.g., $45k, $250k, $2.5M"
            value={netWorth}
            onChangeText={setNetWorth}
            containerStyle={styles.inputContainer}
          />
          <Text style={styles.helperText}>
            Your approximate net worth (assets minus debts)
          </Text>
        </View>

        {/* Political Views */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#1E40AF" />
            <Text style={styles.sectionTitle}>Political Views</Text>
          </View>
          <Input
            placeholder="e.g., Liberal, Conservative, Independent, Moderate"
            value={politicalViews}
            onChangeText={setPoliticalViews}
            multiline
            numberOfLines={3}
            containerStyle={styles.inputContainer}
          />
          <Text style={styles.helperText}>
            Your political perspective or affiliation (optional)
          </Text>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            💡 This information helps your twin make more personalized predictions and understand your context better.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(200, 200, 200, 0.85)',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.6)',
    marginTop: 4,
  },
  note: {
    backgroundColor: 'rgba(183, 149, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(200, 200, 200, 0.85)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: '#0C0C10',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
  },
  saveButton: {
    width: '100%',
  },
});

