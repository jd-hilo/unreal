import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { trackEvent, resetMixpanel, MixpanelEvents } from '@/lib/mixpanel';
import { router } from 'expo-router';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signUp: (email: string, password: string) => Promise<void>;
  appleSignIn: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  resendPhoneOtp: (phone: string) => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user || null }),

  signUp: async (email, password) => {
    trackEvent(MixpanelEvents.SIGN_UP_STARTED, { email });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      trackEvent('Sign Up Failed', { email, error: error.message });
      throw error;
    }

    // Ensure session and user are set immediately
    if (data.session) {
      set({ session: data.session, user: data.session.user || data.user });
      trackEvent(MixpanelEvents.SIGN_UP_COMPLETED, {
        user_id: data.user?.id,
        email,
      });
    }
  },
  appleSignIn: async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Sign in via Supabase Auth.
      if (credential.identityToken) {
        const {
          error,
          data: { user, session },
        } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        console.log(JSON.stringify({ error, user }, null, 2));
        if (!error) {
          // Apple only provides the user's full name on the first sign-in
          // Save it to user metadata if available
          if (credential.fullName) {
            const nameParts = [];
            if (credential.fullName.givenName)
              nameParts.push(credential.fullName.givenName);
            if (credential.fullName.middleName)
              nameParts.push(credential.fullName.middleName);
            if (credential.fullName.familyName)
              nameParts.push(credential.fullName.familyName);
            const fullName = nameParts.join(' ');
            await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                given_name: credential.fullName.givenName,
                family_name: credential.fullName.familyName,
              },
            });
          }
          
          set({ session: session, user: user });
          // For new sign ups, go to choose-method screen (AI call or manual)
   // User is signed in.
        }
      } else {
        throw new Error('No identityToken.');
      }
    } catch (e) {
      console.log('Apple Sign-In error:', e);
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      trackEvent('Sign In Failed', { email, error: error.message });
      throw error;
    }

    // Ensure session and user are set immediately
    if (data.session) {
      set({ session: data.session, user: data.session.user || data.user });
      trackEvent(MixpanelEvents.SIGN_IN_COMPLETED, {
        user_id: data.user?.id,
        email,
      });
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    trackEvent(MixpanelEvents.SIGN_OUT);
    await resetMixpanel();
    set({ session: null, user: null });
  },

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('Auth initialized, session exists:', !!session);
      set({
        session,
        user: session?.user || null,
        loading: false,
        initialized: true,
      });

      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, 'has session:', !!session);
        set({ session, user: session?.user || null, loading: false });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false, initialized: true });
    }
  },
  sendPhoneOtp: async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      trackEvent('Phone OTP Failed', { phone, error: error.message });
      throw error;
    }
  },

  verifyPhoneOtp: async (phone: string, otp: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      trackEvent('Phone OTP Verification Failed', {
        phone,
        error: error.message,
      });
      throw error;
    }

    // Set session and user upon successful verification
    if (data.session) {
      set({ session: data.session, user: data.session.user || data.user });
    }
  },

  resendPhoneOtp: async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const { error } = await supabase.auth.resend({
      type: 'sms',
      phone: formattedPhone,
    });

    if (error) {
      trackEvent('Phone OTP Resend Failed', { phone, error: error.message });
      throw error;
    }
  },
}));
