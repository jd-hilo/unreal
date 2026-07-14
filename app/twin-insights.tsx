import { ProfileShell } from '@/app/(tabs)/profile';

/**
 * Stack route: digestible Twin insights (same content as the Twin tab, with a back button).
 * Home hub “Twin” opens here so it feels like a dedicated insights screen.
 */
export default function TwinInsightsScreen() {
  return <ProfileShell mode="twin_insights" />;
}
