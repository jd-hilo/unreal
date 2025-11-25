import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getProfile, getUserInterests, getRelationships, getCareerEntries, getJournals, getDecisions } from './storage';

const apiKey = 
  Constants.expoConfig?.extra?.openaiApiKey || 
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY || 
  '';

const DEV_MODE = !apiKey;

let openaiInstance: any = null;

function getOpenAI() {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!openaiInstance) {
    const OpenAI = require('openai').default;
    openaiInstance = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  return openaiInstance;
}

export interface Recommendation {
  title: string;
  description: string;
  rank: number;
}

const RECOMMENDATION_CATEGORIES = {
  local: {
    title: 'Local Recommendations',
    description: 'Restaurants, bars, and things to do near you',
    emoji: '📍',
    requiresLocation: true,
  },
  side_hustles: {
    title: 'Side Hustles',
    description: 'Ways to earn extra income based on your skills',
    emoji: '💼',
    requiresLocation: false,
  },
  music_artists: {
    title: 'Musical Artists',
    description: 'Artists and bands you might love',
    emoji: '🎵',
    requiresLocation: false,
  },
  books: {
    title: 'Books',
    description: 'Books tailored to your interests',
    emoji: '📚',
    requiresLocation: false,
  },
  podcasts: {
    title: 'Podcasts',
    description: 'Podcasts that match your curiosity',
    emoji: '🎙️',
    requiresLocation: false,
  },
  travel_destinations: {
    title: 'Travel Destinations',
    description: 'Places you should visit',
    emoji: '✈️',
    requiresLocation: false,
  },
  fitness_activities: {
    title: 'Fitness Activities',
    description: 'Workouts and activities for your lifestyle',
    emoji: '💪',
    requiresLocation: false,
  },
  hobbies: {
    title: 'Hobbies',
    description: 'New hobbies to explore',
    emoji: '🎨',
    requiresLocation: false,
  },
} as const;

export type RecommendationCategory = keyof typeof RECOMMENDATION_CATEGORIES;

export function getRecommendationCategories() {
  return RECOMMENDATION_CATEGORIES;
}

/**
 * Generate personalized recommendations for a user based on their interests and profile
 */
export async function generateRecommendations(
  userId: string,
  category: RecommendationCategory,
  location?: { latitude: number; longitude: number } | string
): Promise<Recommendation[]> {
  if (DEV_MODE) {
    return mockRecommendations(category);
  }

  try {
    // Fetch comprehensive user data in parallel
    const [profile, userInterests, relationships, careers, journals, decisions] = await Promise.all([
      getProfile(userId),
      getUserInterests(userId),
      getRelationships(userId).catch(() => []),
      getCareerEntries(userId).catch(() => []),
      getJournals(userId, 10).catch(() => []), // Last 10 journals for context
      getDecisions(userId, 5).catch(() => []), // Last 5 decisions for context
    ]);

    // Build context from user interests (multi-select format)
    const interestContext = buildInterestContext(userInterests);
    
    // Build comprehensive profile context with all user data
    const profileContext = buildProfileContext(profile, relationships, careers, journals, decisions);
    
    // Build location context
    const locationContext = buildLocationContext(location, profile);

    // Generate recommendations using AI
    const recommendations = await callAIForRecommendations(
      category,
      interestContext,
      profileContext,
      locationContext
    );

    // Cache recommendations in database
    await cacheRecommendations(userId, category, recommendations, locationContext);

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

function buildInterestContext(userInterests: any[]): string {
  if (!userInterests || userInterests.length === 0) {
    return 'No user interests available.';
  }

  // Group by category
  const byCategory: Record<string, any[]> = {};
  userInterests.forEach((interest) => {
    if (!byCategory[interest.category]) {
      byCategory[interest.category] = [];
    }
    byCategory[interest.category].push(interest);
  });

  let context = 'User Interests:\n\n';
  
  Object.entries(byCategory).forEach(([category, interests]) => {
    const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    context += `${categoryLabel}:\n`;
    interests.forEach((interest) => {
      context += `  - ${interest.item_name}`;
      if (interest.item_metadata?.description) {
        context += ` (${interest.item_metadata.description})`;
      }
      context += '\n';
    });
    context += '\n';
  });

  return context;
}

function buildProfileContext(
  profile: any,
  relationships: any[] = [],
  careers: any[] = [],
  journals: any[] = [],
  decisions: any[] = []
): string {
  if (!profile) {
    return 'No profile data available.';
  }

  const sections: string[] = [];

  // IDENTITY & BASIC INFO
  sections.push('=== IDENTITY & CORE PROFILE ===');
  if (profile.first_name) sections.push(`Name: ${profile.first_name}`);
  if (profile.core_json?.age_range) sections.push(`Age: ${profile.core_json.age_range}`);
  if (profile.current_location) sections.push(`Current Location: ${profile.current_location}`);
  if (profile.core_json?.city) {
    sections.push(`City: ${profile.core_json.city}${profile.core_json?.country ? `, ${profile.core_json.country}` : ''}`);
  }
  if (profile.hometown) sections.push(`Hometown: ${profile.hometown}`);
  if (profile.core_json?.primary_role) sections.push(`Primary Role: ${profile.core_json.primary_role}`);
  if (profile.core_json?.employment_type) sections.push(`Employment Type: ${profile.core_json.employment_type}`);
  if (profile.university) sections.push(`University: ${profile.university}`);
  if (profile.major) sections.push(`Major: ${profile.major}`);
  if (profile.net_worth) sections.push(`Net Worth: ${profile.net_worth}`);
  if (profile.political_views) sections.push(`Political Views: ${profile.political_views}`);
  if (profile.family_relationship) sections.push(`Family Relationship: ${profile.family_relationship}`);

  // CORE VALUES
  if (profile.values_json && profile.values_json.length > 0) {
    sections.push('\n=== CORE VALUES ===');
    sections.push(profile.values_json.join(', '));
  }

  // ONBOARDING RESPONSES (Life Context, Goals, Decision Style, etc.)
  if (profile.core_json?.onboarding_responses) {
    sections.push('\n=== LIFE CONTEXT & GOALS ===');
    const responses = profile.core_json.onboarding_responses;
    if (responses['01-now']) sections.push(`Current Life Situation: ${responses['01-now']}`);
    if (responses['02-path']) sections.push(`Life Journey & Path: ${responses['02-path']}`);
    if (responses['01-values'] || responses['03-values']) {
      sections.push(`Core Values & Beliefs: ${responses['01-values'] || responses['03-values']}`);
    }
    if (responses['04-style']) sections.push(`Decision-Making Style: ${responses['04-style']}`);
    if (responses['05-day']) sections.push(`Typical Day: ${responses['05-day']}`);
    if (responses['06-stress']) sections.push(`Stress Response: ${responses['06-stress']}`);
    if (responses['07-clarifier']) sections.push(`Additional Context: ${responses['07-clarifier']}`);
  }

  // MOTIVATION & GOALS
  if (profile.core_json?.motivation) {
    sections.push('\n=== MOTIVATION & DRIVERS ===');
    sections.push(profile.core_json.motivation);
  }

  // NARRATIVE SUMMARY (comprehensive overview)
  if (profile.narrative_summary) {
    sections.push('\n=== COMPREHENSIVE NARRATIVE SUMMARY ===');
    sections.push(profile.narrative_summary);
  }

  // KEY RELATIONSHIPS
  if (relationships && relationships.length > 0) {
    sections.push('\n=== KEY RELATIONSHIPS ===');
    relationships.slice(0, 8).forEach((rel) => {
      const parts = [rel.name, rel.relationship_type];
      if (rel.years_known) parts.push(`known ${rel.years_known} years`);
      if (rel.contact_frequency) parts.push(`contact: ${rel.contact_frequency}`);
      if (rel.influence !== null && rel.influence !== undefined) {
        parts.push(`influence: ${rel.influence.toFixed(1)}/5`);
      }
      sections.push(`- ${parts.join(', ')}`);
    });
  }

  // CAREER & WORK HISTORY
  if (careers && careers.length > 0) {
    sections.push('\n=== CAREER & WORK HISTORY ===');
    careers.slice(0, 5).forEach((career) => {
      const parts = [career.title];
      if (career.company) parts.push(`at ${career.company}`);
      if (career.start_date) {
        const endDate = career.end_date || 'present';
        parts.push(`(${career.start_date} - ${endDate})`);
      }
      if (career.satisfaction !== null && career.satisfaction !== undefined) {
        parts.push(`satisfaction: ${career.satisfaction}/5`);
      }
      sections.push(`- ${parts.join(' ')}`);
    });
  }

  // RECENT JOURNAL INSIGHTS (mood, thoughts, patterns)
  if (journals && journals.length > 0) {
    sections.push('\n=== RECENT JOURNAL INSIGHTS ===');
    const avgMood = journals.reduce((sum, j) => sum + (j.mood || 0), 0) / journals.length;
    sections.push(`Average Mood (last ${journals.length} entries): ${avgMood.toFixed(1)}/5`);
    // Include snippets from most recent journals
    journals.slice(0, 3).forEach((journal, idx) => {
      if (journal.text) {
        const snippet = journal.text.substring(0, 150);
        sections.push(`Recent entry ${idx + 1}: "${snippet}${snippet.length >= 150 ? '...' : ''}"`);
      }
    });
  }

  // DECISION PATTERNS & PREFERENCES
  if (decisions && decisions.length > 0) {
    sections.push('\n=== DECISION PATTERNS ===');
    decisions.slice(0, 3).forEach((dec) => {
      let line = `- ${dec.question}`;
      if (dec.prediction) {
        line += ` → Chose: ${dec.prediction.prediction}`;
        if (dec.prediction.factors && dec.prediction.factors.length > 0) {
          line += ` (key factors: ${dec.prediction.factors.slice(0, 3).join(', ')})`;
        }
      }
      sections.push(line);
    });
  }

  return sections.join('\n');
}

function buildLocationContext(
  location?: { latitude: number; longitude: number } | string,
  profile?: any
): string {
  if (typeof location === 'string') {
    return location;
  }
  
  if (location && typeof location === 'object') {
    return `Coordinates: ${location.latitude}, ${location.longitude}`;
  }
  
  if (profile?.current_location) {
    return profile.current_location;
  }
  
  return '';
}

async function callAIForRecommendations(
  category: RecommendationCategory,
  interestContext: string,
  profileContext: string,
  locationContext: string
): Promise<Recommendation[]> {
  const openai = getOpenAI();
  const categoryInfo = RECOMMENDATION_CATEGORIES[category];

  const systemPrompt = `You are an expert at providing highly personalized recommendations. You have access to comprehensive user data including their core values, life situation, goals, relationships, career history, decision patterns, journal insights, and interest preferences. Use ALL of this information to generate exactly 10 highly specific, accurate, and tailored recommendations. Avoid generic suggestions - each recommendation should be deeply personalized based on the user's unique profile, values, goals, and preferences.`;

  let userPrompt = `Generate 10 highly personalized ${categoryInfo.title} for this user.\n\n`;
  userPrompt += `IMPORTANT: Use ALL of the following comprehensive user data to create deeply personalized recommendations:\n\n`;
  userPrompt += `=== INTEREST QUIZ RESULTS ===\n${interestContext}\n\n`;
  userPrompt += `=== COMPREHENSIVE USER PROFILE ===\n${profileContext}\n\n`;
  
  if (categoryInfo.requiresLocation && locationContext) {
    userPrompt += `Location Context: ${locationContext}\n\n`;
    if (category === 'local') {
      userPrompt += `For local recommendations, include:\n`;
      userPrompt += `- Top 5 restaurants (with cuisine types)\n`;
      userPrompt += `- Top 3 bars or nightlife spots\n`;
      userPrompt += `- Top 2 things to do or activities\n\n`;
    }
  }

  userPrompt += `Return a JSON object with a "recommendations" array containing exactly 10 items, each with:\n`;
  userPrompt += `- "title": The name/title of the recommendation\n`;
  userPrompt += `- "description": A brief 1-2 sentence description explaining why this is a good fit\n`;
  userPrompt += `- "rank": Number from 1-10 (1 being the best match)\n\n`;
  userPrompt += `Format: {"recommendations": [{"title": "...", "description": "...", "rank": 1}, ...]}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }
    
    // Handle both {recommendations: [...]} and [...] formats
    let recommendations: any[] = [];
    if (Array.isArray(parsed)) {
      recommendations = parsed;
    } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
      recommendations = parsed.recommendations;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      recommendations = parsed.items;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      recommendations = parsed.data;
    } else {
      // Try to find any array in the response
      const keys = Object.keys(parsed);
      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          recommendations = parsed[key];
          break;
        }
      }
    }

    if (recommendations.length === 0) {
      throw new Error('No recommendations found in AI response');
    }

    // Ensure we have exactly 10, sorted by rank
    const sorted = recommendations
      .slice(0, 10)
      .sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0))
      .map((r: any, index: number) => ({
        title: r.title || r.name || `Recommendation ${index + 1}`,
        description: r.description || r.desc || '',
        rank: r.rank !== undefined ? r.rank : index + 1,
      }));

    return sorted;
  } catch (error) {
    console.error('AI recommendation generation error:', error);
    throw error;
  }
}

async function cacheRecommendations(
  userId: string,
  category: RecommendationCategory,
  recommendations: Recommendation[],
  locationContext: string
): Promise<void> {
  try {
    // Delete existing recommendations for this category
    await supabase
      .from('user_recommendations')
      .delete()
      .eq('user_id', userId)
      .eq('category', category);

    // Insert new recommendations
    const inserts = recommendations.map((rec) => ({
      user_id: userId,
      category,
      recommendation_title: rec.title,
      recommendation_description: rec.description,
      rank: rec.rank,
      location: locationContext || null,
    }));

    const { error } = await supabase
      .from('user_recommendations')
      .insert(inserts);

    if (error) throw error;
  } catch (error) {
    console.error('Error caching recommendations:', error);
    // Don't throw - caching failure shouldn't break the flow
  }
}

/**
 * Get cached recommendations from database
 */
export async function getCachedRecommendations(
  userId: string,
  category: RecommendationCategory
): Promise<Recommendation[] | null> {
  try {
    const { data, error } = await supabase
      .from('user_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('rank', { ascending: true })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Check if recommendations are fresh (less than 7 days old)
    const oldest = new Date(data[0].generated_at);
    const daysSinceGeneration = (Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceGeneration > 7) {
      return null; // Stale, should regenerate
    }

    return data.map((rec) => ({
      title: rec.recommendation_title,
      description: rec.recommendation_description || '',
      rank: rec.rank,
    }));
  } catch (error) {
    console.error('Error fetching cached recommendations:', error);
    return null;
  }
}

function mockRecommendations(category: RecommendationCategory): Recommendation[] {
  const categoryInfo = RECOMMENDATION_CATEGORIES[category];
  return Array.from({ length: 10 }, (_, i) => ({
    title: `${categoryInfo.title} Recommendation ${i + 1}`,
    description: `This is a mock recommendation for ${categoryInfo.title}. In production, this would be AI-generated based on your interests.`,
    rank: i + 1,
  }));
}

