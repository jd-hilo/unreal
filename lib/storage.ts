import { supabase } from './supabase';
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
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      user_id: userId,
      question: payload.question,
      options: payload.options as any,
      context_summary: payload.context_summary || null,
      status: payload.status || 'pending',
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDecisionPrediction(decisionId: string, prediction: DecisionPrediction) {
  const { data, error } = await supabase
    .from('decisions')
    .update({ prediction: prediction as any, status: 'completed' } as any)
    .eq('id', decisionId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
