import { supabase } from './supabase';
import { getProfile, getRelationships, getCareerEntries, getJournals } from './storage';
import { getTwinBriefingFromCoreJson } from './twinInsights';
import { embedText } from './ai';
import type { CoreJsonData, TwinBriefing } from '@/types/database';

/** Labels for onboarding goal chip ids (aligned with journey / onboarding flows). */
const ONBOARDING_GOAL_LABELS: Record<string, string> = {
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

/** Free-text fields saved as JSON `{ content: "..." }` or plain string (onboarding career / health). */
function onboardingRichTextField(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return '';
    try {
      const parsed = JSON.parse(t) as { content?: string };
      if (parsed && typeof parsed.content === 'string' && parsed.content.trim()) {
        return parsed.content.trim();
      }
    } catch {
      return t;
    }
    return t;
  }
  if (typeof value === 'object' && value !== null && 'content' in value) {
    const c = (value as { content?: unknown }).content;
    return typeof c === 'string' ? c.trim() : '';
  }
  return '';
}

function formatOnboardingGoalsBlock(raw: unknown): string {
  let obj: { career?: string[]; health?: string[]; custom?: string[] } | null = null;
  if (raw == null) return '';
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as { career?: string[]; health?: string[]; custom?: string[] };
    } catch {
      return '';
    }
  } else if (typeof raw === 'object') {
    obj = raw as { career?: string[]; health?: string[]; custom?: string[] };
  }
  if (!obj) return '';
  const parts: string[] = [];
  if (obj.career?.length) {
    parts.push(`Career goals: ${obj.career.map((id) => ONBOARDING_GOAL_LABELS[id] || id).join(', ')}`);
  }
  if (obj.health?.length) {
    parts.push(`Health goals: ${obj.health.map((id) => ONBOARDING_GOAL_LABELS[id] || id).join(', ')}`);
  }
  if (obj.custom?.length) {
    parts.push(`Other goals: ${obj.custom.map((id) => ONBOARDING_GOAL_LABELS[id] || id).join(', ')}`);
  }
  return parts.join('\n');
}

function parseInterestsList(raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String).join(', ');
  if (typeof raw === 'string') {
    try {
      const a = JSON.parse(raw);
      if (Array.isArray(a)) return a.filter(Boolean).map(String).join(', ');
    } catch {
      return raw.trim();
    }
  }
  return '';
}

export async function buildCorePack(primaryUserId: string, allUserIds?: string[]): Promise<string> {
  const buildStartTime = performance.now();
  console.log('[CorePack] Starting buildCorePack at', new Date().toISOString());
  
  // If no additional users specified, just use the primary user
  const userIds = allUserIds && allUserIds.length > 0 ? allUserIds : [primaryUserId];
  console.log(`[CorePack] Building pack for ${userIds.length} user(s)`);
  
  // If only one user (no additional twins), use original logic
  if (userIds.length === 1) {
    const result = await buildSingleUserCorePack(primaryUserId);
    const buildEndTime = performance.now();
    console.log(`[CorePack] Single user pack built in ${(buildEndTime - buildStartTime).toFixed(2)}ms`);
    return result;
  }
  
  // Build packs for all users in parallel
  const parallelStartTime = performance.now();
  const userPacks = await Promise.all(
    userIds.map(async (userId, i) => {
      const userStartTime = performance.now();
      const isPrimary = userId === primaryUserId;
      const label = isPrimary ? 'PRIMARY TWIN' : `TWIN ${i}`;
      const userPack = await buildSingleUserCorePack(userId);
      const userEndTime = performance.now();
      console.log(`[CorePack] ${label} pack built in ${(userEndTime - userStartTime).toFixed(2)}ms`);
      return `\n=== ${label} ===\n${userPack}`;
    })
  );
  const parallelEndTime = performance.now();
  console.log(`[CorePack] All ${userIds.length} packs built in parallel in ${(parallelEndTime - parallelStartTime).toFixed(2)}ms`);
  
  const result = userPacks.join('\n\n');
  const buildEndTime = performance.now();
  console.log(`[CorePack] Total buildCorePack time: ${(buildEndTime - buildStartTime).toFixed(2)}ms`);
  console.log(`[CorePack] Result length: ${result.length} characters`);
  return result;
}

async function buildSingleUserCorePack(userId: string): Promise<string> {
  const packStartTime = performance.now();
  console.log(`[CorePack] Building single user pack for userId: ${userId}`);
  
  // Parallelize database calls for better performance
  const dbStartTime = performance.now();
  const [profile, relationships, careers] = await Promise.all([
    getProfile(userId),
    getRelationships(userId),
    getCareerEntries(userId),
  ]);
  const dbEndTime = performance.now();
  console.log(`[CorePack] Database calls completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`);

  if (!profile) {
    console.log(`[CorePack] No profile data available for userId: ${userId}`);
    return 'No profile data available yet.';
  }

  const sections: string[] = [];

  const twinBriefing = getTwinBriefingFromCoreJson(profile.core_json as CoreJsonData | undefined);

  function appendTwinBriefingBlock(b: TwinBriefing) {
    sections.push('\nTWIN BRIEFING (structured context)');
    const id = b.identity;
    const idParts: string[] = [];
    if (id.name) idParts.push(`Name: ${id.name}`);
    if (id.age) idParts.push(`Age: ${id.age}`);
    if (id.location) idParts.push(`Location: ${id.location}`);
    if (id.work) idParts.push(`Work: ${id.work}`);
    if (id.education) idParts.push(`Education: ${id.education}`);
    if (idParts.length) sections.push(idParts.join('\n'));

    const activeThreads = b.threads.filter((t) => t.status !== 'resolved');
    if (activeThreads.length) {
      sections.push('\nActive life threads:');
      activeThreads.forEach((t) => {
        sections.push(
          `- [${t.domain}] ${t.summary} (status: ${t.status})${t.stakes ? ` | Stakes: ${t.stakes}` : ''}`
        );
      });
    }
    const resolvedThreads = b.threads.filter((t) => t.status === 'resolved');
    if (resolvedThreads.length) {
      sections.push('\nResolved threads (recent context):');
      resolvedThreads.slice(0, 8).forEach((t) => {
        sections.push(`- [${t.domain}] ${t.summary}`);
      });
    }

    const L = b.lens;
    if (L.whats_important || L.how_they_decide || L.whats_draining || L.support_system) {
      sections.push('\nLens (how they think):');
      if (L.whats_important) sections.push(`What matters: ${L.whats_important}`);
      if (L.how_they_decide) sections.push(`How they decide: ${L.how_they_decide}`);
      if (L.whats_draining) sections.push(`What drains them: ${L.whats_draining}`);
      if (L.support_system) sections.push(`Support: ${L.support_system}`);
    }
    if (b.direction.near_term || b.direction.horizon) {
      sections.push('\nDirection:');
      if (b.direction.near_term) sections.push(`Near term: ${b.direction.near_term}`);
      if (b.direction.horizon) sections.push(`Horizon: ${b.direction.horizon}`);
    }
  }

  if (twinBriefing) {
    appendTwinBriefingBlock(twinBriefing);
  }

  sections.push('IDENTITY SNAPSHOT');
  if (profile.core_json?.age_range) sections.push(`Age: ${profile.core_json.age_range}`);
  if (profile.current_location) sections.push(`Current Location: ${profile.current_location}`);
  if (profile.core_json?.city) sections.push(`Location: ${profile.core_json.city}, ${profile.core_json.country || ''}`);
  if (profile.core_json?.primary_role) sections.push(`Role: ${profile.core_json.primary_role}`);
  if (profile.career_entrypoint) sections.push(`Career entrypoint: ${profile.career_entrypoint}`);
  if (profile.core_json?.employment_type) sections.push(`Employment: ${profile.core_json.employment_type}`);
  if (profile.hometown) sections.push(`Hometown: ${profile.hometown}`);
  if (profile.university) sections.push(`University: ${profile.university}`);
  if (profile.major) sections.push(`Major: ${profile.major}`);
  if (profile.net_worth) sections.push(`Net Worth: ${profile.net_worth}`);
  if (profile.political_views) sections.push(`Political Views: ${profile.political_views}`);

  if (profile.life_situation?.trim()) {
    sections.push('\nLIFE SITUATION (summary)');
    sections.push(profile.life_situation.trim());
  }

  const responses = profile.core_json?.onboarding_responses as Record<string, unknown> | undefined;
  if (responses) {
    const careerOnb = onboardingRichTextField(responses['career']);
    if (careerOnb) {
      sections.push('\nCAREER & WORK (onboarding, full description)');
      sections.push(careerOnb);
    }
    const healthOnb = onboardingRichTextField(responses['health']);
    if (healthOnb) {
      sections.push('\nHEALTH & FITNESS (onboarding, full description)');
      sections.push(healthOnb);
    }
    const goalsBlock = formatOnboardingGoalsBlock(responses['goals']);
    if (goalsBlock) {
      sections.push('\nGOALS (selected in onboarding)');
      sections.push(goalsBlock);
    }
    if (responses['gender'] != null && String(responses['gender']).trim()) {
      sections.push(`Gender: ${String(responses['gender']).trim()}`);
    }
    const interestsStr = parseInterestsList(responses['interests']);
    if (interestsStr) sections.push(`Interests: ${interestsStr}`);
    const birthYearVal = responses['00-birth-year'] ?? responses['birth-year'];
    if (birthYearVal != null && String(birthYearVal).trim()) {
      sections.push(`Birth year: ${String(birthYearVal).trim()}`);
    }

    const legacyLines: string[] = [];
    if (responses['01-now']) legacyLines.push(`Current situation: ${responses['01-now']}`);
    if (responses['02-path']) legacyLines.push(`Life path: ${responses['02-path']}`);
    if (responses['03-values']) legacyLines.push(`Core values: ${responses['03-values']}`);
    if (responses['04-style']) legacyLines.push(`Decision style: ${responses['04-style']}`);
    if (responses['05-day']) legacyLines.push(`Typical day: ${responses['05-day']}`);
    if (responses['06-stress']) legacyLines.push(`Stress response: ${responses['06-stress']}`);
    if (legacyLines.length && !twinBriefing) {
      sections.push('\nONBOARDING (legacy long-form answers)');
      sections.push(legacyLines.join('\n'));
    }
  }

  if (profile.current_health && typeof profile.current_health === 'object') {
    const ch = profile.current_health as { status?: unknown; goals?: unknown };
    const bits: string[] = [];
    if (Array.isArray(ch.status) && ch.status.length) {
      bits.push(`Health status tags: ${ch.status.map(String).join(', ')}`);
    }
    if (Array.isArray(ch.goals) && ch.goals.length) {
      bits.push(`Health goals (profile): ${ch.goals.map(String).join(', ')}`);
    }
    if (bits.length) {
      sections.push('\nHEALTH (profile fields)');
      sections.push(bits.join('\n'));
    }
  }

  if (profile.relationship_details && typeof profile.relationship_details === 'object') {
    try {
      const rd = profile.relationship_details as Record<string, unknown>;
      const relBits: string[] = [];
      if (rd.status != null && String(rd.status).trim()) relBits.push(`Relationship status: ${String(rd.status).trim()}`);
      if (rd.partnerName != null && String(rd.partnerName).trim()) {
        relBits.push(`Partner: ${String(rd.partnerName).trim()}`);
      }
      if (relBits.length) {
        sections.push('\nRELATIONSHIP');
        sections.push(relBits.join('\n'));
      }
    } catch {
      /* ignore */
    }
  }

  if (profile.dream_vision && typeof profile.dream_vision === 'object') {
    const dv = profile.dream_vision as Record<string, unknown>;
    const visionKeys = [
      'career_vision',
      'health_goals',
      'net_worth_goal',
      'dream_city',
      'dream_home',
      'relationship_status_goal',
      'partner_details',
      'family_plans',
      'hobbies_interests',
      'travel_plans',
    ];
    const visionLines: string[] = [];
    for (const k of visionKeys) {
      const v = dv[k];
      if (v != null && String(v).trim()) visionLines.push(`${k.replace(/_/g, ' ')}: ${String(v).trim()}`);
    }
    if (visionLines.length) {
      sections.push('\nDREAM SELF / VISION');
      sections.push(visionLines.join('\n'));
    }
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

  if (profile.core_json?.onboarding_responses?.['journey']) {
    try {
      const journey = JSON.parse(profile.core_json.onboarding_responses['journey']);
      sections.push('\nJOURNEY');
      sections.push(`Phases: ${journey.phases?.map((p: { title: string }) => p.title).join(' → ') || 'N/A'}`);
      sections.push(`Est. completion: ${journey.estimated_completion_weeks ?? 'N/A'} weeks`);
      if (journey.daily_task_preview?.length) {
        sections.push(`Preview tasks: ${journey.daily_task_preview.map((t: { task: string }) => t.task).join('; ')}`);
      }
    } catch {
      // ignore parse errors
    }
  }

  // Add food and activity preferences if available (from core_json.onboarding_responses)
  if (profile.core_json?.onboarding_responses?.['local-preferences']) {
    try {
      const localPrefs = JSON.parse(profile.core_json.onboarding_responses['local-preferences']);
      
      if (localPrefs.food_preferences && typeof localPrefs.food_preferences === 'object') {
        sections.push('\nFOOD PREFERENCES');
        const foodPrefs = localPrefs.food_preferences as Record<string, string>;
        if (foodPrefs.diet) sections.push(`Diet: ${foodPrefs.diet}`);
        if (foodPrefs.flavor) sections.push(`Flavor: ${foodPrefs.flavor}`);
        if (foodPrefs.texture) sections.push(`Texture: ${foodPrefs.texture}`);
        if (foodPrefs.cuisine) sections.push(`Cuisine: ${foodPrefs.cuisine}`);
        if (foodPrefs.priority) sections.push(`Priority: ${foodPrefs.priority}`);
      }

      if (localPrefs.fun_preferences && typeof localPrefs.fun_preferences === 'object') {
        sections.push('\nACTIVITY PREFERENCES');
        const funPrefs = localPrefs.fun_preferences as Record<string, string>;
        if (funPrefs.energy_level) sections.push(`Energy Level: ${funPrefs.energy_level}`);
        if (funPrefs.social_style) sections.push(`Social Style: ${funPrefs.social_style}`);
        if (funPrefs.activity_type) sections.push(`Activity Type: ${funPrefs.activity_type}`);
        if (funPrefs.vibe) sections.push(`Vibe: ${funPrefs.vibe}`);
        if (funPrefs.priority) sections.push(`Priority: ${funPrefs.priority}`);
      }
    } catch (error) {
      console.warn('Failed to parse local preferences:', error);
    }
  }

  const result = sections.join('\n');
  const packEndTime = performance.now();
  console.log(`[CorePack] Single user pack built in ${(packEndTime - packStartTime).toFixed(2)}ms, result length: ${result.length} chars`);
  return result;
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

  // 3) Recent journals (7-30 days)
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

/**
 * Compute Twin Alignment Score as cosine similarity between the user's narrative embedding
 * and an embedding of the generated Core Pack text, scaled to 0-100%.
 */
export async function computeTwinAlignment(userId: string): Promise<number> {
  const profile = await getProfile(userId);
  const corePack = await buildCorePack(userId);

  // Embed core pack representation of the twin
  console.log('[TwinAlignment] Computing for user:', userId);
  const twinEmbedding = await embedText(corePack);

  // Use stored narrative embedding if available; otherwise embed the summary text
  let personEmbedding: number[] | null = (profile?.narrative_embedding as unknown as number[]) || null;
  const hasStoredEmbedding = !!personEmbedding;
  const narrativeSummary = profile?.narrative_summary || '';
  console.log('[TwinAlignment] hasStoredEmbedding:', hasStoredEmbedding, 'summaryLen:', narrativeSummary?.length || 0);
  if (!personEmbedding) {
    // Build a robust fallback text for embedding if summary is missing
    const values = Array.isArray(profile?.values_json) ? profile?.values_json.join(', ') : '';
    const cj = profile?.core_json || {};
    const parts: string[] = [];
    if (profile?.first_name) parts.push(`Name: ${profile.first_name}`);
    if (profile?.current_location) parts.push(`Location: ${profile.current_location}`);
    if (profile?.university) parts.push(`University: ${profile.university}`);
    if (profile?.major) parts.push(`Major: ${profile.major}`);
    if (profile?.net_worth) parts.push(`Net Worth: ${profile.net_worth}`);
    if (values) parts.push(`Values: ${values}`);
    // Select a few meaningful core_json keys if present
    ['age_range', 'city', 'country', 'primary_role', 'job_sentiment', 'employment_type', 'motivation']
      .forEach((k) => {
        if (cj && typeof cj[k] === 'string') parts.push(`${k.replace('_', ' ')}: ${cj[k]}`);
      });
    const fallbackPersonText = narrativeSummary || parts.join('\n');
    console.log('[TwinAlignment] Fallback person text length:', fallbackPersonText.length);
    if (!fallbackPersonText) {
      console.warn('[TwinAlignment] No profile text available, returning neutral 50%');
      return 50;
    }
    personEmbedding = await embedText(fallbackPersonText);
  }

  // Cosine similarity
  function dot(a: number[], b: number[]): number {
    let s = 0;
    const m = Math.min(a.length, b.length);
    for (let i = 0; i < m; i++) s += a[i] * b[i];
    return s;
  }
  function norm(a: number[]): number {
    return Math.sqrt(dot(a, a));
  }
  const denom = norm(twinEmbedding) * norm(personEmbedding);
  if (!denom || !isFinite(denom)) {
    console.warn('[TwinAlignment] Invalid norm/denominator; returning 50%');
    return 50;
  }
  const cosine = dot(twinEmbedding, personEmbedding) / denom;
  console.log('[TwinAlignment] cosine:', cosine);

  // Map cosine [-1,1] to [0,100], clamp
  const scaled = Math.max(0, Math.min(1, (cosine + 1) / 2));
  return Math.round(scaled * 100);
}

/**
 * Compute Scenario-specific Alignment Score by comparing the What-If scenario summary
 * to the user's embedding (narrative or robust fallback), scaled to 0-100%.
 * This will vary per What-If scenario.
 */
export async function computeScenarioAlignment(userId: string, scenarioSummary: string, metrics?: any, biometrics?: any): Promise<number> {
  const profile = await getProfile(userId);
  console.log('[ScenarioAlignment] Computing for user:', userId, 'summaryLen:', scenarioSummary?.length || 0);

  // Build scenario text to embed: prefer summary; fallback to metrics/biometrics JSON
  let scenarioText = (scenarioSummary || '').trim();
  if (!scenarioText) {
    const parts: string[] = [];
    if (metrics) parts.push('Metrics: ' + JSON.stringify(metrics).substring(0, 4000));
    if (biometrics) parts.push('Biometrics: ' + JSON.stringify(biometrics).substring(0, 4000));
    scenarioText = parts.join('\n');
  }
  if (!scenarioText) {
    console.warn('[ScenarioAlignment] Empty scenario text; returning 50%');
    return 50;
  }
  const scenarioEmbedding = await embedText(scenarioText);

  // Build user's embedding
  let personEmbedding: number[] | null = (profile?.narrative_embedding as unknown as number[]) || null;
  const narrativeSummary = profile?.narrative_summary || '';
  if (!personEmbedding) {
    const values = Array.isArray(profile?.values_json) ? profile?.values_json.join(', ') : '';
    const cj = profile?.core_json || {};
    const parts: string[] = [];
    if (profile?.first_name) parts.push(`Name: ${profile.first_name}`);
    if (profile?.current_location) parts.push(`Location: ${profile.current_location}`);
    if (profile?.university) parts.push(`University: ${profile.university}`);
    if (profile?.major) parts.push(`Major: ${profile.major}`);
    if (profile?.net_worth) parts.push(`Net Worth: ${profile.net_worth}`);
    if (values) parts.push(`Values: ${values}`);
    ['age_range', 'city', 'country', 'primary_role', 'job_sentiment', 'employment_type', 'motivation']
      .forEach((k) => {
        if (cj && typeof cj[k] === 'string') parts.push(`${k.replace('_', ' ')}: ${cj[k]}`);
      });
    const fallbackPersonText = narrativeSummary || parts.join('\n');
    if (!fallbackPersonText) {
      console.warn('[ScenarioAlignment] No profile text available; returning 50%');
      return 50;
    }
    personEmbedding = await embedText(fallbackPersonText);
  }

  function dot(a: number[], b: number[]): number {
    let s = 0;
    const m = Math.min(a.length, b.length);
    for (let i = 0; i < m; i++) s += a[i] * b[i];
    return s;
  }
  function norm(a: number[]): number {
    return Math.sqrt(dot(a, a));
  }
  const denom = norm(scenarioEmbedding) * norm(personEmbedding);
  if (!denom || !isFinite(denom)) {
    console.warn('[ScenarioAlignment] Invalid norm/denominator; returning 50%');
    return 50;
  }
  const cosine = dot(scenarioEmbedding, personEmbedding) / denom;
  console.log('[ScenarioAlignment] cosine:', cosine);
  const scaled = Math.max(0, Math.min(1, (cosine + 1) / 2));
  return Math.round(scaled * 100);
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
