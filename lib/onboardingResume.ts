/**
 * Canonical resume route for incomplete onboarding.
 * Used by cold-start (app/index) and Home so both agree.
 * New email signups also land here from auth; "No Thanks" continues into the questionnaire.
 */
export const INCOMPLETE_ONBOARDING_ROUTE = '/onboarding/choose-method' as const;

export function getIncompleteOnboardingRoute(): typeof INCOMPLETE_ONBOARDING_ROUTE {
  return INCOMPLETE_ONBOARDING_ROUTE;
}
