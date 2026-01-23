import 'react-native-get-random-values';
import { Mixpanel } from 'mixpanel-react-native';
import Constants from 'expo-constants';

const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || '';

let mixpanel: Mixpanel | null = null;
let isInitialized = false;
let currentUserId: string | null = null;
const pendingEvents: Array<{ name: string; properties?: Record<string, any> }> = [];
const pendingUserProperties: Array<Record<string, any>> = [];
let pendingUserId: string | null = null;

/**
 * Initialize Mixpanel
 */
export async function initializeMixpanel(): Promise<void> {
  if (isInitialized || !MIXPANEL_TOKEN) {
    if (!MIXPANEL_TOKEN) {
      console.warn('⚠️ Mixpanel token not found in app config');
    }
    return;
  }

  try {
    mixpanel = new Mixpanel(MIXPANEL_TOKEN, true); // trackAutomaticEvents = true
    await mixpanel.init();
    isInitialized = true;
    console.log('📊 Mixpanel initialized successfully');
    console.log('📊 Mixpanel instance:', !!mixpanel, 'isInitialized:', isInitialized);

    // Process pending events
    if (pendingEvents.length > 0) {
      console.log(`📊 Processing ${pendingEvents.length} pending Mixpanel events`);
      pendingEvents.forEach((event) => {
        try {
          mixpanel?.track(event.name, event.properties);
          console.log('📊 Sent pending event:', event.name);
        } catch (e) {
          console.error('Failed to track pending event:', event.name, e);
        }
      });
      pendingEvents.length = 0; // Clear queue
      // Flush after processing pending events
      try {
        mixpanel?.flush();
        console.log('📊 Flushed pending events');
      } catch (e) {
        console.error('Failed to flush pending events:', e);
      }
    }

    // Process pending user identification
    if (pendingUserId) {
      try {
        mixpanel?.identify(pendingUserId);
        currentUserId = pendingUserId;
        console.log('📊 Pending user identified:', pendingUserId);
        pendingUserId = null;
      } catch (e) {
        console.error('Failed to identify pending user:', e);
      }
    }

    // Process pending user properties
    if (pendingUserProperties.length > 0) {
      console.log(`📊 Processing ${pendingUserProperties.length} pending user property sets`);
      const mergedProperties = Object.assign({}, ...pendingUserProperties);
      try {
        mixpanel?.getPeople().set(mergedProperties);
        console.log('📊 Pending user properties set:', mergedProperties);
      } catch (e) {
        console.error('Failed to set pending user properties:', e);
      }
      pendingUserProperties.length = 0; // Clear queue
    }
  } catch (error) {
    console.error('Failed to initialize Mixpanel:', error);
    isInitialized = false;
    mixpanel = null;
  }
}

/**
 * Track an event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (!mixpanel || !isInitialized) {
    if (MIXPANEL_TOKEN) {
      // Queue event if we have a token but just aren't ready yet
      console.log('⏳ Mixpanel not ready, queueing event:', eventName);
      pendingEvents.push({ name: eventName, properties });
    } else {
      console.warn('⚠️ Mixpanel not initialized and no token, skipping event:', eventName);
    }
    return;
  }

  try {
    // Ensure user is identified before tracking (important for proper event attribution)
    if (!currentUserId) {
      console.warn('⚠️ Tracking event before user identification:', eventName);
    }
    
    mixpanel.track(eventName, properties);
    console.log('📊 Tracked:', eventName, properties, {
      userId: currentUserId,
      isInitialized,
      hasMixpanel: !!mixpanel
    });
    
    // Flush immediately to ensure events are sent (especially important for React Native)
    mixpanel.flush();
  } catch (error) {
    console.error('Failed to track event:', eventName, error);
  }
}

/**
 * Identify user
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!mixpanel || !isInitialized) {
    if (MIXPANEL_TOKEN) {
      // Queue userId if we have a token but just aren't ready yet
      console.log('⏳ Mixpanel not ready, queueing user identification');
      pendingUserId = userId;
    } else {
      console.warn('⚠️ Mixpanel not initialized and no token, skipping identify');
    }
    return;
  }

  try {
    mixpanel.identify(userId);
    currentUserId = userId;
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
    if (MIXPANEL_TOKEN) {
      // Queue properties if we have a token but just aren't ready yet
      console.log('⏳ Mixpanel not ready, queueing user properties');
      pendingUserProperties.push(properties);
    } else {
      console.warn('⚠️ Mixpanel not initialized and no token, skipping user properties');
    }
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
    if (MIXPANEL_TOKEN) {
      // Queue property if we have a token but just aren't ready yet
      pendingUserProperties.push({ [key]: value });
    }
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

/**
 * Flush pending events to Mixpanel
 * Useful for ensuring events are sent before app closes
 */
export function flushMixpanel(): void {
  if (!mixpanel || !isInitialized) {
    console.warn('⚠️ Cannot flush: Mixpanel not initialized');
    return;
  }

  try {
    mixpanel.flush();
    console.log('📊 Mixpanel events flushed');
  } catch (error) {
    console.error('Failed to flush Mixpanel:', error);
  }
}

/**
 * Get Mixpanel status for debugging
 */
export function getMixpanelStatus(): {
  isInitialized: boolean;
  hasMixpanel: boolean;
  hasToken: boolean;
  currentUserId: string | null;
  pendingEventsCount: number;
} {
  return {
    isInitialized,
    hasMixpanel: !!mixpanel,
    hasToken: !!MIXPANEL_TOKEN,
    currentUserId,
    pendingEventsCount: pendingEvents.length,
  };
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
  DECISION_SHARED: 'Decision Shared',
  DECISION_SHARE_OPENED: 'Decision Share Opened',
  DECISION_TWIN_ADDED: 'Decision Twin Added',

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

  // Reviews
  REVIEW_PROMPT_REQUESTED: 'Review Prompt Requested',

  // 2026 Predictions
  YEAR_PREDICTION_BANNER_CLICKED: 'Year Prediction Banner Clicked',
  YEAR_PREDICTION_INTRO_VIEWED: 'Year Prediction Intro Viewed',
  YEAR_PREDICTION_SCENARIO_SELECTED: 'Year Prediction Scenario Selected',
  YEAR_PREDICTION_GENERATED: 'Year Prediction Generated',
  YEAR_PREDICTION_VIEWED: 'Year Prediction Viewed',
  YEAR_PREDICTION_REGENERATED: 'Year Prediction Regenerated',
  YEAR_PREDICTION_SHARED: 'Year Prediction Shared',
  YEAR_PREDICTION_PREMIUM_BLOCKED: 'Year Prediction Premium Blocked',

  // Onboarding Completion
  ONBOARDING_COMPLETE_VIEWED: 'Onboarding Complete Viewed',
  ONBOARDING_COMPLETE_DECIDE_CLICKED: 'Onboarding Complete Decide Clicked',
  ONBOARDING_COMPLETE_EXPLORE_CLICKED: 'Onboarding Complete Explore Clicked',

  // Compatibility Tests
  COMPATIBILITY_ADD_CLICKED: 'Compatibility Add Clicked',
  COMPATIBILITY_INFO_CONTINUED: 'Compatibility Info Continued',
  COMPATIBILITY_TWIN_FOUND: 'Compatibility Twin Found',
  COMPATIBILITY_TWIN_ADDED: 'Compatibility Twin Added',
  COMPATIBILITY_TEST_STARTED: 'Compatibility Test Started',
  COMPATIBILITY_TEST_COMPLETED: 'Compatibility Test Completed',
  COMPATIBILITY_TEST_VIEWED: 'Compatibility Test Viewed',
  COMPATIBILITY_TEST_SHARED: 'Compatibility Test Shared',
  COMPATIBILITY_INVITE_SENT: 'Compatibility Invite Sent',
  COMPATIBILITY_REPORT_RECEIVED: 'Compatibility Report Received',

  // Twin Society
  TWIN_SOCIETY_MODAL_VIEWED: 'Twin Society Modal Viewed',
  TWIN_SOCIETY_JOIN_CLICKED: 'Twin Society Join Clicked',
  TWIN_SOCIETY_MODAL_CLOSED: 'Twin Society Modal Closed',

  // Onboarding
  PERSONAL_RECOMMENDATIONS_SELECTED: 'Personal Recommendations Selected',

  // Screen Views
  SCREEN_VIEWED: 'Screen Viewed',
  BUTTON_CLICKED: 'Button Clicked',
} as const;

