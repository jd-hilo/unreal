import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/store/useAuth';
import { Input } from '@/components/Input';
import { ChevronRight, ArrowLeft } from 'lucide-react-native';

type ResetStep = 'token' | 'password';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyPasswordResetOtp, updatePassword } = useAuth();
  
  const [step, setStep] = useState<ResetStep>('token');
  const [email, setEmail] = useState(params.email || '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

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

  async function handleVerifyToken() {
    if (!token || token.length !== 6) {
      setError('Please enter the 6-digit code from your email');
      return;
    }

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyPasswordResetOtp(email, token);
      setStep('password');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updatePassword(newPassword);
      setSuccess(true);
      
      // Wait a moment then redirect to app
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Token Step
  if (step === 'token') {
    return (
      <LinearGradient
        colors={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: titleOpacity }}>
              <Text style={styles.title}>Enter verification code</Text>
            </Animated.View>
            <Animated.View style={{ opacity: subtitleOpacity }}>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {email || 'your email'}
              </Text>
            </Animated.View>

            <View style={styles.body}>
              <View style={styles.inputWrapper}>
                <Input
                  placeholder="000000"
                  value={token}
                  onChangeText={(text) => {
                    setToken(text.replace(/[^0-9]/g, '').slice(0, 6));
                    setError('');
                  }}
                  keyboardType="number-pad"
                  autoFocus={true}
                  maxLength={6}
                  style={styles.input}
                  containerStyle={styles.inputContainer}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>

              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          </ScrollView>

          <View style={styles.floatingButtonContainer}>
            <View style={styles.buttonWrapper}>
              <BlurView intensity={80} tint="dark" style={[
                styles.floatingButton,
                (loading || !token || token.length !== 6) && styles.floatingButtonDisabled
              ]}>
                <View style={styles.buttonGlassBorder} />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGlassHighlight}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  onPress={handleVerifyToken}
                  disabled={loading || !token || token.length !== 6}
                  activeOpacity={0.9}
                  style={[styles.floatingButtonInner, loading && styles.floatingButtonInnerCentered]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.floatingButtonText}>Verify</Text>
                      <ChevronRight size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </BlurView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // Password Step
  return (
    <LinearGradient
      colors={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      style={styles.gradientBackground}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setStep('token')}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Password updated!</Text>
              <Text style={styles.successText}>
                You're being signed in...
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Create new password</Text>
              <Text style={styles.subtitle}>
                Choose a strong password for your account
              </Text>

              <View style={styles.body}>
                <View style={styles.inputWrapper}>
                  <Input
                    placeholder="New password"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setError('');
                    }}
                    secureTextEntry
                    autoFocus={true}
                    style={styles.input}
                    containerStyle={styles.inputContainer}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Input
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError('');
                    }}
                    secureTextEntry
                    style={styles.input}
                    containerStyle={styles.inputContainer}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}
              </View>
            </>
          )}
        </ScrollView>

        {!success && (
          <View style={styles.floatingButtonContainer}>
            <View style={styles.buttonWrapper}>
              <BlurView intensity={80} tint="dark" style={[
                styles.floatingButton,
                (loading || !newPassword || !confirmPassword) && styles.floatingButtonDisabled
              ]}>
                <View style={styles.buttonGlassBorder} />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGlassHighlight}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  onPress={handleUpdatePassword}
                  disabled={loading || !newPassword || !confirmPassword}
                  activeOpacity={0.9}
                  style={[styles.floatingButtonInner, loading && styles.floatingButtonInnerCentered]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.floatingButtonText}>Update Password</Text>
                      <ChevronRight size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </BlurView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 30, 50, 0.5)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 24,
    marginBottom: 32,
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
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 37, 109, 0.2)',
  },
  buttonWrapper: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingButton: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  floatingButtonDisabled: {
    opacity: 0.6,
  },
  buttonGlassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.4)',
    pointerEvents: 'none',
  },
  buttonGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  floatingButtonInnerCentered: {
    gap: 0,
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

