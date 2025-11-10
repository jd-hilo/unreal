import 'react-native-get-random-values';
import { Mixpanel } from 'mixpanel-react-native';
import Constants from 'expo-constants';

const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || '';

let mixpanel: Mixpanel | null = null;
let isInitialized = false;

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
export function identifyUser(userId: string): void {
  if (!mixpanel || !isInitialized) {
    console.warn('Mixpanel not initialized, skipping identify');
    return;
  }

  try {
    mixpanel.identify(userId);
    console.log('📊 User identified:', userId);
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
export function resetMixpanel(): void {
  if (!mixpanel || !isInitialized) {
    return;
  }

  try {
    mixpanel.reset();
    console.log('📊 Mixpanel reset');
  } catch (error) {
    console.error('Failed to reset Mixpanel:', error);
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

