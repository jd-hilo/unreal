import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, DollarSign, Users, ChevronRight } from 'lucide-react-native';
import { getProfile, updateProfileFields } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

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
      <View style={styles.gradientBackground}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Context Info</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gradientBackground}>
      <StatusBar style="dark" />
      {/* Background gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(232, 122, 127, 0.15)', // peach
          'rgba(132, 250, 176, 0.15)', // turquoise
          'rgba(192, 132, 252, 0.15)', // purple
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
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
            <MapPin size={20} color={Colors.textPrimary} />
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
            <DollarSign size={20} color={Colors.textPrimary} />
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
            <Users size={20} color={Colors.textPrimary} />
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
        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={({ pressed }) => [
            styles.saveButtonWrapper,
            pressed && { opacity: 0.9 }
          ]}
        >
          <View style={[
            styles.saveButton,
            loading && styles.saveButtonDisabled
          ]}>
            {!loading && (
              <LinearGradient
                colors={Colors.gradients.turquoise}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[
              styles.saveButtonText,
              loading && styles.saveButtonTextDisabled
            ]}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
            {!loading && <ChevronRight size={20} color="#FFFFFF" />}
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
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
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
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
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  inputContainer: {
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
    marginTop: 4,
  },
  note: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
  },
  saveButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  saveButtonTextDisabled: {
    color: Colors.textTertiary,
  },
});

