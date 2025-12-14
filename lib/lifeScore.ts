/**
 * Life Score Service - Orchestrates daily Life Score generation and updates
 * Baseline: 100 (can exceed 100)
 * Updates: previous Life Score + net delta from events
 */

import { fetchDailyEvents } from './newsService';
import { generateLifeScoreEvents } from './ai';
import {
  getLifeScoreData,
  updateLifeScoreData,
  getLastLifeScoreUpdate,
  getProfile,
  getJournals,
} from './storage';
import type { LifeScoreEventsData, LifeScoreEvent } from '@/types/database';

const BASELINE_LIFE_SCORE = 100;

/**
 * Check if Life Score should be refreshed (date changed since last update)
 * Refreshes at midnight user timezone
 */
export function shouldRefreshLifeScore(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true; // First time user
  
  const today = new Date().toISOString().split('T')[0];
  return lastUpdated !== today;
}

/**
 * Build user profile summary for AI prompt
 */
async function buildUserProfileSummary(userId: string): Promise<{
  profileSummary: string;
  recentJournals: Array<{ date: string; text: string }>;
}> {
  const [profile, journals] = await Promise.all([
    getProfile(userId),
    getJournals(userId, 7).catch(() => []), // Last 7 journals for more context
  ]);

  if (!profile) {
    return {
      profileSummary: 'User profile not available.',
      recentJournals: [],
    };
  }

  const bullets: string[] = [];
  
  // Basic info
  if (profile.first_name) {
    bullets.push(`- Name: ${profile.first_name}`);
  }
  
  // Career/role
  const coreJson = profile.core_json || {};
  if (coreJson.primary_role) {
    bullets.push(`- Role: ${coreJson.primary_role}`);
  }
  if (coreJson.motivation) {
    bullets.push(`- Goals: ${coreJson.motivation}`);
  }
  
  // Values
  if (profile.values_json && profile.values_json.length > 0) {
    bullets.push(`- Values: ${profile.values_json.join(', ')}`);
  }
  
  // Location
  if (profile.current_location) {
    bullets.push(`- Location: ${profile.current_location}`);
  }
  
  // Onboarding responses
  const onboarding = coreJson.onboarding_responses || {};
  if (onboarding['01-now']) {
    bullets.push(`- Current situation: ${onboarding['01-now']}`);
  }
  if (onboarding['02-path']) {
    bullets.push(`- Life journey: ${onboarding['02-path']}`);
  }
  
  // Narrative summary if available
  if (profile.narrative_summary) {
    bullets.push(`- Summary: ${profile.narrative_summary.substring(0, 200)}`);
  }
  
  // Format recent journals with dates
  const formattedJournals = journals
    .slice(0, 7)
    .map((j: any) => ({
      date: j.created_at ? new Date(j.created_at).toISOString().split('T')[0] : 'Unknown',
      text: j.text || '',
    }))
    .filter((j) => j.text.length > 0);
  
  return {
    profileSummary: bullets.join('\n') || 'User profile available but minimal details provided.',
    recentJournals: formattedJournals,
  };
}

/**
 * Generate daily Life Score events and update user's score
 */
export async function generateDailyLifeScore(userId: string): Promise<{
  score: number;
  previousScore: number | null;
  peakScore: number;
  isNewPeak: boolean;
  events: LifeScoreEventsData;
}> {
  // Fetch daily events (from NewsAPI.org or AI-generated)
  const newsEvents = await fetchDailyEvents();
  
  // Build user profile summary and get recent journals
  const { profileSummary, recentJournals } = await buildUserProfileSummary(userId);
  
  // Get current date
  const today = new Date().toISOString().split('T')[0];
  
  // Generate events using Claude
  const { events, netDelta } = await generateLifeScoreEvents({
    currentDate: today,
    newsEvents: newsEvents.map((e) => ({
      title: e.title,
      description: e.description,
    })),
    userProfileSummary: profileSummary,
    recentJournals,
  });
  
  // Get current score
  const currentData = await getLifeScoreData(userId);
  const currentScore = currentData?.lifeScore ?? BASELINE_LIFE_SCORE; // Default to 100 for first-time users
  const previousScore = currentScore;
  const currentPeak = currentData?.lifeScorePeak ?? BASELINE_LIFE_SCORE;
  
  // Calculate new score (no upper limit, but minimum is 0)
  const newScore = Math.max(0, currentScore + netDelta);
  const newPeak = Math.max(currentPeak, newScore);
  const isNewPeak = newScore > currentPeak;
  
  // Build events data structure
  const eventsData: LifeScoreEventsData = {
    date: today,
    netDelta,
    events: events as LifeScoreEvent[],
  };
  
  // Update database
  await updateLifeScoreData(userId, {
    lifeScore: newScore,
    previousScore,
    peakScore: newPeak,
    netDelta,
    events: eventsData,
  });
  
  return {
    score: newScore,
    previousScore,
    peakScore: newPeak,
    isNewPeak,
    events: eventsData,
  };
}

/**
 * Get or generate Life Score for today
 * Returns cached data if already generated today, otherwise generates new
 * Triggered on app open if not today's date
 */
export async function getOrGenerateLifeScore(userId: string): Promise<{
  score: number;
  previousScore: number | null;
  peakScore: number;
  isNewPeak: boolean;
  events: LifeScoreEventsData;
  isNew: boolean;
}> {
  const lastUpdated = await getLastLifeScoreUpdate(userId);
  
  if (shouldRefreshLifeScore(lastUpdated)) {
    // Generate new score for today
    const result = await generateDailyLifeScore(userId);
    return {
      ...result,
      isNew: true,
    };
  }
  
  // Return cached data
  const data = await getLifeScoreData(userId);
  if (!data || !data.events) {
    // Fallback: generate if no data exists
    const result = await generateDailyLifeScore(userId);
    return {
      ...result,
      isNew: true,
    };
  }
  
  // Check if this is a new peak (shouldn't happen on cached data, but just in case)
  const isNewPeak = data.lifeScore > (data.lifeScorePeak ?? BASELINE_LIFE_SCORE);
  
  return {
    score: data.lifeScore,
    previousScore: data.previousScore,
    peakScore: data.lifeScorePeak ?? BASELINE_LIFE_SCORE,
    isNewPeak,
    events: data.events,
    isNew: false,
  };
}
