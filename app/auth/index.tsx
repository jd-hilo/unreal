import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
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
import { ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
export default function AuthScreen() {
  const router = useRouter();
  const { user, initialized, signIn, signUp ,appleSignIn} = useAuth();
  const { checkOnboardingStatus } = useTwin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

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
 
  async function handleAuth() {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
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

          // For new sign ups, go to choose-method screen (AI call or manual)
          router.replace('/onboarding/choose-method');
          return;
        } else {
          setIsSigningUp(false);
          setLoading(false);
          setError('Failed to create account. Please try again.');
        }
      } else {
        await signIn(email, password);

        // Wait a moment for state to update
        await new Promise((resolve) => setTimeout(resolve, 200));

        const currentUser = useAuth.getState().user;

        if (currentUser) {
          // Clear form
          setEmail('');
          setPassword('');

          // For sign in, navigate to index - it will handle routing based on onboarding status
          router.replace('/');
          return;
        } else {
          setLoading(false);
          setError('Failed to sign in. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: titleOpacity }}>
          <Image
            source={require('@/assets/images/unreallogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Simulate your life.
        </Animated.Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.inputContainer}
              style={styles.inputText}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              containerStyle={styles.inputContainer}
              style={styles.inputText}
            />
          </View>

          {isSignUp && (
            <Text style={styles.termsText}>
              By continuing to sign up you agree to our{' '}
              <Text
                style={styles.linkText}
                onPress={() =>
                  Linking.openURL(
                    'https://pastoral-supply-662.notion.site/Terms-of-Service-unreal-2a32cec59ddf80aca5e3ec91fdf8e529?source=copy_link'
                  )
                }
              >
                Terms of Service
              </Text>
              .
            </Text>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonWrapper}>
          <BlurView intensity={80} tint="dark" style={[
            styles.button,
            (loading || !email || !password) && styles.buttonDisabled
          ]}>
            {/* Classic glass border */}
            <View style={styles.glassBorder} />
            {/* Subtle inner highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassHighlight}
              pointerEvents="none"
            />
            <TouchableOpacity
              onPress={handleAuth}
              disabled={loading || !email || !password}
              activeOpacity={0.9}
              style={styles.buttonInner}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
        
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
        
        <TouchableOpacity
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  logo: {
    height: 48,
    width: 200,
    alignSelf: 'center',
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 14,
    paddingBottom: 200,
    minHeight: '100%',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(200, 200, 200, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  form: {
    gap: 4,
  },
  inputWrapper: {
    paddingVertical: 4,
  },
  inputContainer: {
    paddingVertical: 16,
  },
  inputText: {
    fontSize: 18,
    paddingVertical: 14,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 8,
  },
  buttonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(30, 50, 80, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  button: {
    borderRadius: 24,
    backgroundColor: 'rgba(20, 30, 50, 0.3)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  glassBorder: {
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
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
    zIndex: 1,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#FFFFFF',
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
  toggleButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.85)',
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(200, 200, 200, 0.75)',
    marginTop: 6,
    lineHeight: 16,
  },
  linkText: {
    color: 'rgba(135, 206, 250, 0.9)',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 14,
    backgroundColor: '#0C0C10',
    gap: 8,
  },
});
