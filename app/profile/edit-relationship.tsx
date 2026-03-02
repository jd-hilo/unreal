import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { getProfile, updateProfileFields, refreshLifeSituationAfterIdentityUpdate, refreshDreamProgressAfterIdentityUpdate } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { TwinUpdatingOverlay } from '@/components/TwinUpdatingOverlay';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import * as Haptics from 'expo-haptics';

export default function EditRelationshipScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const user = useAuth((state) => state.user);
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [howLong, setHowLong] = useState('');
  const [otherStatus, setOtherStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingTwin, setUpdatingTwin] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile?.relationship_details) {
        const status = profile.relationship_details.status || '';
        setRelationshipStatus(status);
        setPartnerName(profile.relationship_details.partnerName || '');
        setHowLong(profile.relationship_details.howLong || '');
        
        // If status is not one of the standard options, treat it as "Other"
        if (status && !['Single', 'Dating', 'Partnered', 'Married'].includes(status)) {
          setOtherStatus(status);
          setRelationshipStatus('Other');
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  function handleStatusSelect(value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRelationshipStatus(value);
    
    // Clear partner fields if switching to Single
    if (value === 'Single') {
      setPartnerName('');
    }
  }

  async function handleSave() {
    if (!user || !relationshipStatus) return;

    setLoading(true);
    try {
      const profileBefore = await getProfile(user.id);
      const finalStatus = relationshipStatus === 'Other' && otherStatus.trim() 
        ? otherStatus.trim() 
        : relationshipStatus;

      const relationshipDetails = {
        status: finalStatus,
        partnerName: partnerName.trim() || undefined,
        howLong: howLong.trim() || undefined,
      };

      await updateProfileFields(user.id, {
        relationship_details: relationshipDetails,
      });

      const relationshipSummary = [finalStatus, partnerName.trim(), howLong.trim()]
        .filter(Boolean)
        .join(', ');
      setUpdatingTwin(true);
      try {
        if (relationshipSummary) await refreshLifeSituationAfterIdentityUpdate(user.id, 'Relationship Status', relationshipSummary);
        await refreshDreamProgressAfterIdentityUpdate(user.id, profileBefore);
      } finally {
        setUpdatingTwin(false);
      }

      if (params.next) {
        router.push(params.next as any);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }

  const showPartnerFields = ['Dating', 'Partnered', 'Married'].includes(relationshipStatus);
  const showSingleFields = relationshipStatus === 'Single';

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
      <TwinUpdatingOverlay visible={updatingTwin} />
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
        <View style={styles.choiceWrapper}>
          <ChoiceQuestion
            question="What's your relationship status?"
            options={['Single', 'Dating', 'Partnered', 'Married', 'Other']}
            selectedValue={relationshipStatus}
            onSelect={handleStatusSelect}
            otherValue={otherStatus}
            onOtherChange={setOtherStatus}
            placeholder="Please specify..."
          />
        </View>

        {showSingleFields && (
          <>
            <Text style={[styles.question, styles.questionSpacing]}>
              How long have you been single?
            </Text>

            <View style={styles.inputWrapper}>
              <Input
                placeholder="e.g., 2 years, 6 months, 1 year"
                value={howLong}
                onChangeText={setHowLong}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                containerStyle={styles.inputContainer}
                style={styles.input}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </>
        )}

        {showPartnerFields && (
          <>
            <Text style={[styles.question, styles.questionSpacing]}>
              What's your partner's name?
            </Text>

            <View style={styles.inputWrapper}>
              <Input
                placeholder="Partner's first name"
                value={partnerName}
                onChangeText={setPartnerName}
                returnKeyType="next"
                containerStyle={styles.inputContainer}
                style={styles.input}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <Text style={[styles.question, styles.questionSpacing]}>
              How long have you been together?
            </Text>

            <View style={styles.inputWrapper}>
              <Input
                placeholder="e.g., 2 years, 6 months"
                value={howLong}
                onChangeText={setHowLong}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                containerStyle={styles.inputContainer}
                style={styles.input}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={loading || !relationshipStatus}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.saveButtonWrapper,
            (loading || !relationshipStatus) && styles.saveButtonDisabled,
            !loading && relationshipStatus && {
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
            !loading && relationshipStatus && styles.saveButtonActive,
            (loading || !relationshipStatus) && styles.saveButtonDisabled
          ]}>
            {!loading && relationshipStatus ? (
              <LinearGradient
                colors={['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text style={[
              styles.saveButtonText,
              (loading || !relationshipStatus) && styles.saveButtonTextDisabled
            ]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
            <ChevronRight 
              size={20} 
              color={(loading || !relationshipStatus) ? Colors.textTertiary : "#FFFFFF"} 
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
  questionSpacing: {
    marginTop: 32,
  },
  choiceWrapper: {
    marginBottom: 16,
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
