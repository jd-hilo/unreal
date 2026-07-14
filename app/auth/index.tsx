import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  Pressable,
  Linking,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { Input } from '@/components/Input';
import { ChevronRight, ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { PhoneAuth } from '@/components/phoneAuth';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

export default function AuthScreen() {
  const router = useRouter();
  const { user, initialized, signIn, signUp, appleSignIn, resetPassword } = useAuth();
  const { checkOnboardingStatus } = useTwin();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [resetPasswordSent, setResetPasswordSent] = useState(false);

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
 const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  const handleAuthSuccess = () => {
    console.log('Phone auth successful!');
    setShowPhoneAuth(false);
    // Navigate to main app
  };



  // Fade in animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // If user is already signed in, redirect immediately (don't wait for onboarding check)
  useEffect(() => {
    if (!initialized || loading || isSigningUp) return;

    if (user) {
      // User is signed in, let index.tsx handle routing
      // Just redirect to index which will route properly
      router.replace('/');
    }
  }, [user, initialized, loading, router, isSigningUp]);
 
  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleContinue() {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setStep('password');
  }

  function handleBack() {
    setStep('email');
    setError('');
    setPassword('');
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(email);
      // Navigate to reset password screen with email
      router.push({
        pathname: '/auth/reset-password',
        params: { email },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
      setLoading(false);
    }
  }

  async function handleAuth() {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Try to sign in first (user exists)
      try {
        await signIn(email, password);

        // Wait a moment for state to update
        await new Promise((resolve) => setTimeout(resolve, 200));

        const currentUser = useAuth.getState().user;

        if (currentUser) {
          // Clear form
          setEmail('');
          setPassword('');
          setStep('email');

          setLoading(false);
          // For sign in, navigate to index - it will handle routing based on onboarding status
          router.replace('/');
          return;
        } else {
          setLoading(false);
          setError('Failed to sign in. Please try again.');
          return;
        }
      } catch (signInError: any) {
        // If sign in fails, check if it's because user doesn't exist
        // Supabase returns "Invalid login credentials" for both wrong password and user not found
        // We'll try to sign up - if user exists, sign up will fail with "User already registered"
        // If user doesn't exist, sign up will succeed
        
        try {
          setIsSigningUp(true);
          await signUp(email, password);

          // Wait a moment for state to update
          await new Promise((resolve) => setTimeout(resolve, 300));

          const currentUser = useAuth.getState().user;

          if (currentUser) {
            // Clear form
            setEmail('');
            setPassword('');
            setIsSigningUp(false);
            setStep('email');

            // New sign-ups: Architect chat onboarding (twin briefing), same as index routing
            setLoading(false);
            router.replace('/onboarding/architect-chat');
            return;
          } else {
            setIsSigningUp(false);
            setLoading(false);
            setError('Failed to create account. Please try again.');
            return;
          }
        } catch (signUpError: any) {
          // If sign up also fails, it means user exists but password was wrong
          setIsSigningUp(false);
          setLoading(false);
          
          // Check if it's because user already exists - this means password was wrong
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            setError('Incorrect password. Please check your password and try again.');
          } else if (signInError.message?.includes('Invalid login credentials')) {
            setError('Incorrect password. Please check your password and try again.');
          } else {
            setError(signUpError.message || signInError.message || 'Authentication failed');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
      setIsSigningUp(false);
    }
  }
  if (showPhoneAuth) {
    return (
      <PhoneAuth
        onAuthSuccess={handleAuthSuccess}
        onBack={() => setShowPhoneAuth(false)}
      />
    );
  }

  // Email Page
  if (step === 'email') {
    return (
      <View style={styles.gradientBackground}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                Let's get started
              </Text>
              <Text style={styles.subtitle}>
                Enter your email to continue
              </Text>
            </View>

            {/* Content */}
            <View style={styles.body}>
              <View style={styles.inputWrapper}>
                <Input
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus={true}
                  returnKeyType="next"
                  onSubmitEditing={handleContinue}
                  style={styles.input}
                  containerStyle={styles.inputContainer}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          </ScrollView>

          {/* Floating Action Button */}
          <View style={styles.floatingButtonContainer}>
            <Pressable
              onPress={handleContinue}
              disabled={loading || !email}
              style={({ pressed }) => [
                styles.floatingButtonWrapper,
                {
                  shadowColor: (email && !loading) ? '#25729f' : 'rgba(0, 0, 0, 0.1)',
                  transform: [{ translateY: pressed ? 2 : 0 }],
                  shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                  shadowOpacity: pressed ? 0.3 : 0.5,
                  shadowRadius: pressed ? 8 : 20,
                  elevation: pressed ? 4 : 12,
                },
                (loading || !email) && styles.floatingButtonDisabled
              ]}
            >
              {email && !loading ? (
                <LinearGradient
                  colors={['#25729f', '#62edb9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.floatingButton}
                >
                  <Text style={styles.floatingButtonText}>Continue</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.floatingButton, styles.floatingButtonDisabled]}>
                  {loading ? (
                    <Text style={styles.floatingButtonTextDisabled}>Updating</Text>
                  ) : (
                    <>
                      <Text style={styles.floatingButtonTextDisabled}>Continue</Text>
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    </>
                  )}
                </View>
              )}
            </Pressable>

            <TouchableOpacity
              onPress={appleSignIn}
              disabled={loading}
              activeOpacity={0.8}
              style={[styles.appleButton, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.appleButtonContent}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                      fill="#FFFFFF"
                    />
                  </Svg>
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Password Page
  return (
    <View style={styles.gradientBackground}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              Enter your password
            </Text>
            <Text style={styles.subtitle}>
              {`Enter the password for ${email}`}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.body}>
            <View style={styles.inputWrapper}>
              <Input
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleAuth}
                style={styles.input}
                containerStyle={styles.inputContainer}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <Text style={styles.termsText}>
              By continuing you agree to our{' '}
              <Text
                style={styles.linkText}
                onPress={() =>
                  Linking.openURL(
                    'https://pastoral-supply-662.notion.site/Terms-of-Service-mora-2a32cec59ddf80aca5e3ec91fdf8e529?source=copy_link'
                  )
                }
              >
                Terms of Service
              </Text>
              .
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
          <View style={styles.floatingButtonContainer}>
            <Pressable
              onPress={handleAuth}
              disabled={loading || !password}
              style={({ pressed }) => [
                styles.floatingButtonWrapper,
                {
                  shadowColor: (password && !loading) ? '#25729f' : 'rgba(0, 0, 0, 0.1)',
                  transform: [{ translateY: pressed ? 2 : 0 }],
                  shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                  shadowOpacity: pressed ? 0.3 : 0.5,
                  shadowRadius: pressed ? 8 : 20,
                  elevation: pressed ? 4 : 12,
                },
                (loading || !password) && styles.floatingButtonDisabled
              ]}
            >
              {password && !loading ? (
                <LinearGradient
                  colors={['#25729f', '#62edb9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.floatingButton}
                >
                  <Text style={styles.floatingButtonText}>Continue</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.floatingButton, styles.floatingButtonDisabled]}>
                  {loading ? (
                    <Text style={styles.floatingButtonTextDisabled}>Updating</Text>
                  ) : (
                    <>
                      <Text style={styles.floatingButtonTextDisabled}>Continue</Text>
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    </>
                  )}
                </View>
              )}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 36,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontFamily: Fonts.secondary.bold,
  },
  body: {
    gap: 16,
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
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
    gap: 12,
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  floatingButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  floatingButtonTextDisabled: {
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  appleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: '-apple-system',
      android: 'Roboto',
      default: 'System',
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 2,
    lineHeight: 16,
  },
  linkText: {
    color: Colors.gradients.turquoise[1],
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginTop: 2,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.gradients.turquoise[1],
    fontWeight: '600',
  },
  resetPasswordSuccess: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resetPasswordSuccessText: {
    fontSize: 14,
    color: '#10B981',
    lineHeight: 20,
  },
});
