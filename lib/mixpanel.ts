import 'react-native-get-random-values';
import { Mixpanel } from 'mixpanel-react-native';
import Constants from 'expo-constants';
import {
  MPSessionReplay,
  MPSessionReplayConfig,
  MPSessionReplayMask,
} from '@mixpanel/react-native-session-replay';

const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || '';

let mixpanel: Mixpanel | null = null;
let isInitialized = false;
let sessionReplayInitialized = false;
let currentUserId: string | null = null;

/**
 * Initialize Mixpanel Session Replay
 * Note: Session Replay is currently in Private Beta - contact Mixpanel for access
 */
async function initializeSessionReplay(userId: string): Promise<void> {
  if (sessionReplayInitialized || !MIXPANEL_TOKEN) {
    return;
  }

  try {
    // Configure Session Replay settings
    const config = new MPSessionReplayConfig({
      wifiOnly: false, // Set to true to upload replays only on Wi-Fi
      recordingSessionsPercent: 100, // Percentage of sessions to record (0-100)
      autoStartRecording: true, // Automatically start recording sessions
      autoMaskedViews: [
        MPSessionReplayMask.Image, // Automatically mask images
        MPSessionReplayMask.Text, // Automatically mask text (for privacy)
      ],
      flushInterval: 5, // Interval in seconds to flush data
      enableLogging: __DEV__, // Enable logging in development mode
    });

    // Initialize Session Replay
    await MPSessionReplay.initialize(MIXPANEL_TOKEN, userId, config);
    sessionReplayInitialized = true;
    console.log('📹 Mixpanel Session Replay initialized');
  } catch (error) {
    // Session Replay may not be available (beta feature)
    console.warn('Failed to initialize Session Replay (may require beta access):', error);
  }
}

/**
 * Initialize Mixpanel
 */
export async function initializeMixpanel(): Promise<void> {
  if (isInitialized || !MIXPANEL_TOKEN) {
    return;
  }

  try {
    mixpanel = new Mixpanel(MIXPANEL_TOKEN, true); // trackAutomaticEvents = true
    await mixpanel.init();
    isInitialized = true;
    console.log('📊 Mixpanel initialized');
  } catch (error) {
    console.error('Failed to initialize Mixpanel:', error);
  }
}

/**
 * Track an event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (!mixpanel || !isInitialized) {
    console.warn('Mixpanel not initialized, skipping event:', eventName);
    return;
  }

  try {
    mixpanel.track(eventName, properties);
    console.log('📊 Tracked:', eventName, properties);
  } catch (error) {
    console.error('Failed to track event:', eventName, error);
  }
}

/**
 * Identify user
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!mixpanel || !isInitialized) {
    console.warn('Mixpanel not initialized, skipping identify');
    return;
  }

  try {
    mixpanel.identify(userId);
    currentUserId = userId;
    console.log('📊 User identified:', userId);

    // Initialize Session Replay for this user
    await initializeSessionReplay(userId);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!mixpanel || !isInitialized) {
    console.warn('Mixpanel not initialized, skipping set user properties');
    return;
  }

  try {
    mixpanel.getPeople().set(properties);
    console.log('📊 User properties set:', properties);
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
}

/**
 * Set a single user property
 */
export function setUserProperty(key: string, value: any): void {
  if (!mixpanel || !isInitialized) {
    return;
  }

  try {
    mixpanel.getPeople().set({ [key]: value });
  } catch (error) {
    console.error('Failed to set user property:', error);
  }
}

/**
 * Reset Mixpanel (call on logout)
 */
export async function resetMixpanel(): Promise<void> {
  if (!mixpanel || !isInitialized) {
    return;
  }

  try {
    mixpanel.reset();
    currentUserId = null;
    sessionReplayInitialized = false;
    console.log('📊 Mixpanel reset');

    // Stop Session Replay recording
    try {
      await MPSessionReplay.stopRecording();
    } catch (error) {
      // Ignore errors if Session Replay wasn't initialized
    }
  } catch (error) {
    console.error('Failed to reset Mixpanel:', error);
  }
}

/**
 * Start Session Replay recording manually
 */
export async function startSessionReplay(): Promise<void> {
  if (!sessionReplayInitialized) {
    console.warn('Session Replay not initialized');
    return;
  }

  try {
    await MPSessionReplay.startRecording();
    console.log('📹 Session Replay recording started');
  } catch (error) {
    console.error('Failed to start Session Replay:', error);
  }
}

/**
 * Stop Session Replay recording manually
 */
export async function stopSessionReplay(): Promise<void> {
  if (!sessionReplayInitialized) {
    return;
  }

  try {
    await MPSessionReplay.stopRecording();
    console.log('📹 Session Replay recording stopped');
  } catch (error) {
    console.error('Failed to stop Session Replay:', error);
  }
}

/**
 * Check if Session Replay is currently recording
 */
export async function isSessionReplayRecording(): Promise<boolean> {
  if (!sessionReplayInitialized) {
    return false;
  }

  try {
    return await MPSessionReplay.isRecording();
  } catch (error) {
    console.error('Failed to check Session Replay status:', error);
    return false;
  }
}

/**
 * Track screen view
 */
export function trackScreenView(screenName: string, properties?: Record<string, any>): void {
  trackEvent('Screen Viewed', { screen_name: screenName, ...properties });
}

/**
 * Increment a user property
 */
export function incrementUserProperty(key: string, value: number = 1): void {
  if (!mixpanel || !isInitialized) {
    return;
  }

  try {
    mixpanel.getPeople().increment(key, value);
  } catch (error) {
    console.error('Failed to increment user property:', error);
  }
}

// Predefined event tracking helpers for critical events

export const MixpanelEvents = {
  // Authentication
  SIGN_UP_STARTED: 'Sign Up Started',
  SIGN_UP_COMPLETED: 'Sign Up Completed',
  SIGN_IN_COMPLETED: 'Sign In Completed',
  SIGN_OUT: 'Sign Out',

  // Onboarding
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_COMPLETED: 'Onboarding Completed',

  // Decisions
  DECISION_CREATED: 'Decision Created',
  DECISION_ANALYZED: 'Decision Analyzed',
  DECISION_SIMULATED: 'Decision Simulated',

  // Premium
  PREMIUM_SCREEN_VIEWED: 'Premium Screen Viewed',
  PREMIUM_PURCHASE_STARTED: 'Premium Purchase Started',
  PREMIUM_PURCHASE_COMPLETED: 'Premium Purchase Completed',
  PREMIUM_PURCHASE_FAILED: 'Premium Purchase Failed',
  PREMIUM_RESTORED: 'Premium Restored',
  PREMIUM_FEATURE_BLOCKED: 'Premium Feature Blocked',

  // What-If
  WHAT_IF_CREATED: 'What If Created',
  BIOMETRICS_VIEWED: 'Biometrics Viewed',
  BIOMETRICS_BLOCKED: 'Biometrics Blocked',

  // Profile
  PROFILE_UPDATED: 'Profile Updated',
  RELATIONSHIP_ADDED: 'Relationship Added',
  JOURNAL_ENTRY_CREATED: 'Journal Entry Created',
} as const;

