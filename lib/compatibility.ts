import { supabase } from './supabase';
import { getProfile } from './storage';
import { buildCorePack } from './relevance';
import { embedText } from './ai';

export interface CompatibilityBreakdown {
  valuesAlignment: number; // 0-100
  corePackSimilarity: number; // 0-100
  decisionStyleMatch?: number; // 0-100 (optional)
  overallScore: number; // 0-100
  insights: string[];
}

export interface CompatibilityResult {
  score: number; // 0-100
  breakdown: CompatibilityBreakdown;
}

/**
 * Calculate compatibility between two users' digital twins
 */
export async function calculateCompatibility(
  userId1: string,
  userId2: string
): Promise<CompatibilityResult> {
  console.log('[Compatibility] Calculating compatibility between', userId1, 'and', userId2);

  // Get both profiles in parallel
  const [profile1, profile2] = await Promise.all([
    getProfile(userId1),
    getProfile(userId2),
  ]);

  if (!profile1 || !profile2) {
    throw new Error('One or both profiles not found');
  }

  // Calculate values alignment (40% weight)
  const valuesAlignment = calculateValuesAlignment(
    profile1.values_json || [],
    profile2.values_json || []
  );

  // Calculate core pack similarity (40% weight)
  const corePackSimilarity = await calculateCorePackSimilarity(userId1, userId2);

  // Calculate decision style match (20% weight) - optional
  const decisionStyleMatch = calculateDecisionStyleMatch(
    profile1.core_json,
    profile2.core_json
  );

  // Calculate weighted overall score
  const overallScore = Math.round(
    valuesAlignment * 0.4 +
    corePackSimilarity * 0.4 +
    (decisionStyleMatch || 50) * 0.2
  );

  // Generate insights
  const insights = generateInsights(
    valuesAlignment,
    corePackSimilarity,
    decisionStyleMatch,
    profile1,
    profile2
  );

  const breakdown: CompatibilityBreakdown = {
    valuesAlignment,
    corePackSimilarity,
    decisionStyleMatch,
    overallScore,
    insights,
  };

  console.log('[Compatibility] Result:', {
    overallScore,
    valuesAlignment,
    corePackSimilarity,
    decisionStyleMatch,
  });

  return {
    score: overallScore,
    breakdown,
  };
}

/**
 * Calculate values alignment based on overlap
 */
function calculateValuesAlignment(
  values1: string[],
  values2: string[]
): number {
  if (values1.length === 0 && values2.length === 0) {
    return 50; // Neutral if both have no values
  }
  if (values1.length === 0 || values2.length === 0) {
    return 30; // Lower score if one has no values
  }

  // Normalize values to lowercase for comparison
  const normalized1 = values1.map(v => v.toLowerCase().trim());
  const normalized2 = values2.map(v => v.toLowerCase().trim());

  // Find intersection
  const intersection = normalized1.filter(v => normalized2.includes(v));
  const union = [...new Set([...normalized1, ...normalized2])];

  // Jaccard similarity
  const jaccard = union.length > 0 ? intersection.length / union.length : 0;

  // Scale to 0-100
  return Math.round(jaccard * 100);
}

/**
 * Calculate core pack similarity using embeddings
 */
async function calculateCorePackSimilarity(
  userId1: string,
  userId2: string
): Promise<number> {
  try {
    // Build core packs for both users
    const [corePack1, corePack2] = await Promise.all([
      buildCorePack(userId1),
      buildCorePack(userId2),
    ]);

    // Embed both core packs
    const [embedding1, embedding2] = await Promise.all([
      embedText(corePack1),
      embedText(corePack2),
    ]);

    // Calculate cosine similarity
    const cosine = cosineSimilarity(embedding1, embedding2);

    // Map cosine [-1,1] to [0,100]
    const scaled = Math.max(0, Math.min(100, ((cosine + 1) / 2) * 100));
    return Math.round(scaled);
  } catch (error) {
    console.error('[Compatibility] Error calculating core pack similarity:', error);
    return 50; // Fallback to neutral
  }
}

/**
 * Calculate decision style match
 */
function calculateDecisionStyleMatch(
  coreJson1: any,
  coreJson2: any
): number | undefined {
  const style1 = coreJson1?.onboarding_responses?.['04-style'] || coreJson1?.decision_style;
  const style2 = coreJson2?.onboarding_responses?.['04-style'] || coreJson2?.decision_style;

  if (!style1 || !style2) {
    return undefined; // Not available
  }

  // Simple string match
  if (style1.toLowerCase().trim() === style2.toLowerCase().trim()) {
    return 100;
  }

  // Partial match (contains similar keywords)
  const keywords1 = style1.toLowerCase().split(/\s+/);
  const keywords2 = style2.toLowerCase().split(/\s+/);
  const commonKeywords = keywords1.filter(k => keywords2.includes(k));
  
  if (commonKeywords.length > 0) {
    return Math.round((commonKeywords.length / Math.max(keywords1.length, keywords2.length)) * 100);
  }

  return 30; // Low match
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denominator || !isFinite(denominator)) return 0;
  return dotProduct / denominator;
}

/**
 * Generate insights based on compatibility scores
 */
function generateInsights(
  valuesAlignment: number,
  corePackSimilarity: number,
  decisionStyleMatch: number | undefined,
  profile1: any,
  profile2: any
): string[] {
  const insights: string[] = [];

  // Values insights
  if (valuesAlignment >= 70) {
    insights.push('You share many core values, creating a strong foundation for understanding.');
  } else if (valuesAlignment >= 50) {
    insights.push('You have some overlapping values, with room to learn from each other.');
  } else {
    insights.push('Your values differ significantly, which could lead to interesting perspectives.');
  }

  // Core pack insights
  if (corePackSimilarity >= 70) {
    insights.push('Your life experiences and backgrounds show strong alignment.');
  } else if (corePackSimilarity >= 50) {
    insights.push('You have complementary life experiences that could enrich each other.');
  } else {
    insights.push('Your backgrounds differ, offering unique perspectives to each other.');
  }

  // Decision style insights
  if (decisionStyleMatch !== undefined) {
    if (decisionStyleMatch >= 70) {
      insights.push('You approach decisions in similar ways, which can lead to smooth collaboration.');
    } else if (decisionStyleMatch >= 50) {
      insights.push('Your decision-making styles complement each other well.');
    } else {
      insights.push('Your different decision styles could balance each other out.');
    }
  }

  return insights;
}

/**
 * Save compatibility test to database
 */
export async function saveCompatibilityTest(data: {
  userId1: string;
  userId2: string;
  compatibilityScore: number;
  breakdown: CompatibilityBreakdown;
}): Promise<string> {
  const { data: result, error } = await supabase
    .from('compatibility_tests')
    .insert({
      user_id_1: data.userId1,
      user_id_2: data.userId2,
      compatibility_score: data.compatibilityScore,
      breakdown: data.breakdown as any,
    } as any)
    .select('id')
    .single();

  if (error) {
    console.error('[Compatibility] Error saving test:', error);
    throw error;
  }

  return result.id;
}

/**
 * Get compatibility test by ID
 */
export async function getCompatibilityTest(id: string) {
  const { data, error } = await supabase
    .from('compatibility_tests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get compatibility tests for a user
 */
export async function getUserCompatibilityTests(userId: string) {
  const { data, error } = await supabase
    .from('compatibility_tests')
    .select('*')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}







