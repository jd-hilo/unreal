import { Redirect } from 'expo-router';

/**
 * Hidden tab; profile is the visible "Twin" tab. Redirect keeps old /leaderboard links working.
 * to open profile. This redirect covers direct links to /(tabs)/leaderboard.
 */
export default function LeaderboardTab() {
  return <Redirect href="/(tabs)/profile" />;
}
