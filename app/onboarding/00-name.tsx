import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { updateProfileFields, getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts } from '@/constants/Theme';

export default function OnboardingStep0() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - name');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
    
    // Track onboarding started (first step)
    trackEvent(MixpanelEvents.ONBOARDING_STARTED);
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      if (profile?.first_name) {
        setFirstName(profile.first_name);
        setLoading(false);
        return;
      }

      // Check if user signed up with Apple
      const isAppleSignIn = user.app_metadata?.provider === 'apple';
      console.log('Apple sign-in check:', {
        isAppleSignIn,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      });
      
      if (isAppleSignIn) {
        // Get fresh session from Supabase to ensure we have latest metadata
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        const freshUser = freshSession?.user;
        
        // Check for Apple name data - prioritize given_name (first name) over full_name
        const appleGivenName = 
          (freshUser?.user_metadata as any)?.given_name ||
          (user.user_metadata as any)?.given_name;
        
        const appleFullName = 
          (freshUser?.user_metadata as any)?.full_name || 
          (user.user_metadata as any)?.full_name;
        
        console.log('Apple name found:', {
          given_name: appleGivenName,
          full_name: appleFullName,
          fromFreshUser: !!freshUser
        });
        
        // Skip this step if user signed up with Apple (even if no name was provided)
        console.log('User signed up with Apple, skipping name step');
        
        // If Apple provided a name, save it to profile
        // Prefer given_name (first name) over extracting from full_name
        if (appleGivenName && appleGivenName.trim()) {
          // Use given_name directly as first name
          await updateProfileFields(user.id, { first_name: appleGivenName.trim() });
        } else if (appleFullName && appleFullName.trim()) {
          // Fallback to extracting first name from full_name if given_name not available
          const firstNameFromFull = appleFullName.split(' ')[0] || appleFullName;
          await updateProfileFields(user.id, { first_name: firstNameFromFull.trim() });
        }
        
        // Track onboarding step completed
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '00-name',
          step_name: 'Name',
          skipped: true,
          method: 'apple',
          hasName: !!(appleGivenName || appleFullName)
        });
        
        setLoading(false);
        // Automatically proceed to next step
        router.replace('/onboarding/00-birth-year');
        return;
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    if (user && firstName.trim()) {
      try {
        console.log('Saving first name:', firstName.trim());
        console.log('User ID:', user.id);
        
        // Only save to the first_name column - don't use saveOnboardingResponse
        // because it will overwrite and set first_name back to null
        const result = await updateProfileFields(user.id, { first_name: firstName.trim() });
        console.log('updateProfileFields result:', result);
        
        // Track onboarding step completed
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '00-name',
          step_name: 'Name'
        });
      } catch (error) {
        console.error('Failed to save first name:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    }
    router.push('/onboarding/00-birth-year');
  }

  return (
    <OnboardingScreen
      title="What's your first name?"
      progress={0.25}
      onNext={handleNext}
      canContinue={firstName.trim().length > 0}
    >
      <View style={styles.inputWrapper}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>First name</Text>
          <TextInput
            placeholder="Enter name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleNext}
            style={styles.input}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>
      
        <Text style={styles.helperText}>
        The more information, the more accurate your digital twin will be.
        </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    marginTop: 8,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: Fonts.secondary.bold,
  },
  input: {
    fontSize: 22,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontFamily: Fonts.secondary.regular,
  },
  helperText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 16,
    fontWeight: '400',
  },
});

