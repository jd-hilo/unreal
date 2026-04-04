/**
 * Pre-fill career simulation from profile, journey, and architect context.
 * Per REDESIGN_ONBOARDING_AND_APP_SPEC.md §6.
 */

import { getProfile, getCareerEntries } from './storage';

export interface CareerSimPrefill {
  currentRole: string;
  company: string;
  salary: string | null;
  pathType: 'stay' | 'switch' | 'startup';
  timeHorizon: 5 | 10 | 15;
}

/**
 * Extract role from onboarding career content (e.g. "Senior Engineer at Acme" -> "Senior Engineer").
 */
function roleFromCareerContent(content: string): string {
  if (!content?.trim()) return '';
  const at = content.toLowerCase().indexOf(' at ');
  if (at > 0) return content.slice(0, at).trim();
  return content.trim();
}

/**
 * Extract company from onboarding career content (e.g. "Senior Engineer at Acme" -> "Acme").
 */
function companyFromCareerContent(content: string): string {
  if (!content?.trim()) return '';
  const at = content.toLowerCase().indexOf(' at ');
  if (at > 0) return content.slice(at + 4).trim();
  return '';
}

/**
 * Load prefill data for career simulation from profile.
 */
export async function getCareerSimPrefill(userId: string): Promise<CareerSimPrefill> {
  const [profile, careerEntries] = await Promise.all([
    getProfile(userId),
    getCareerEntries(userId).catch(() => []),
  ]);

  let currentRole = '';
  let company = '';
  let salary: string | null = null;

  // Current role: primary_role > career_entries[0].title > onboarding career
  currentRole = (profile?.core_json as any)?.primary_role || '';
  if (!currentRole && careerEntries?.length > 0 && (careerEntries[0] as any)?.title) {
    currentRole = (careerEntries[0] as any).title;
  }
  if (!currentRole) {
    const careerRaw = profile?.core_json?.onboarding_responses?.['career'];
    if (careerRaw) {
      try {
        const parsed = typeof careerRaw === 'string' ? JSON.parse(careerRaw) : careerRaw;
        const content = parsed?.content || (typeof careerRaw === 'string' ? careerRaw : '');
        currentRole = roleFromCareerContent(String(content));
      } catch {
        if (typeof careerRaw === 'string') currentRole = roleFromCareerContent(careerRaw);
      }
    }
  }

  // Company: career_entries[0].company > from career text
  if (careerEntries?.length > 0 && (careerEntries[0] as any)?.company) {
    company = (careerEntries[0] as any).company;
  }
  if (!company) {
    const careerRaw = profile?.core_json?.onboarding_responses?.['career'];
    if (careerRaw) {
      try {
        const parsed = typeof careerRaw === 'string' ? JSON.parse(careerRaw) : careerRaw;
        const content = parsed?.content || (typeof careerRaw === 'string' ? careerRaw : '');
        company = companyFromCareerContent(String(content));
      } catch {
        if (typeof careerRaw === 'string') company = companyFromCareerContent(careerRaw);
      }
    }
  }

  return {
    currentRole,
    company,
    salary,
    pathType: 'stay',
    timeHorizon: 10,
  };
}
