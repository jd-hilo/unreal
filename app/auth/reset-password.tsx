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
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';

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
      <View style={styles.gradientBackground}>
        <StatusBar style="dark" />
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
              <ArrowLeft size={24} color={Colors.textPrimary} />
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
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          </ScrollView>

          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity
              onPress={handleVerifyToken}
              disabled={loading || !token || token.length !== 6}
              activeOpacity={0.9}
              style={[
                styles.floatingButtonWrapper,
                (loading || !token || token.length !== 6) && styles.floatingButtonDisabled
              ]}
            >
              {token && token.length === 6 && !loading ? (
                <LinearGradient
                  colors={Colors.gradients.turquoise}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.floatingButton}
                >
                  <Text style={styles.floatingButtonText}>Verify</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.floatingButton, styles.floatingButtonDisabled]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textTertiary} />
                  ) : (
                    <>
                      <Text style={styles.floatingButtonTextDisabled}>Verify</Text>
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Password Step
  return (
    <View style={styles.gradientBackground}>
      <StatusBar style="dark" />
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
            <ArrowLeft size={24} color={Colors.textPrimary} />
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
                    placeholderTextColor={Colors.textTertiary}
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
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}
              </View>
            </>
          )}
        </ScrollView>

        {!success && (
          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity
              onPress={handleUpdatePassword}
              disabled={loading || !newPassword || !confirmPassword}
              activeOpacity={0.9}
              style={[
                styles.floatingButtonWrapper,
                (loading || !newPassword || !confirmPassword) && styles.floatingButtonDisabled
              ]}
            >
              {newPassword && confirmPassword && !loading ? (
                <LinearGradient
                  colors={Colors.gradients.turquoise}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.floatingButton}
                >
                  <Text style={styles.floatingButtonText}>Update Password</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.floatingButton, styles.floatingButtonDisabled]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textTertiary} />
                  ) : (
                    <>
                      <Text style={styles.floatingButtonTextDisabled}>Update Password</Text>
                      <ChevronRight size={20} color={Colors.textTertiary} />
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 32,
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
    color: Colors.textSecondary,
  },
  floatingButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
  },
  floatingButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
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
});

