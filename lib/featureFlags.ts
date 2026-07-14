import Constants from 'expo-constants';

/**
 * Decision-first Home: hub tiles, hide dream-self daily loop on Home.
 * Default true. Set EXPO_PUBLIC_HOME_DECISION_FIRST=false to restore legacy Home.
 */
export function isHomeDecisionFirst(): boolean {
  const extra = Constants.expoConfig?.extra as { homeDecisionFirst?: boolean } | undefined;
  if (extra?.homeDecisionFirst !== undefined) {
    return Boolean(extra.homeDecisionFirst);
  }
  const env = process.env.EXPO_PUBLIC_HOME_DECISION_FIRST;
  if (env === '0' || env === 'false') return false;
  return true;
}
