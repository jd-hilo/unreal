import { supabase } from './supabase';
import { embedText } from './ai';
import type {
  CoreJsonData,
  RelationshipExtraction,
  CareerExtraction,
  DecisionPrediction,
  SimulationScenario,
  WhatIfMetrics,
  WhatIfBiometrics,
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
    first_name?: string;
    hometown?: string;
    family_relationship?: 'supportive' | 'strained' | 'mixed' | 'unknown';
    university?: string;
    major?: string;
    career_entrypoint?: string;
    current_location?: string;
    net_worth?: string;
    political_views?: string;
  }
) {
  // Get existing profile to preserve core_json and values_json
  const existingProfile = await getProfile(userId);
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        core_json: existingProfile?.core_json || {},
        values_json: existingProfile?.values_json || [],
        ...fields,
      } as any,
      { onConflict: 'user_id' }
    )
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

export async function deleteDecision(decisionId: string) {
  const { error } = await supabase
    .from('decisions')
    .delete()
    .eq('id', decisionId);

  if (error) throw error;
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
    biometrics?: WhatIfBiometrics;
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
      biometrics: payload.biometrics as any,
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

export async function deleteWhatIf(whatIfId: string) {
  const { error } = await supabase
    .from('what_if')
    .delete()
    .eq('id', whatIfId);

  if (error) throw error;
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
    first_name?: string;
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

  // Build update object, preserving existing values if not provided
  const updatePayload: any = {
    user_id: userId,
    core_json: updatedCoreJson as any,
  };

  // Only update fields if provided, otherwise preserve existing values
  if (onboardingData.first_name !== undefined) {
    updatePayload.first_name = onboardingData.first_name;
  } else if (profile?.first_name) {
    updatePayload.first_name = profile.first_name;
  }
  
  if (onboardingData.university !== undefined) {
    updatePayload.university = onboardingData.university;
  } else if (profile?.university) {
    updatePayload.university = profile.university;
  }
  
  if (onboardingData.hometown !== undefined) {
    updatePayload.hometown = onboardingData.hometown;
  } else if (profile?.hometown) {
    updatePayload.hometown = profile.hometown;
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      updatePayload,
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

// Twin Code Management

/**
 * Generate and assign a unique 6-digit twin code to a user
 */
export async function generateUniqueTwinCode(userId: string): Promise<string> {
  // Call the database function to generate a unique code
  const { data, error } = await supabase.rpc('generate_unique_twin_code');
  
  if (error) throw error;
  
  const twinCode = data as string;
  
  // Update the user's profile with the new code
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ twin_code: twinCode })
    .eq('user_id', userId);
  
  if (updateError) throw updateError;
  
  return twinCode;
}

/**
 * Get or generate a twin code for a user
 */
export async function ensureTwinCode(userId: string): Promise<string> {
  const profile = await getProfile(userId);
  
  if (profile?.twin_code) {
    return profile.twin_code;
  }
  
  return await generateUniqueTwinCode(userId);
}

/**
 * Look up a user's profile by their twin code
 */
export async function getUserByTwinCode(code: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, twin_code')
    .eq('twin_code', code)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

/**
 * Add a participant (another twin) to a decision
 */
export async function addDecisionParticipant(
  decisionId: string,
  participantUserId: string,
  addedByUserId: string
) {
  const { data, error } = await supabase
    .from('decision_participants')
    .insert({
      decision_id: decisionId,
      participant_user_id: participantUserId,
      added_by_user_id: addedByUserId,
    } as any)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all participants for a decision (including their profile info)
 */
export async function getDecisionParticipants(decisionId: string) {
  const { data, error } = await supabase
    .from('decision_participants')
    .select(`
      id,
      participant_user_id,
      created_at
    `)
    .eq('decision_id', decisionId);
  
  if (error) throw error;
  
  // Fetch profile info for each participant
  if (data && data.length > 0) {
    const participantIds = data.map(p => p.participant_user_id);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name, twin_code')
      .in('user_id', participantIds);
    
    if (profileError) throw profileError;
    
    // Combine participant data with profile info
    return data.map(participant => {
      const profile = profiles?.find(p => p.user_id === participant.participant_user_id);
      return {
        ...participant,
        first_name: profile?.first_name || null,
        twin_code: profile?.twin_code || null,
      };
    });
  }
  
  return [];
}

/**
 * Remove a participant from a decision
 */
export async function removeDecisionParticipant(decisionId: string, participantUserId: string) {
  const { error } = await supabase
    .from('decision_participants')
    .delete()
    .eq('decision_id', decisionId)
    .eq('participant_user_id', participantUserId);
  
  if (error) throw error;
}

/**
 * Delete all user-owned data from application tables.
 * Note: Deleting the auth user requires a server-side admin function;
 * this client method only removes app data scoped by user_id.
 */
export async function deleteAccountData(userId: string): Promise<void> {
  // Order matters for foreign keys: delete children before parent rows
  const tablesInDeleteOrder = [
    'decision_participants',
    'decisions',
    'simulations',
    'what_if',
    'journals',
    'relationships',
    'career_entries',
    // profiles last
  ];

  for (const table of tablesInDeleteOrder) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      // Log and continue to attempt best-effort cleanup
      console.warn(`Failed to delete from ${table}:`, error.message);
    }
  }

  const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userId);
  if (profileError) {
    console.warn('Failed to delete profile row:', profileError.message);
  }
}
