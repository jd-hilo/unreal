import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_DECISION_GUIDE_KEY = 'hasSeenDecisionGuide';

/**
 * Check if user has seen the decision product guide
 */
export async function getHasSeenDecisionGuide(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HAS_SEEN_DECISION_GUIDE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading hasSeenDecisionGuide:', error);
    return false;
  }
}

/**
 * Mark that user has seen the decision product guide
 */
export async function setHasSeenDecisionGuide(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_SEEN_DECISION_GUIDE_KEY, 'true');
  } catch (error) {
    console.error('Error setting hasSeenDecisionGuide:', error);
  }
}

/**
 * Reset the guide status (for replaying from settings)
 */
export async function resetDecisionGuide(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HAS_SEEN_DECISION_GUIDE_KEY);
  } catch (error) {
    console.error('Error resetting decision guide:', error);
  }
}

