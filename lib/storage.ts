import { supabase } from './supabase';
import { embedText } from './ai';
import type {
  CoreJsonData,
  RelationshipExtraction,
  CareerExtraction,
  DecisionPrediction,
  SimulationScenario,
  WhatIfMetrics,
} from '@/types/database';

export async function upsertProfileCore(
  userId: string,
  coreJson: CoreJsonData,
  valuesJson: string[],
  narrativeSummary: string,
  embedding: number[]
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        core_json: coreJson as any,
        values_json: valuesJson as any,
        narrative_summary: narrativeSummary,
        narrative_embedding: embedding as any,
      } as any,
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfileFields(
  userId: string,
  fields: {
    hometown?: string;
    family_relationship?: 'supportive' | 'strained' | 'mixed' | 'unknown';
    university?: string;
    major?: string;
    career_entrypoint?: string;
  }
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertRelationships(userId: string, relationships: RelationshipExtraction[]) {
  const dbRelationships = relationships.map((rel) => ({
    user_id: userId,
    name: rel.name,
    relationship_type: rel.relationship_type,
    years_known: rel.years_known || null,
    contact_frequency: rel.contact_frequency || null,
    influence: rel.influence,
    location: rel.location || null,
  }));

  const { data, error } = await supabase
    .from('relationships')
    .insert(dbRelationships as any)
    .select();

  if (error) throw error;
  return data;
}

export async function getRelationships(userId: string) {
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('user_id', userId)
    .order('influence', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRelationship(id: string) {
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateRelationship(id: string, updates: {
  name?: string;
  relationship_type?: string;
  years_known?: number | null;
  contact_frequency?: string | null;
  influence?: number | null;
  location?: string | null;
}) {
  const { data, error } = await supabase
    .from('relationships')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRelationship(id: string) {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function upsertCareerEntries(userId: string, entries: CareerExtraction[]) {
  const dbEntries = entries.map((entry) => ({
    user_id: userId,
    title: entry.title,
    company: entry.company || null,
    start_date: entry.start_date || null,
    end_date: entry.end_date || null,
    satisfaction: entry.satisfaction || null,
    source: 'manual' as const,
  }));

  const { data, error } = await supabase.from('career_entries').insert(dbEntries as any).select();

  if (error) throw error;
  return data;
}

export async function getCareerEntries(userId: string) {
  const { data, error } = await supabase
    .from('career_entries')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function insertDecision(
  userId: string,
  payload: {
    question: string;
    options: string[];
    context_summary?: string;
    status?: 'draft' | 'pending' | 'completed';
  }
) {
  // Compute embedding for the decision (question + options combined)
  let embedding: number[] | null = null;
  try {
    const decisionText = `${payload.question} ${payload.options.join(' ')}`;
    embedding = await embedText(decisionText);
  } catch (error) {
    console.warn('Failed to compute decision embedding:', error);
    // Continue without embedding
  }

  const { data, error } = await supabase
    .from('decisions')
    .insert({
      user_id: userId,
      question: payload.question,
      options: payload.options as any,
      context_summary: payload.context_summary || null,
      status: payload.status || 'pending',
      decision_embedding: embedding as any,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDecisionPrediction(decisionId: string, prediction: DecisionPrediction) {
  // If embedding doesn't exist yet, compute it
  const decision = await getDecision(decisionId);
  let embedding = (decision?.decision_embedding as number[]) || null;
  
  if (!embedding && decision) {
    try {
      const decisionText = `${decision.question} ${(decision.options || []).join(' ')}`;
      embedding = await embedText(decisionText);
    } catch (error) {
      console.warn('Failed to compute decision embedding on update:', error);
    }
  }

  const updatePayload: any = {
    prediction: prediction as any,
    status: 'completed',
  };
  
  if (embedding) {
    updatePayload.decision_embedding = embedding as any;
  }

  const { data, error } = await supabase
    .from('decisions')
    .update(updatePayload)
    .eq('id', decisionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save decision result (alias for updateDecisionPrediction for consistency)
 * @param decisionId - Decision ID to update
 * @param result - DecisionPrediction result to save
 */
export async function saveDecisionResult(decisionId: string, result: DecisionPrediction) {
  return updateDecisionPrediction(decisionId, result);
}

export async function getDecisions(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getDecision(decisionId: string) {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', decisionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertSimulation(
  userId: string,
  decisionId: string,
  scenarios: Record<string, SimulationScenario>,
  summary: string
) {
  const { data, error } = await supabase
    .from('simulations')
    .insert({
      user_id: userId,
      decision_id: decisionId,
      scenarios: scenarios as any,
      summary,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSimulation(decisionId: string) {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('decision_id', decisionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertWhatIf(
  userId: string,
  payload: {
    counterfactual_type: string;
    payload: Record<string, any>;
    metrics: WhatIfMetrics;
    summary: string;
  }
) {
  const { data, error } = await supabase
    .from('what_if')
    .insert({
      user_id: userId,
      counterfactual_type: payload.counterfactual_type,
      payload: payload.payload as any,
      metrics: payload.metrics as any,
      summary: payload.summary,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWhatIfs(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('what_if')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function insertJournal(userId: string, mood: number, text: string) {
  const { data, error } = await supabase
    .from('journals')
    .insert({
      user_id: userId,
      mood,
      text,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getJournals(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getTodayJournal(userId: string) {
  // Get start and end of today in UTC
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getJournal(id: string) {
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteJournal(id: string) {
  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Onboarding helpers
export async function saveOnboardingResponse(
  userId: string,
  step: string,
  response: string
) {
  // Get existing profile or create one
  const profile = await getProfile(userId);
  const currentCoreJson = (profile?.core_json as CoreJsonData) || {};

  // Store onboarding responses in core_json
  const onboardingData = currentCoreJson.onboarding_responses || {};
  onboardingData[step] = response;

  const updatedCoreJson: CoreJsonData = {
    ...currentCoreJson,
    onboarding_responses: onboardingData,
  };

  // Upsert profile with onboarding data
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        core_json: updatedCoreJson as any,
      } as any,
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function completeOnboarding(
  userId: string,
  onboardingData: {
    university?: string;
    hometown?: string;
    [key: string]: any;
  }
) {
  const profile = await getProfile(userId);
  const currentCoreJson = (profile?.core_json as CoreJsonData) || {};
  const onboardingResponses = currentCoreJson.onboarding_responses || {};

  // Mark onboarding as complete in core_json
  const updatedCoreJson: CoreJsonData = {
    ...currentCoreJson,
    onboarding_responses: {
      ...onboardingResponses,
      ...onboardingData,
    },
    onboarding_complete: true,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        core_json: updatedCoreJson as any,
        university: onboardingData.university || null,
        hometown: onboardingData.hometown || null,
      } as any,
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile) return false;
  
  const coreJson = profile.core_json as CoreJsonData;
  return coreJson?.onboarding_complete === true;
}

/**
 * Update user's privacy setting for contributing to community insights
 */
export async function updateContributeToInsights(userId: string, enabled: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ contribute_to_insights: enabled } as any)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
