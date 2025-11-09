import { supabase } from './supabase';
import { getProfile, getRelationships, getCareerEntries, getJournals, getDecisions } from './storage';
import { embedText } from './ai';

export async function buildCorePack(primaryUserId: string, allUserIds?: string[]): Promise<string> {
  // If no additional users specified, just use the primary user
  const userIds = allUserIds && allUserIds.length > 0 ? allUserIds : [primaryUserId];
  
  // If only one user (no additional twins), use original logic
  if (userIds.length === 1) {
    return buildSingleUserCorePack(primaryUserId);
  }
  
  // Build packs for all users and combine them
  const allSections: string[] = [];
  
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const isPrimary = userId === primaryUserId;
    const label = isPrimary ? 'PRIMARY TWIN' : `TWIN ${i}`;
    
    allSections.push(`\n=== ${label} ===`);
    const userPack = await buildSingleUserCorePack(userId);
    allSections.push(userPack);
  }
  
  const result = allSections.join('\n\n');
  console.log(`Core Pack built for ${userIds.length} twins:`, result.substring(0, 200) + '...');
  return result;
}

async function buildSingleUserCorePack(userId: string): Promise<string> {
  const profile = await getProfile(userId);
  const relationships = await getRelationships(userId);
  const careers = await getCareerEntries(userId);

  if (!profile) {
    return 'No profile data available yet.';
  }

  const sections: string[] = [];

  sections.push('IDENTITY SNAPSHOT');
  if (profile.core_json?.age_range) sections.push(`Age: ${profile.core_json.age_range}`);
  if (profile.current_location) sections.push(`Current Location: ${profile.current_location}`);
  if (profile.core_json?.city) sections.push(`Location: ${profile.core_json.city}, ${profile.core_json.country || ''}`);
  if (profile.core_json?.primary_role) sections.push(`Role: ${profile.core_json.primary_role}`);
  if (profile.core_json?.employment_type) sections.push(`Employment: ${profile.core_json.employment_type}`);
  if (profile.hometown) sections.push(`Hometown: ${profile.hometown}`);
  if (profile.university) sections.push(`University: ${profile.university}`);
  if (profile.major) sections.push(`Major: ${profile.major}`);
  if (profile.net_worth) sections.push(`Net Worth: ${profile.net_worth}`);
  if (profile.political_views) sections.push(`Political Views: ${profile.political_views}`);

  // Include onboarding responses if available
  if (profile.core_json?.onboarding_responses) {
    sections.push('\nONBOARDING CONTEXT');
    const responses = profile.core_json.onboarding_responses;
    if (responses['01-now']) sections.push(`Current situation: ${responses['01-now']}`);
    if (responses['02-path']) sections.push(`Life path: ${responses['02-path']}`);
    if (responses['03-values']) sections.push(`Core values: ${responses['03-values']}`);
    if (responses['04-style']) sections.push(`Decision style: ${responses['04-style']}`);
    if (responses['05-day']) sections.push(`Typical day: ${responses['05-day']}`);
    if (responses['06-stress']) sections.push(`Stress response: ${responses['06-stress']}`);
  }

  if (profile.values_json && profile.values_json.length > 0) {
    sections.push('\nCORE VALUES');
    sections.push(profile.values_json.slice(0, 5).join(', '));
  }

  if (profile.narrative_summary) {
    sections.push('\nNARRATIVE SUMMARY');
    sections.push(profile.narrative_summary);
  }

  if (relationships && relationships.length > 0) {
    sections.push('\nKEY RELATIONSHIPS');
    relationships.slice(0, 5).forEach((rel) => {
      const parts = [rel.name, rel.relationship_type];
      if (rel.years_known) parts.push(`${rel.years_known}y`);
      if (rel.contact_frequency) parts.push(rel.contact_frequency);
      if (rel.influence !== null) parts.push(`influence: ${rel.influence.toFixed(1)}`);
      sections.push(`- ${parts.join(', ')}`);
    });
  }

  if (careers && careers.length > 0) {
    sections.push('\nCAREER SUMMARY');
    careers.slice(0, 5).forEach((career) => {
      const parts = [career.title];
      if (career.company) parts.push(`at ${career.company}`);
      if (career.start_date) {
        const endDate = career.end_date || 'present';
        parts.push(`(${career.start_date} - ${endDate})`);
      }
      if (career.satisfaction) parts.push(`satisfaction: ${career.satisfaction}/5`);
      sections.push(`- ${parts.join(' ')}`);
    });
  }

  if (profile.core_json?.motivation) {
    sections.push('\nMOTIVATION');
    sections.push(profile.core_json.motivation);
  }

  return sections.join('\n');
}

/**
 * Vector search for similar narrative content
 * Searches profiles by embedding similarity
 */
async function searchSimilarNarratives(
  userId: string,
  queryEmbedding: number[],
  limit: number = 8
): Promise<Array<{ content: string; distance: number }>> {
  try {
    // Use RPC function if available, otherwise fallback to direct query
    const { data, error } = await supabase.rpc('search_narrative_similarity', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
    });

    if (!error && data) {
      return data.map((item: any) => ({
        content: item.narrative_summary || item.content || '',
        distance: item.distance || item.similarity || 1,
      }));
    }

    // Fallback: direct query if RPC doesn't exist
    // Use pgvector cosine distance operator (<=>)
    // Note: Supabase JS client may not support vector operators directly,
    // so we'll use a manual similarity calculation as fallback
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('narrative_summary, narrative_embedding')
      .eq('user_id', userId)
      .not('narrative_embedding', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!profileError && profileData?.narrative_summary && profileData?.narrative_embedding) {
      // Calculate cosine similarity manually
      const similarity = cosineSimilarity(queryEmbedding, profileData.narrative_embedding as number[]);
      // Cosine distance = 1 - similarity (lower is better/more similar)
      return [{ content: profileData.narrative_summary, distance: 1 - similarity }];
    }

    return [];
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
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
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function buildRelevancePack(userId: string, question: string): Promise<string> {
  const bullets: string[] = [];

  // 1) Embed question for vector search
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embedText(question);
  } catch (error) {
    console.warn('Failed to embed question for vector search:', error);
  }

  // 2) Vector search over narrative summaries if embedding available
  if (queryEmbedding) {
    const similarNarratives = await searchSimilarNarratives(userId, queryEmbedding, 8);
    if (similarNarratives.length > 0) {
      bullets.push('Similar narrative contexts:');
      similarNarratives.slice(0, 5).forEach((item) => {
        const snippet = item.content.substring(0, 200);
        bullets.push(`- ${snippet}...`);
      });
    }
  }

  // 3) Past similar decisions with outcomes
  const recentDecisions = await getDecisions(userId, 5);
  if (recentDecisions.length > 0) {
    bullets.push('\nPast similar decisions:');
    recentDecisions.slice(0, 3).forEach((dec) => {
      let line = `- ${dec.question}`;
      if (dec.prediction) {
        line += ` → Chose: ${dec.prediction.prediction}`;
        if (dec.prediction.factors && dec.prediction.factors.length > 0) {
          line += ` (factors: ${dec.prediction.factors.slice(0, 2).join(', ')})`;
        }
      }
      bullets.push(line);
    });
  }

  // 4) Recent journals (7-30 days)
  const recentJournals = await getJournals(userId, 7);
  if (recentJournals.length > 0) {
    const avgMood = recentJournals.reduce((sum, j) => sum + (j.mood || 0), 0) / recentJournals.length;
    bullets.push(`\nRecent mood trend (7 days): ${avgMood.toFixed(1)}/5`);
    if (recentJournals[0]?.text) {
      const journalSnippet = recentJournals[0].text.substring(0, 150);
      bullets.push(`Latest journal: "${journalSnippet}${journalSnippet.length >= 150 ? '...' : ''}"`);
    }
  }

  // 5) Compress to fit token budget (≤800 tokens)
  let result = bullets.join('\n') || '-';
  result = truncateToTokenLimit(result, 800);

  console.log('Relevance Pack built:', result.substring(0, 200) + '...');
  return result;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) return text;

  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + '...';
}
