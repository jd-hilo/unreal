export type HealthPayload = { method: 'text' | 'apple_health'; content: string; summary?: string };

let healthKit: {
  getRequestStatus?: () => Promise<string>;
  requestAuthorization?: (opts: unknown) => Promise<boolean>;
  getQuantitySamples?: (opts: unknown) => Promise<Array<{ value: number }>>;
} | null = null;

try {
  healthKit = require('@kingstinct/react-native-healthkit');
} catch {
  try {
    healthKit = require('react-native-health');
  } catch {
    healthKit = null;
  }
}

/**
 * Connect Apple Health and fetch a summary for onboarding.
 * Requires @kingstinct/react-native-healthkit or react-native-health (native module).
 */
export async function connectAppleHealth(): Promise<HealthPayload | null> {
  if (!healthKit?.getRequestStatus) return null;

  try {
    const status = await healthKit.getRequestStatus!();
    if (status === 'notDetermined' && healthKit.requestAuthorization) {
      const granted = await healthKit.requestAuthorization({ read: ['HKQuantityTypeIdentifierStepCount'] } as any);
      if (!granted) return null;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (!healthKit.getQuantitySamples) return null;
    const samples = (await healthKit.getQuantitySamples({
      quantityType: 'HKQuantityTypeIdentifierStepCount',
      from: weekAgo,
      to: now,
    } as any)) as Array<{ value: number }> | undefined;

    const totalSteps = Array.isArray(samples) ? samples.reduce((s, x) => s + (x?.value || 0), 0) : 0;
    const avgSteps = Math.round(totalSteps / 7);
    const summary = `Apple Health: ~${avgSteps} steps/day (7-day avg)`;
    return { method: 'apple_health', content: summary, summary };
  } catch (e) {
    console.warn('Apple Health connect failed:', e);
    return null;
  }
}

export function isAppleHealthAvailable(): boolean {
  return !!healthKit?.getRequestStatus;
}
