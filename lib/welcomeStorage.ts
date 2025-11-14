import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_WELCOME_KEY = 'hasSeenWelcome';

/**
 * Check if user has seen the welcome screen
 */
export async function getHasSeenWelcome(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HAS_SEEN_WELCOME_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading hasSeenWelcome:', error);
    return false;
  }
}

/**
 * Mark that user has seen the welcome screen
 */
export async function setHasSeenWelcome(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_SEEN_WELCOME_KEY, 'true');
  } catch (error) {
    console.error('Error setting hasSeenWelcome:', error);
  }
}

