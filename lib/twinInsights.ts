/**
 * Derives Twin Insights / Mindset card copy from profile + onboarding_responses.
 * Maps new onboarding (career, health, goals) onto the same cards users see on profile.
 * Prefer core_json.twin_briefing when present.
 */

import type { CoreJsonData, TwinBriefing } from '@/types/database';

export function getTwinBriefingFromCoreJson(coreJson: CoreJsonData | null | undefined): TwinBriefing | null {
  const raw = coreJson?.twin_briefing;
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as TwinBriefing;
  if (b.version !== 1 || !b.identity || !Array.isArray(b.threads)) return null;
  if (!b.lens || !b.direction) return null;
  return b;
}

const GOAL_LABELS: Record<string, string> = {
  cg1: 'Get promoted',
  cg2: 'Switch industries',
  cg3: 'Start my own thing',
  cg4: 'Land my dream role',
  cg5: 'Build expertise',
  hg1: 'Lose weight',
  hg2: 'Get stronger',
  hg3: 'Sleep better',
  hg4: 'Manage stress',
  hg5: 'Build a routine',
  xg1: 'Improve relationships',
  xg2: 'Save more money',
  xg3: 'Travel more',
  xg4: 'Learn something new',
  xg5: 'Move to a new place',
};

const ALL_HEALTH: { id: string; label: string }[] = [
  { id: 'h1', label: 'Very active' },
  { id: 'h2', label: 'Somewhat active' },
  { id: 'h3', label: 'Mostly sedentary' },
  { id: 'h4', label: 'Poor sleep' },
  { id: 'h5', label: 'Good sleep' },
  { id: 'h6', label: 'High stress' },
  { id: 'h7', label: 'Low stress' },
  { id: 'h8', label: 'Eat well' },
  { id: 'h9', label: 'Could eat better' },
  { id: 'h10', label: 'Low energy' },
  { id: 'h11', label: 'Feel strong' },
];

const STRESS_IDS = new Set(['h6', 'h7']);

export type ArchitectInsightEntry = {
  text: string;
  at: string;
  source: 'life' | 'decision';
};

function parseHealthRaw(raw: unknown): {
  method?: string;
  presetIds: string[];
  content: string;
} {
  if (raw == null) return { presetIds: [], content: '' };
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as { method?: string; presetIds?: string[]; content?: string };
      return {
        method: p.method,
        presetIds: Array.isArray(p.presetIds) ? p.presetIds : [],
        content: typeof p.content === 'string' ? p.content : '',
      };
    } catch {
      return { presetIds: [], content: raw };
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as { method?: string; presetIds?: string[]; content?: string };
    return {
      method: o.method,
      presetIds: Array.isArray(o.presetIds) ? o.presetIds : [],
      content: typeof o.content === 'string' ? o.content : '',
    };
  }
  return { presetIds: [], content: '' };
}

/** Free text from career onboarding (`{ content }` or string). */
export function extractCareerContent(onboardingResponses: Record<string, unknown>): string {
  const raw = onboardingResponses['career'];
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as { content?: string };
      if (p?.content && typeof p.content === 'string') return p.content.trim();
    } catch {
      return raw.trim();
    }
    return raw.trim();
  }
  if (typeof raw === 'object' && raw !== null && 'content' in raw) {
    const c = (raw as { content?: unknown }).content;
    return typeof c === 'string' ? c.trim() : '';
  }
  return '';
}

/** Life Situation card: twin briefing thread → dedicated column → career onboarding → legacy keys. */
export function getLifeSituationDisplay(profile: {
  life_situation?: string | null;
  core_json?: CoreJsonData | null;
}): string {
  const briefing = getTwinBriefingFromCoreJson(profile?.core_json ?? undefined);
  if (briefing) {
    const active = briefing.threads.filter((t) => t.status !== 'resolved');
    const first = active[0]?.summary?.trim();
    if (first) return first;
  }
  const col = profile?.life_situation?.trim();
  if (col) return col;
  const responses = (profile?.core_json?.onboarding_responses || {}) as Record<string, unknown>;
  const career = extractCareerContent(responses);
  if (career) return career;
  const n = responses['02-now'] ?? responses['01-now'];
  return typeof n === 'string' ? n.trim() : '';
}

/** Core Values card: briefing lens → column → legacy values → goal chip labels. */
export function getCoreValuesDisplay(profile: {
  core_value?: string | null;
  core_json?: CoreJsonData | null;
}): string {
  const briefing = getTwinBriefingFromCoreJson(profile?.core_json ?? undefined);
  if (briefing?.lens?.whats_important?.trim()) return briefing.lens.whats_important.trim();
  const cv = profile?.core_value?.trim();
  if (cv) return cv;
  const responses = (profile?.core_json?.onboarding_responses || {}) as Record<string, unknown>;
  const v = responses['01-values'] ?? responses['03-values'];
  if (typeof v === 'string' && v.trim()) return v.trim();

  const goalsRaw = responses['goals'];
  let goals: { career?: string[]; health?: string[]; custom?: string[] } | null = null;
  if (typeof goalsRaw === 'string') {
    try {
      goals = JSON.parse(goalsRaw) as { career?: string[]; health?: string[]; custom?: string[] };
    } catch {
      return '';
    }
  } else if (goalsRaw && typeof goalsRaw === 'object') {
    goals = goalsRaw as { career?: string[]; health?: string[]; custom?: string[] };
  }
  if (!goals) return '';
  const ids = [...(goals.career || []), ...(goals.health || []), ...(goals.custom || [])];
  if (ids.length === 0) return '';
  return ids.map((id) => GOAL_LABELS[id] || id).join(', ');
}

export function getHealthWellnessSummary(onboardingResponses: Record<string, unknown>): {
  text: string;
  completed: boolean;
} {
  const parsed = parseHealthRaw(onboardingResponses['health']);
  if (parsed.method === 'apple_health' && parsed.content.trim()) {
    return { text: parsed.content.trim(), completed: true };
  }
  const ids = parsed.presetIds;
  const wellnessIds = ids.filter((id) => !STRESS_IDS.has(id));
  if (wellnessIds.length === 0) {
    if (parsed.content && !ids.some((id) => STRESS_IDS.has(id))) {
      return { text: parsed.content, completed: parsed.content.length > 0 };
    }
    return { text: '', completed: false };
  }
  const labels = wellnessIds
    .map((id) => ALL_HEALTH.find((h) => h.id === id)?.label)
    .filter(Boolean) as string[];
  return { text: labels.join(', '), completed: labels.length > 0 };
}

export function getHealthStressSummary(onboardingResponses: Record<string, unknown>): {
  text: string;
  completed: boolean;
} {
  const parsed = parseHealthRaw(onboardingResponses['health']);
  const stressPick = parsed.presetIds.filter((id) => STRESS_IDS.has(id));
  if (stressPick.length > 0) {
    const labels = stressPick
      .map((id) => ALL_HEALTH.find((h) => h.id === id)?.label)
      .filter(Boolean) as string[];
    return { text: labels.join(', '), completed: true };
  }
  const legacy = onboardingResponses['06-stress'];
  if (typeof legacy === 'string' && legacy.trim()) {
    return { text: legacy.trim(), completed: true };
  }
  return { text: '', completed: false };
}

/** Life journey / path: briefing direction → column → legacy. */
export function getLifeJourneyDisplay(profile: {
  life_journey?: string | null;
  core_json?: CoreJsonData | null;
}): string {
  const b = getTwinBriefingFromCoreJson(profile?.core_json ?? undefined);
  if (b?.direction?.horizon?.trim()) return b.direction.horizon.trim();
  if (b?.direction?.near_term?.trim()) return b.direction.near_term.trim();
  const responses = (profile?.core_json?.onboarding_responses || {}) as Record<string, unknown>;
  const lj = profile?.life_journey?.trim();
  if (lj) return lj;
  const p = responses['02-path'];
  return typeof p === 'string' ? p.trim() : '';
}

/** Decision style: briefing lens → legacy onboarding. */
export function getDecisionStyleDisplay(profile: { core_json?: CoreJsonData | null }): string {
  const b = getTwinBriefingFromCoreJson(profile?.core_json ?? undefined);
  if (b?.lens?.how_they_decide?.trim()) return b.lens.how_they_decide.trim();
  const responses = (profile?.core_json?.onboarding_responses || {}) as Record<string, unknown>;
  const s = responses['04-style'];
  return typeof s === 'string' ? s.trim() : '';
}

export function getArchitectInsightLog(coreJson: CoreJsonData | null | undefined): ArchitectInsightEntry[] {
  const raw = coreJson?.architect_insight_log;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object' && typeof (x as ArchitectInsightEntry).text === 'string')
    .map((x) => ({
      text: String((x as ArchitectInsightEntry).text),
      at: typeof (x as ArchitectInsightEntry).at === 'string' ? (x as ArchitectInsightEntry).at : '',
      source: ((x as ArchitectInsightEntry).source === 'decision' ? 'decision' : 'life') as
        | 'life'
        | 'decision',
    }))
    .slice(0, 15);
}
