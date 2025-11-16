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
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { Input } from '@/components/Input';
import { ChevronRight } from 'lucide-react-native';
export default function AuthScreen() {
  const router = useRouter();
  const { user, initialized, signIn, signUp ,appleSignIn} = useAuth();
  const { checkOnboardingStatus } = useTwin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!initialized || loading) return;

    if (user) {
      // User is signed in, let index.tsx handle routing
      // Just redirect to index which will route properly
      router.replace('/');
    }
  }, [user, initialized, loading, router]);
 
  async function handleAuth() {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email, password);

        // Wait a moment for state to update
        await new Promise((resolve) => setTimeout(resolve, 200));

        const currentUser = useAuth.getState().user;

        if (currentUser) {
          // Clear form
          setEmail('');
          setPassword('');

          // For new sign ups, go to onboarding method choice screen
          router.replace('/onboarding/choose-method');
          return;
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
      <View style={styles.content}>
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
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading || !email || !password}
          activeOpacity={0.9}
          style={[
            styles.button,
            { shadowColor: (!loading && email && password) ? '#4169E1' : 'rgba(100, 100, 100, 0.3)' },
            (loading || !email || !password) && styles.buttonDisabled
          ]}
        >
          <LinearGradient
            colors={(!loading && email && password) ? ['#4169E1', '#1E40AF', '#1E3A8A'] : ['rgba(100, 100, 100, 0.5)', 'rgba(80, 80, 80, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
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
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={appleSignIn}
          disabled={loading}
          activeOpacity={0.9}
          style={[styles.appleButton, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
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
  content: {
    flex: 1,
    padding: 24,
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
  button: {
    borderRadius: 24,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 12,
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleButton: {
    marginTop: 5,
    alignItems: 'center',
    paddingVertical: 8,
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
    color: '#4169E1',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#0C0C10',
    gap: 8,
  },
});
