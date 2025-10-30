import { supabase } from './supabase';
import { getProfile, getRelationships, getCareerEntries, getJournals, getDecisions } from './storage';
import { embedText } from './ai';

export async function buildCorePack(userId: string): Promise<string> {
  const profile = await getProfile(userId);
  const relationships = await getRelationships(userId);
  const careers = await getCareerEntries(userId);

  if (!profile) {
    return 'No profile data available yet.';
  }

  const sections: string[] = [];

  sections.push('IDENTITY SNAPSHOT');
  if (profile.core_json.age_range) sections.push(`Age: ${profile.core_json.age_range}`);
  if (profile.core_json.city) sections.push(`Location: ${profile.core_json.city}, ${profile.core_json.country || ''}`);
  if (profile.core_json.primary_role) sections.push(`Role: ${profile.core_json.primary_role}`);
  if (profile.core_json.employment_type) sections.push(`Employment: ${profile.core_json.employment_type}`);

  if (profile.values_json && profile.values_json.length > 0) {
    sections.push('\nCORE VALUES');
    sections.push(profile.values_json.slice(0, 5).join(', '));
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

  if (profile.core_json.motivation) {
    sections.push('\nMOTIVATION');
    sections.push(profile.core_json.motivation);
  }

  return sections.join('\n');
}

export async function buildRelevancePack(userId: string, question: string): Promise<string> {
  const sections: string[] = [];

  const questionEmbedding = await embedText(question);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('narrative_summary')
    .eq('user_id', userId)
    .maybeSingle();

  if (profiles?.narrative_summary) {
    sections.push('PROFILE NARRATIVE');
    sections.push(profiles.narrative_summary);
  }

  const recentDecisions = await getDecisions(userId, 5);
  if (recentDecisions.length > 0) {
    sections.push('\nRECENT DECISIONS');
    recentDecisions.forEach((dec) => {
      sections.push(`- ${dec.question}`);
      if (dec.prediction) {
        sections.push(`  Chose: ${dec.prediction.prediction} (confidence: ${(1 - dec.prediction.uncertainty).toFixed(2)})`);
      }
    });
  }

  const recentJournals = await getJournals(userId, 7);
  if (recentJournals.length > 0) {
    const avgMood = recentJournals.reduce((sum, j) => sum + (j.mood || 0), 0) / recentJournals.length;
    sections.push('\nRECENT MOOD TREND');
    sections.push(`Average mood (7 days): ${avgMood.toFixed(1)}/5`);
    if (recentJournals[0]?.text) {
      sections.push(`Latest: "${recentJournals[0].text.slice(0, 100)}..."`);
    }
  }

  return sections.join('\n');
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
