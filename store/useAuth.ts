import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { trackEvent, resetMixpanel, MixpanelEvents } from '@/lib/mixpanel';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
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
        email 
      });
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
        email 
      });
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    trackEvent(MixpanelEvents.SIGN_OUT);
    resetMixpanel();
    set({ session: null, user: null });
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth initialized, session exists:', !!session);
      set({ session, user: session?.user || null, loading: false, initialized: true });

      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, 'has session:', !!session);
        set({ session, user: session?.user || null, loading: false });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false, initialized: true });
    }
  },
}));
