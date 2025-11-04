import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Animated, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function AuthScreen() {
  const router = useRouter();
  const { user, initialized, signIn, signUp } = useAuth();
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
      } else {
        await signIn(email, password);
      }

      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const currentUser = useAuth.getState().user;
      
      if (currentUser) {
        // Clear form
        setEmail('');
        setPassword('');
        
        // Navigate to index - it will handle routing based on onboarding status
        router.replace('/');
        return;
      } else {
        setLoading(false);
        setError('Failed to sign in. Please try again.');
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
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
          unreal
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Simulate your life.
        </Animated.Text>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={isSignUp ? 'Sign Up' : 'Sign In'}
            onPress={handleAuth}
            loading={loading}
            size="large"
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
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
    marginBottom: 48,
    fontWeight: '500',
  },
  form: {
    gap: 8,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.85)',
    fontWeight: '500',
  },
});
