import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
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
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.questionFirst}>
          Where do you currently live?
        </Text>

        <View style={styles.inputWrapper}>
          <Input
            placeholder="e.g., Austin, Texas"
            value={currentLocation}
            onChangeText={setCurrentLocation}
            containerStyle={styles.inputContainer}
            style={styles.input}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <Text style={styles.question}>
          What's your approximate net worth?
        </Text>

        <View style={styles.inputWrapper}>
          <Input
            placeholder="e.g., $45k, $250k, $2.5M"
            value={netWorth}
            onChangeText={setNetWorth}
            containerStyle={styles.inputContainer}
            style={styles.input}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <Text style={styles.question}>
          How would you describe your political views?
        </Text>

        <View style={styles.inputWrapper}>
          <Input
            placeholder="e.g., Liberal, Conservative, Independent, Moderate"
            value={politicalViews}
            onChangeText={setPoliticalViews}
            multiline
            numberOfLines={3}
            containerStyle={styles.inputContainer}
            style={styles.inputMultiline}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.saveButtonWrapper,
            loading && styles.saveButtonDisabled,
            !loading && {
              transform: [{ translateY: pressed ? 4 : 0 }],
              shadowOffset: { width: 0, height: pressed ? 0 : 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: pressed ? 2 : 8,
            }
          ]}
        >
          <View style={[
            styles.saveButton,
            !loading && styles.saveButtonActive,
            loading && styles.saveButtonDisabled
          ]}>
            {!loading ? (
              <LinearGradient
                colors={['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text style={[
              styles.saveButtonText,
              loading && styles.saveButtonTextDisabled
            ]}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
            <ChevronRight 
              size={20} 
              color={loading ? Colors.textTertiary : "#FFFFFF"} 
            />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 28,
    marginBottom: 24,
  },
  questionFirst: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 28,
    marginBottom: 24,
    marginTop: 0,
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
  inputMultiline: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 20,
    color: Colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 80,
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
  saveButtonActive: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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

