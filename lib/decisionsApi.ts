/**
 * API helpers for decision aggregate data and suggestions
 */

import { supabase } from './supabase';
import { embedText } from './ai';
import { buildCorePack } from './relevance';
import { getDecision, getProfile } from './storage';

/**
 * Get aggregate decision statistics from similar decisions
 */
export async function getDecisionAggregate(
  decisionId: string,
  userId: string
): Promise<{
  sample_size: number;
  groups: Record<string, { probs: Record<string, number>; sample_size: number }>;
  consensus_score: number;
} | null> {
  try {
    // Get current decision
    const decision = await getDecision(decisionId);
    if (!decision || !decision.decision_embedding) {
      return null;
    }

    // Use RPC function if available, otherwise fallback
    const { data, error } = await supabase.rpc('get_decision_aggregate', {
      p_decision_id: decisionId,
      p_user_id: userId,
      p_embedding: decision.decision_embedding,
    });

    if (!error && data) {
      return data;
    }

    // Fallback: direct query (will be limited without RPC)
    return await getDecisionAggregateFallback(decisionId, userId, decision.decision_embedding as number[]);
  } catch (error) {
    console.error('Failed to get decision aggregate:', error);
    return null;
  }
}

async function getDecisionAggregateFallback(
  decisionId: string,
  userId: string,
  embedding: number[]
): Promise<{
  sample_size: number;
  groups: Record<string, { probs: Record<string, number>; sample_size: number }>;
  consensus_score: number;
} | null> {
  // This is a simplified fallback - in production you'd want the RPC function
  const MIN_SAMPLES = 10;

  // Find similar decisions (vector search)
  // Note: This requires a proper RPC function for efficient vector search
  // For now, return null to indicate not enough data
  return null;
}

/**
 * Generate decision suggestions (what-if scenarios)
 */
export async function getDecisionSuggestions(
  decisionId: string,
  userId: string,
  question: string,
  options: string[],
  currentProbs: Record<string, number>,
  factors: string[]
): Promise<{
  suggestions: Array<{
    label: string;
    probs: Record<string, number>;
    delta: string;
  }>;
} | null> {
  try {
    // Build core pack with full context for better decision-specific suggestions
    const corePack = await buildCorePack(userId);
    // Use more context (1500 chars) to better understand the user's situation and decision
    const corePackSummary = corePack.substring(0, 1500);

    // Use OpenAI to generate suggestions
    const { generateSuggestions } = await import('./ai');
    return await generateSuggestions({
      question,
      options,
      currentProbs,
      factors,
      corePackSummary,
    });
  } catch (error) {
    console.error('Failed to get decision suggestions:', error);
    return null;
  }
}

