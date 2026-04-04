import type { CoreJsonData } from '@/types/database';

export interface JourneyPhase {
  id: string;
  title: string;
  description: string;
  estimated_weeks: number;
  order: number;
}

export interface JourneyTaskPreview {
  day: number;
  date: string;
  task: string;
  category: 'Career' | 'Health' | 'Growth' | 'Personal' | 'Lifestyle' | 'Financial';
}

export interface JourneyMilestone {
  emoji: string;
  week: number;
  title: string;
}

export interface JourneyData {
  phases: JourneyPhase[];
  estimated_completion_weeks: number;
  daily_task_preview: JourneyTaskPreview[];
  milestones?: JourneyMilestone[];
}

function localDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 3 tasks per day for days 1–5 with consecutive LOCAL dates. */
export function normalizeJourneyDailyPreview(raw: JourneyTaskPreview[], anchor: Date = new Date()): JourneyTaskPreview[] {
  const byDay: Record<number, JourneyTaskPreview[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const t of raw) {
    const d = Math.min(5, Math.max(1, Number(t.day) || 1));
    byDay[d].push(t);
  }
  const out: JourneyTaskPreview[] = [];
  for (let day = 1; day <= 5; day++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + day - 1);
    const dateStrD = localDateStr(d);
    const list = (byDay[day] || []).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const t = list[i];
      if (t) {
        out.push({
          ...t,
          day,
          date: dateStrD,
          task: t.task || '',
          category: t.category || 'Growth',
        });
      } else {
        out.push({
          day,
          date: dateStrD,
          task:
            day === 1
              ? 'Take one small step toward your top goal today'
              : `Build on your day ${day - 1} momentum with one focused action`,
          category: 'Growth',
        });
      }
    }
  }
  return out;
}

/** Group preview into days 1–5 (3 tasks each after normalize). */
export function groupJourneyPreviewByDay(tasks: JourneyTaskPreview[]): { day: number; date: string; tasks: JourneyTaskPreview[] }[] {
  const day1Date = tasks.find((t) => t.day === 1)?.date ?? tasks[0]?.date;
  const anchor = day1Date ? new Date(`${day1Date}T12:00:00`) : new Date();
  const normalized = normalizeJourneyDailyPreview(tasks, anchor);
  return [1, 2, 3, 4, 5].map((day) => {
    const dayTasks = normalized.filter((t) => t.day === day);
    return { day, date: dayTasks[0]?.date ?? '', tasks: dayTasks };
  });
}

export type ProfileWithCoreJson = {
  core_json?: CoreJsonData | null;
  dream_vision?: Record<string, unknown> | null;
  first_name?: string | null;
  [key: string]: unknown;
} | null;

/**
 * True if user completed the new short onboarding flow (has journey data)
 */
export function isNewOnboardingUser(profile: ProfileWithCoreJson): boolean {
  if (!profile?.core_json?.onboarding_complete) return false;
  const journeyRaw = profile.core_json?.onboarding_responses?.['journey'];
  return journeyRaw !== undefined && journeyRaw !== '' && typeof journeyRaw === 'string';
}

/**
 * True if user completed the legacy long onboarding flow (has old-style responses)
 */
export function isLegacyOnboardingUser(profile: ProfileWithCoreJson): boolean {
  if (!profile?.core_json?.onboarding_complete) return false;
  if (profile.core_json?.onboarding_responses?.['journey']) return false;
  const responses = profile.core_json?.onboarding_responses || {};
  const legacyKeys = ['01-now', '02-path', '03-values', '04-style', '06-stress'];
  return legacyKeys.some((k) => responses[k] !== undefined && responses[k] !== '');
}

/**
 * Returns parsed journey for display, or synthetic legacy journey for old users
 */
export function getJourneyForUser(profile: ProfileWithCoreJson): JourneyData | null {
  if (!profile) return null;

  if (isNewOnboardingUser(profile)) {
    const journeyRaw = profile.core_json?.onboarding_responses?.['journey'];
    if (typeof journeyRaw === 'string') {
      try {
        const parsed = JSON.parse(journeyRaw) as JourneyData;
        if (parsed?.phases && Array.isArray(parsed.phases)) return parsed;
      } catch {
        // ignore parse errors
      }
    }
  }

  if (isLegacyOnboardingUser(profile)) {
    return buildLegacyJourney(profile);
  }

  return null;
}

function formatDreamVision(dream: Record<string, unknown> | null | undefined): string {
  if (!dream || typeof dream !== 'object') return 'Your vision.';
  const parts: string[] = [];
  if (dream.career_vision) parts.push(String(dream.career_vision));
  if (dream.financial_vision) parts.push(String(dream.financial_vision));
  if (dream.relationship_vision) parts.push(String(dream.relationship_vision));
  if (dream.health_vision) parts.push(String(dream.health_vision));
  if (dream.lifestyle_vision) parts.push(String(dream.lifestyle_vision));
  if (dream.hobbies_interests) parts.push(String(dream.hobbies_interests));
  return parts.length > 0 ? parts.join(' ') : 'Your vision.';
}

/**
 * Build a synthetic journey for legacy users from 02-path and dream_vision
 */
export function buildLegacyJourney(profile: ProfileWithCoreJson): JourneyData {
  const path = (profile?.core_json?.onboarding_responses?.['02-path'] as string) || '';
  const dream = profile?.dream_vision as Record<string, unknown> | undefined;

  return {
    phases: [
      {
        id: 'current',
        title: 'Where You Are',
        description: path || 'Your current path.',
        estimated_weeks: 0,
        order: 1,
      },
      {
        id: 'vision',
        title: 'Your Vision',
        description: formatDreamVision(dream),
        estimated_weeks: 52,
        order: 2,
      },
    ],
    estimated_completion_weeks: 52,
    daily_task_preview: [],
  };
}
