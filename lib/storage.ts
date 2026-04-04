import { supabase } from './supabase';
import { embedText, regenerateLifeSituation, generateLifeSituationFromIdentity, recalculateDreamProgress } from './ai';
import type {
  CoreJsonData,
  RelationshipExtraction,
  CareerExtraction,
  DecisionPrediction,
  SimulationScenario,
  WhatIfMetrics,
  WhatIfBiometrics,
  InterestResponse,
  YearPredictionData,
  DreamVision,
  DailyTask,
  ArchitectFeedback,
  OnboardingTask,
} from '@/types/database';
import { trackEvent } from './mixpanel';

/**
 * Get today's date string in local timezone (YYYY-MM-DD)
 * Uses local time instead of UTC to prevent timezone issues
 */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    avatar_variant?: string;
    avatar_colors?: string[];
    avatar_reason?: string;
    life_situation?: string;
    life_journey?: string;
    core_value?: string;
    dream_vision?: DreamVision;
    dream_self_progress?: Record<string, number>;
    current_health?: any;
    relationship_details?: any;
    narrative_summary?: string;
    narrative_embedding?: number[];
    est_days_remaining?: number | string;
    birthday?: string;
    gender?: string;
    total_points?: number;
    current_streak?: number;
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

export async function assignABTestGroup(userId: string): Promise<'A' | 'B'> {
  // Check if user already has an AB test group assigned
  const profile = await getProfile(userId);
  
  if (profile?.ab_test_group) {
    return profile.ab_test_group as 'A' | 'B';
  }
  
  // Count users in each group (excluding current user)
  const { data: groupCounts, error: countError } = await supabase
    .from('profiles')
    .select('ab_test_group')
    .not('user_id', 'eq', userId)
    .not('ab_test_group', 'is', null);

  if (countError) {
    console.error('Error counting AB test groups:', countError);
    // Default to 'A' if query fails
    const abTestGroup: 'A' | 'B' = 'A';
    await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          ab_test_group: abTestGroup,
          core_json: profile?.core_json || {},
          values_json: profile?.values_json || [],
        } as any,
        { onConflict: 'user_id' }
      );
    return abTestGroup;
  }

  // Count users in each group
  const groupACount = (groupCounts || []).filter((p: any) => p.ab_test_group === 'A').length;
  const groupBCount = (groupCounts || []).filter((p: any) => p.ab_test_group === 'B').length;

  // Determine the next group: assign to the group with fewer users, or alternate if equal
  let abTestGroup: 'A' | 'B';
  if (groupACount === 0 && groupBCount === 0) {
    // No previous assignments, start with 'A'
    abTestGroup = 'A';
  } else if (groupBCount < groupACount) {
    // Group B has fewer users, assign to B
    abTestGroup = 'B';
  } else if (groupACount < groupBCount) {
    // Group A has fewer users, assign to A
    abTestGroup = 'A';
  } else {
    // Equal counts, alternate based on last assignment
    // Get the most recently created user with an AB test group
    const { data: lastUser } = await supabase
      .from('profiles')
      .select('ab_test_group')
      .not('user_id', 'eq', userId)
      .not('ab_test_group', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (lastUser?.ab_test_group === 'A') {
      abTestGroup = 'B';
    } else if (lastUser?.ab_test_group === 'B') {
      abTestGroup = 'A';
    } else {
      // Fallback: alternate based on total count
      abTestGroup = (groupACount + groupBCount) % 2 === 0 ? 'A' : 'B';
    }
  }
  
  // Update the profile with the AB test group
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        ab_test_group: abTestGroup,
        core_json: profile?.core_json || {},
        values_json: profile?.values_json || [],
      } as any,
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return abTestGroup;
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
  
  // Complete onboarding task for first decision
  try {
    await completeOnboardingTask(userId, 'ask_decision');
  } catch (error) {
    // Silently fail if onboarding task doesn't exist or is already complete
    console.warn('Failed to complete onboarding task:', error);
  }
  
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

/**
 * Update decision context_summary (clarification responses) before prediction.
 */
export async function updateDecisionContextSummary(decisionId: string, contextSummary: string) {
  const { data, error } = await supabase
    .from('decisions')
    .update({ context_summary: contextSummary })
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

/**
 * Save a career simulation result
 */
export async function saveCareerSimulation(
  userId: string,
  payload: {
    timeHorizon: number;
    pathType: 'stay' | 'switch' | 'startup';
    currentRole?: string;
    company?: string;
    salary?: string;
    simulationData: Record<string, any>;
  }
) {
  const { data, error } = await supabase
    .from('career_simulations')
    .insert({
      user_id: userId,
      time_horizon: payload.timeHorizon,
      path_type: payload.pathType,
      role_title: payload.currentRole || null,
      company: payload.company || null,
      salary: payload.salary || null,
      simulation_data: payload.simulationData as any,
    } as any)
    .select()
    .single();

  if (error) throw error;
  
  // Complete onboarding task for first career simulation
  try {
    await completeOnboardingTask(userId, 'simulate_career');
  } catch (error) {
    // Silently fail if onboarding task doesn't exist or is already complete
    console.warn('Failed to complete onboarding task:', error);
  }
  
  return data;
}

/**
 * Get all career simulations for a user
 */
export async function getCareerSimulations(userId: string) {
  const { data, error } = await supabase
    .from('career_simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single career simulation by ID
 */
export async function getCareerSimulation(simulationId: string) {
  const { data, error } = await supabase
    .from('career_simulations')
    .select('*')
    .eq('id', simulationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Delete a career simulation
 */
export async function deleteCareerSimulation(simulationId: string) {
  const { error } = await supabase
    .from('career_simulations')
    .delete()
    .eq('id', simulationId);

  if (error) throw error;
}

export async function insertWhatIf(
  userId: string,
  payload: {
    counterfactual_type: string;
    payload: Record<string, any>;
    metrics: WhatIfMetrics;
    summary: string;
    biometrics?: WhatIfBiometrics;
    twinAlignmentScore?: number;
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
      twin_alignment_score: payload.twinAlignmentScore ?? null,
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
  console.log(`💾 [saveOnboardingResponse] Starting save for step: ${step}, userId: ${userId}`);
  console.log(`💾 [saveOnboardingResponse] Response value:`, response);
  
  // Get existing profile to preserve core_json and values_json (EXACT same pattern as updateProfileFields)
  const existingProfile = await getProfile(userId);
  console.log(`💾 [saveOnboardingResponse] Existing profile:`, existingProfile ? 'found' : 'not found');
  console.log(`💾 [saveOnboardingResponse] Existing core_json:`, JSON.stringify(existingProfile?.core_json, null, 2));
  
  const currentCoreJson = (existingProfile?.core_json as CoreJsonData) || {};
  
  // Store onboarding responses in core_json
  const onboardingData = currentCoreJson.onboarding_responses || {};
  onboardingData[step] = response;
  console.log(`💾 [saveOnboardingResponse] Updated onboarding_data[${step}]:`, onboardingData[step]);

  const updatedCoreJson: CoreJsonData = {
    ...currentCoreJson,
    onboarding_responses: onboardingData,
  };
  console.log(`💾 [saveOnboardingResponse] Updated core_json:`, JSON.stringify(updatedCoreJson, null, 2));

  // Use updateProfileFields to save - it preserves everything correctly
  // We'll update core_json by calling updateProfileFields with no fields, then update core_json separately
  // Actually, let's just use the same upsert pattern but ensure we wait for it
  const upsertPayload = {
    user_id: userId,
    core_json: updatedCoreJson as any,
    values_json: existingProfile?.values_json || [],
    first_name: existingProfile?.first_name || null,
    hometown: existingProfile?.hometown || null,
    university: existingProfile?.university || null,
    major: existingProfile?.major || null,
    career_entrypoint: existingProfile?.career_entrypoint || null,
    current_location: existingProfile?.current_location || null,
    net_worth: existingProfile?.net_worth || null,
    political_views: existingProfile?.political_views || null,
    family_relationship: existingProfile?.family_relationship || null,
  };
  console.log(`💾 [saveOnboardingResponse] Upsert payload:`, JSON.stringify(upsertPayload, null, 2));
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      upsertPayload as any,
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error('❌ [saveOnboardingResponse] Error in upsert:', error);
    console.error('❌ [saveOnboardingResponse] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
  
  console.log(`✅ [saveOnboardingResponse] Upsert successful, returned data:`, data);
  
  // Verify it was saved
  if (data) {
    // Wait a tiny bit for the database to be consistent
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const verify = await getProfile(userId);
    console.log(`🔍 [saveOnboardingResponse] Verification fetch:`, verify ? 'found' : 'not found');
    console.log(`🔍 [saveOnboardingResponse] Verification core_json:`, JSON.stringify(verify?.core_json, null, 2));
    
    const saved = (verify?.core_json as CoreJsonData)?.onboarding_responses?.[step];
    console.log(`🔍 [saveOnboardingResponse] Saved value for ${step}:`, saved);
    console.log(`🔍 [saveOnboardingResponse] Expected value:`, response);
    
    if (saved !== response) {
      console.error('❌ [saveOnboardingResponse] VERIFICATION FAILED: Expected', response, 'but got', saved);
      throw new Error(`Save verification failed: expected "${response}" but got "${saved}"`);
    }
    
    console.log(`✅ [saveOnboardingResponse] Verification passed!`);
  }
  
  // Ensure twin code is generated when profile is first created
  if (data && !data.twin_code) {
    try {
      await ensureTwinCode(userId);
    } catch (codeError) {
      console.error('Failed to generate twin code during onboarding save:', codeError);
      // Don't throw - code generation failure shouldn't block onboarding save
    }
  }
  
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
  
  // Ensure twin code is generated when onboarding completes
  if (data && !data.twin_code) {
    try {
      await ensureTwinCode(userId);
    } catch (codeError) {
      console.error('Failed to generate twin code during onboarding completion:', codeError);
      // Don't throw - code generation failure shouldn't block onboarding completion
    }
  }
  
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
  // Ensure profile exists first
  let profile = await getProfile(userId);
  if (!profile) {
    // Create a basic profile if it doesn't exist
    const { error: createError } = await supabase
      .from('profiles')
      .insert({ user_id: userId });
    if (createError) {
      console.error('Failed to create profile:', createError);
      throw createError;
    }
    profile = await getProfile(userId);
  }

  // Call the database function to generate a unique code
  const { data, error } = await supabase.rpc('generate_unique_twin_code');
  
  if (error) {
    console.error('Failed to generate twin code:', error);
    throw error;
  }
  
  const twinCode = data as string;
  
  if (!twinCode) {
    throw new Error('Failed to generate twin code: empty result');
  }
  
  // Update the user's profile with the new code
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ twin_code: twinCode })
    .eq('user_id', userId);
  
  if (updateError) {
    console.error('Failed to update profile with twin code:', updateError);
    throw updateError;
  }
  
  // Verify the code was saved
  const updatedProfile = await getProfile(userId);
  if (!updatedProfile?.twin_code || updatedProfile.twin_code !== twinCode) {
    console.error('Twin code verification failed. Expected:', twinCode, 'Got:', updatedProfile?.twin_code);
    throw new Error('Failed to verify twin code was saved');
  }
  
  return twinCode;
}

/**
 * Get or generate a twin code for a user
 */
export async function ensureTwinCode(userId: string): Promise<string> {
  try {
    const profile = await getProfile(userId);
    
    if (profile?.twin_code) {
      return profile.twin_code;
    }
    
    // Generate new code with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        return await generateUniqueTwinCode(userId);
      } catch (error) {
        attempts++;
        console.error(`Twin code generation attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    throw new Error('Failed to generate twin code after multiple attempts');
  } catch (error) {
    console.error('Error in ensureTwinCode:', error);
    throw error;
  }
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
 * Save an interest response (This or That choice)
 */
export async function saveInterestResponse(
  userId: string,
  category: string,
  optionA: string,
  optionB: string,
  selectedOption: 'a' | 'b',
  imageUrls: { a: string; b: string },
  descriptions: { a: string | null; b: string | null }
) {
  const { data, error } = await supabase
    .from('interest_responses')
    .insert({
      user_id: userId,
      category,
      option_a: optionA,
      option_b: optionB,
      option_a_image_url: imageUrls.a,
      option_b_image_url: imageUrls.b,
      option_a_description: descriptions.a,
      option_b_description: descriptions.b,
      selected_option: selectedOption,
    } as any)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get interest responses for a user, optionally filtered by category
 */
export async function getInterestResponses(userId: string, category?: string) {
  let query = supabase
    .from('interest_responses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Delete all interest responses for a specific category (to allow redoing the quiz)
 */
export async function deleteCategoryResponses(userId: string, category: string): Promise<void> {
  const { error } = await supabase
    .from('interest_responses')
    .delete()
    .eq('user_id', userId)
    .eq('category', category);

  if (error) throw error;
}

/**
 * Get the next interest question for a category (in order, up to 10 questions)
 * Returns null if all 10 questions have been answered
 */
export async function getNextInterestQuestion(
  userId: string,
  category: string
): Promise<{
  id: string;
  category: string;
  option_a: string;
  option_b: string;
  option_a_image_url: string;
  option_b_image_url: string;
  option_a_description: string | null;
  option_b_description: string | null;
  question_number: number;
} | null> {
  // Get count of questions user has already answered for this category
  const { count: answeredCount } = await supabase
    .from('interest_responses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category', category);

  const currentQuestionNumber = (answeredCount || 0) + 1;

  // Quiz is limited to 10 questions
  if (currentQuestionNumber > 10) return null;

  // Get all active questions for this category, ordered by display_order
  const { data: questions, error } = await supabase
    .from('interest_questions')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Supabase error fetching interest questions:', error);
    throw error;
  }
  
  if (!questions || questions.length === 0) {
    console.warn(`No questions found in Supabase for category: ${category}`);
    return null;
  }
  
  console.log(`Found ${questions.length} questions in Supabase for category: ${category}`);

  // Get the question at the current position (1-indexed)
  const question = questions[currentQuestionNumber - 1];
  
  if (!question) return null;

  return {
    ...question,
    question_number: currentQuestionNumber,
  };
}

/**
 * Check if user has completed all 10 questions for a category
 */
export async function hasCompletedCategory(
  userId: string,
  category: string
): Promise<boolean> {
  const { count } = await supabase
    .from('interest_responses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category', category);

  return (count || 0) >= 10;
}

/**
 * Get current question number for a category (0-10)
 */
export async function getCurrentQuestionNumber(
  userId: string,
  category: string
): Promise<number> {
  const { count } = await supabase
    .from('interest_responses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category', category);

  return count || 0;
}

/**
 * Get all 10 questions for a category (for full preloading)
 */
export async function getAllInterestQuestions(
  category: string
): Promise<Array<{
  id: string;
  category: string;
  option_a: string;
  option_b: string;
  option_a_image_url: string;
  option_b_image_url: string;
  option_a_description: string | null;
  option_b_description: string | null;
  display_order: number;
}>> {
  const { data: questions, error } = await supabase
    .from('interest_questions')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(10);

  if (error) throw error;
  return questions || [];
}

/**
 * Calculate interest progress percentage
 * Returns a number between 0 and 100
 * Based on total questions answered out of 60 possible (6 categories * 10 questions each)
 */
export async function getInterestProgress(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('interest_responses')
    .select('category')
    .eq('user_id', userId);

  if (error) throw error;

  const totalCategories = 6; // fashion, food, music_genres, music_artists, cities, music
  const questionsPerCategory = 10;
  const totalPossible = totalCategories * questionsPerCategory; // 60 total questions

  // Count total responses (each response is one question answered)
  const responseCount = (data || []).length;
  
  // Progress is based on total questions answered out of total possible
  // Cap at 100%
  const progress = Math.min(100, Math.round((responseCount / totalPossible) * 100));

  return progress;
}

/**
 * Calculate overall profile accuracy/completion progress
 */
export async function calculateOverallProgress(userId: string): Promise<number> {
  try {
    const [profile, relationships] = await Promise.all([
      getProfile(userId),
      getRelationships(userId)
    ]);

    if (!profile) return 0;

    const coreJson = (profile.core_json as CoreJsonData) || {};
    const onboardingResponses = coreJson.onboarding_responses || {};
    
    const checks = [
      !!(onboardingResponses['01-now-group'] ?? onboardingResponses['02-now'] ?? onboardingResponses['01-now']), // Life Situation
      !!(onboardingResponses['02-path-group'] ?? onboardingResponses['02-path']), // Path
      !!(onboardingResponses['01-values'] ?? onboardingResponses['03-values']), // Core Values
      !!onboardingResponses['04-style'], // Style
      !!onboardingResponses['05-day'], // Daily Routine
      !!onboardingResponses['06-stress'], // Stress Response
      !!(profile.university || onboardingResponses.university || coreJson.university),
      !!(profile.hometown || onboardingResponses.hometown || coreJson.hometown),
      !!(profile.current_location || onboardingResponses.current_location || coreJson.current_location || coreJson.city),
      !!(profile.net_worth || onboardingResponses.net_worth || coreJson.net_worth),
      !!(profile.political_views || onboardingResponses.political_views || coreJson.political_views),
      (relationships || []).length > 0
    ];

    const completedCount = checks.filter(Boolean).length;
    return Math.round((completedCount / checks.length) * 100);
  } catch (error) {
    console.error('Error calculating overall progress:', error);
    return 0;
  }
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
    'interest_responses',
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

/**
 * Save user interests (multi-select format)
 */
export async function saveUserInterests(
  userId: string,
  category: string,
  items: Array<{ name: string; id?: string; metadata?: Record<string, any> }>
): Promise<void> {
  // First, delete existing interests for this category
  await deleteUserInterestsByCategory(userId, category);

  // Then insert new interests
  if (items.length === 0) return;

  const interestsToInsert = items.map(item => ({
    user_id: userId,
    category,
    item_name: item.name,
    item_id: item.id || null,
    item_metadata: item.metadata || null,
  }));

  const { error } = await supabase
    .from('user_interests')
    .insert(interestsToInsert);

  if (error) throw error;
}

/**
 * Get user interests for a category
 */
export async function getUserInterests(
  userId: string,
  category?: string
): Promise<Array<{
  id: string;
  category: string;
  item_name: string;
  item_id: string | null;
  item_metadata: Record<string, any> | null;
  created_at: string;
}>> {
  let query = supabase
    .from('user_interests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Delete user interests for a specific category
 */
export async function deleteUserInterestsByCategory(
  userId: string,
  category: string
): Promise<void> {
  const { error } = await supabase
    .from('user_interests')
    .delete()
    .eq('user_id', userId)
    .eq('category', category);

  if (error) throw error;
}

/**
 * Check if user has completed a category (has at least one interest selected)
 */
export async function hasCompletedInterestCategory(
  userId: string,
  category: string
): Promise<boolean> {
  const { count } = await supabase
    .from('user_interests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category', category);

  // For food, need 5 selections; for others, at least 1
  if (category === 'food') {
    return (count || 0) >= 5;
  }
  return (count || 0) >= 1;
}

/**
 * Get interest progress for new multi-select format
 */
export async function getInterestProgressNew(userId: string): Promise<number> {
  // Categories: food (5 required), music_artists, movies, fashion (1+ each)
  const categories = ['food', 'music_artists', 'movies', 'fashion'];
  const categoryRequirements: Record<string, number> = {
    food: 5,
    music_artists: 1,
    movies: 1,
    fashion: 1,
  };

  const categoryProgress = await Promise.all(
    categories.map(async (category) => {
      const { count } = await supabase
        .from('user_interests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('category', category);

      const selected = count || 0;
      const required = categoryRequirements[category] || 1;
      return Math.min(100, Math.round((selected / required) * 100));
    })
  );

  // Average progress across all categories
  const totalProgress = categoryProgress.reduce((sum, progress) => sum + progress, 0);
  return Math.round(totalProgress / categories.length);
}

/**
 * Insert a new year prediction
 */
export async function insertYearPrediction(
  userId: string,
  scenarioType: 'estimated' | 'best_case' | 'worst_case',
  predictionData: YearPredictionData,
  probabilityPercentage?: number
) {
  const { data, error } = await supabase
    .from('year_predictions')
    .insert({
      user_id: userId,
      scenario_type: scenarioType,
      prediction_data: predictionData as any,
      probability_percentage: probabilityPercentage ?? null,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a year prediction by user ID and scenario type
 */
export async function getYearPrediction(
  userId: string,
  scenarioType: 'estimated' | 'best_case' | 'worst_case'
) {
  const { data, error } = await supabase
    .from('year_predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('scenario_type', scenarioType)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get a year prediction by ID
 */
export async function getYearPredictionById(predictionId: string) {
  const { data, error } = await supabase
    .from('year_predictions')
    .select('*')
    .eq('id', predictionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update an existing year prediction
 */
export async function updateYearPrediction(
  predictionId: string,
  predictionData: YearPredictionData,
  probabilityPercentage?: number
) {
  const updatePayload: any = {
    prediction_data: predictionData as any,
  };

  if (probabilityPercentage !== undefined) {
    updatePayload.probability_percentage = probabilityPercentage;
  }

  const { data, error } = await supabase
    .from('year_predictions')
    .update(updatePayload)
    .eq('id', predictionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all year predictions for a user
 */
export async function getAllYearPredictions(userId: string) {
  const { data, error } = await supabase
    .from('year_predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a year prediction
 */
export async function deleteYearPrediction(predictionId: string) {
  const { error } = await supabase
    .from('year_predictions')
    .delete()
    .eq('id', predictionId);

  if (error) throw error;
}

/**
 * Get all timelines for a user
 */
export async function getTimelines(userId: string) {
  const { data, error } = await supabase
    .from('timelines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single timeline by ID
 */
export async function getTimeline(timelineId: string) {
  const { data, error } = await supabase
    .from('timelines')
    .select('*')
    .eq('id', timelineId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Delete a timeline
 */
export async function deleteTimeline(timelineId: string) {
  const { error } = await supabase
    .from('timelines')
    .delete()
    .eq('id', timelineId);

  if (error) throw error;
}

/**
 * Update a timeline
 */
export async function updateTimeline(timelineId: string, updates: {
  title?: string;
  current_age?: number;
  current_year?: number;
  stats?: any;
  events?: any[];
  assets?: any[];
  twin_profile?: any;
  scenario_count?: number;
  relationships?: any[];
}) {
  const { data, error } = await supabase
    .from('timelines')
    .update(updates as any)
    .eq('id', timelineId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Insert a new timeline
 */
export async function insertTimeline(userId: string, payload: {
  title: string;
  current_age: number;
  current_year?: number;
  stats?: any;
  events?: any[];
  assets?: any[];
  twin_profile?: any;
  scenario_count?: number;
  relationships?: any[];
}) {
  const { data, error } = await supabase
    .from('timelines')
    .insert({
      user_id: userId,
      title: payload.title,
      current_age: payload.current_age,
      current_year: payload.current_year ?? 1,
      stats: payload.stats ?? { money: 5, happiness: 5, freedom: 5, growth: 5, relationships: 5 },
      events: payload.events ?? [],
      assets: payload.assets ?? [],
      twin_profile: payload.twin_profile ?? {},
      scenario_count: payload.scenario_count ?? 0,
      relationships: payload.relationships ?? [],
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check simulation credits (returns profile simulation_credits or default 5)
 */
export async function checkSimulationCredits(userId: string): Promise<number> {
  const profile = await getProfile(userId);
  return profile?.simulation_credits ?? 5;
}

/**
 * Decrement simulation credits for a user
 */
async function decrementSimulationCredits(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  const currentCredits = profile?.simulation_credits ?? 5;
  const newCredits = Math.max(0, currentCredits - 1);
  
  const { error } = await supabase
    .from('profiles')
    .update({ simulation_credits: newCredits })
    .eq('user_id', userId);
  
  if (error) throw error;
}

/**
 * Create a new timeline with credit checking and decrementing
 * @param userId - User ID
 * @param title - Timeline title
 * @param currentAge - Current age for the timeline
 * @param stats - Optional stats (defaults to balanced stats)
 * @param twinProfile - Optional twin profile data
 * @param relationships - Optional relationships array
 * @param isPremium - Whether user is premium (bypasses credit check)
 */
export async function createTimeline(
  userId: string,
  title: string,
  currentAge: number,
  stats?: any,
  twinProfile?: any,
  relationships?: any[],
  isPremium: boolean = false
) {
  // Check and decrement credits if not premium
  if (!isPremium) {
    const credits = await checkSimulationCredits(userId);
    if (credits <= 0) {
      const error: any = new Error('INSUFFICIENT_CREDITS');
      error.message = 'INSUFFICIENT_CREDITS';
      throw error;
    }
    await decrementSimulationCredits(userId);
  }

  // Create timeline using insertTimeline
  return await insertTimeline(userId, {
    title,
    current_age: currentAge,
    current_year: 1,
    stats: stats || { money: 5, happiness: 5, freedom: 5, growth: 5, relationships: 5 },
    events: [],
    assets: [],
    twin_profile: twinProfile || {},
    scenario_count: 0,
    relationships: relationships || [],
  });
}

/**
 * Save the user's dream self vision
 */
export async function saveDreamSelf(userId: string, dreamVision: DreamVision) {
  return await updateProfileFields(userId, { dream_vision: dreamVision });
}

/**
 * Save daily tasks generated by the Architect
 * Ensures scheduled_date is always set (defaults to today if not provided)
 */
export async function saveDailyTasks(userId: string, tasks: Partial<DailyTask>[]) {
  const today = getLocalDateString();
  
  const tasksToInsert = tasks.map(task => ({
    ...task,
    user_id: userId,
    scheduled_date: task.scheduled_date || today, // Always ensure scheduled_date is set
  }));

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert(tasksToInsert as any)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Delete daily tasks for a user on a specific date
 */
export async function deleteDailyTasks(userId: string, date: string) {
  const { error } = await supabase
    .from('daily_tasks')
    .delete()
    .eq('user_id', userId)
    .eq('scheduled_date', date);

  if (error) throw error;
}

/**
 * Get daily tasks for a user
 * @param userId - User ID
 * @param date - Date string (YYYY-MM-DD) or null to get all tasks, undefined defaults to today
 */
export async function getDailyTasks(userId: string, date?: string | null) {
  let query = supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (date === null) {
    // Get all tasks (no date filter)
    // query stays as is
  } else if (date) {
    query = query.eq('scheduled_date', date);
    // Limit to 3 tasks when fetching for a specific date (we generate exactly 3 per day)
    query = query.limit(3);
  } else {
    // Default to today (using local timezone)
    const today = getLocalDateString();
    query = query.eq('scheduled_date', today);
    // Limit to 3 tasks for today (we generate exactly 3 per day)
    query = query.limit(3);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Update a daily task (e.g., mark as completed)
 */
export async function updateDailyTask(taskId: string, updates: Partial<DailyTask>) {
  const { data, error } = await supabase
    .from('daily_tasks')
    .update(updates as any)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save architect feedback and history
 */
export async function saveArchitectFeedback(userId: string, feedback: string, completedCount: number) {
  const { data, error } = await supabase
    .from('architect_feedback')
    .insert({
      user_id: userId,
      feedback,
      completed_tasks_count: completedCount,
      date: new Date().toISOString().split('T')[0],
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get latest architect feedback for context
 */
export async function getLatestArchitectFeedback(userId: string) {
  const { data, error } = await supabase
    .from('architect_feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get decision chat for a specific decision
 * Returns the chat history with all messages
 */
export async function getDecisionChat(decisionId: string, userId: string) {
  const { data, error } = await supabase
    .from('decision_chats')
    .select('*')
    .eq('decision_id', decisionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Save a message to the decision chat
 * Creates a new chat if it doesn't exist, or appends to existing messages
 */
export async function saveDecisionChatMessage(
  decisionId: string,
  userId: string,
  role: 'user' | 'architect',
  content: string
) {
  // Get existing chat
  const existingChat = await getDecisionChat(decisionId, userId);
  
  const newMessage = {
    role,
    content,
    timestamp: Date.now(),
  };

  if (existingChat) {
    // Append to existing messages
    const messages = Array.isArray(existingChat.messages) ? existingChat.messages : [];
    const updatedMessages = [...messages, newMessage];
    
    const { data, error } = await supabase
      .from('decision_chats')
      .update({
        messages: updatedMessages as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingChat.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new chat with first message
    const { data, error } = await supabase
      .from('decision_chats')
      .insert({
        decision_id: decisionId,
        user_id: userId,
        messages: [newMessage] as any,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Initialize onboarding tasks for a new user
 * Creates 3 tasks: ask_decision, simulate_career, invite_friend
 */
export async function initializeOnboardingTasks(userId: string) {
  const { error } = await supabase.rpc('initialize_onboarding_tasks', {
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Get all onboarding tasks for a user
 */
export async function getOnboardingTasks(userId: string) {
  const { data, error } = await supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Complete a specific onboarding task
 */
export async function completeOnboardingTask(userId: string, taskType: 'ask_decision' | 'simulate_career' | 'invite_friend') {
  const { data, error } = await supabase
    .from('onboarding_tasks')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    } as any)
    .eq('user_id', userId)
    .eq('task_type', taskType)
    .select()
    .single();

  if (error) throw error;
  
  // Track task completion
  try {
    const eventName = taskType === 'ask_decision' ? 'OB - ask-decision-complete' :
                     taskType === 'simulate_career' ? 'OB - simulate-career-complete' :
                     'OB - invite-friend-complete';
    trackEvent(eventName);
  } catch (trackingError) {
    // Silently fail if tracking fails - don't break the completion flow
    console.warn('Failed to track onboarding task completion:', trackingError);
  }
  
  return data;
}

/**
 * Check if all onboarding tasks are complete
 */
export async function areOnboardingTasksComplete(userId: string) {
  const { data, error } = await supabase.rpc('are_onboarding_tasks_complete', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * Check and auto-complete onboarding tasks based on existing data
 * (decisions and career simulations)
 */
export async function checkAndCompleteOnboardingTasks(userId: string) {
  const { error } = await supabase.rpc('check_and_complete_onboarding_tasks', {
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Refreshes the life situation narrative after an identity field is updated.
 * Uses the previous life situation as a reference so only the changed info is incorporated.
 * Runs in the background — callers should not await this in the UI save flow.
 */
export async function refreshLifeSituationAfterIdentityUpdate(
  userId: string,
  fieldLabel: string,
  fieldValue: string
): Promise<void> {
  try {
    const profile = await getProfile(userId);
    const coreJson = profile?.core_json as CoreJsonData | undefined;
    const previousLifeSituation =
      profile?.life_situation ??
      profile?.core_json?.onboarding_responses?.['02-now'] ??
      profile?.core_json?.onboarding_responses?.['01-now'] ??
      '';

    let updated: string;

    if (previousLifeSituation) {
      updated = await regenerateLifeSituation(previousLifeSituation, {
        label: fieldLabel,
        value: fieldValue,
      });
      if (!updated || updated === previousLifeSituation) return;
    } else {
      const identityData = {
        education: profile?.university || coreJson?.university,
        job: coreJson?.primary_role || coreJson?.job,
        relationship: profile?.relationship_details
          ? (typeof profile.relationship_details === 'object' && 'status' in profile.relationship_details
              ? profile.relationship_details.status
              : String(profile.relationship_details))
          : undefined,
        hometown: profile?.hometown,
        location: profile?.current_location || coreJson?.city,
        netWorth: profile?.net_worth || coreJson?.net_worth,
        politics: profile?.political_views || coreJson?.political_views,
        updatedField: { label: fieldLabel, value: fieldValue },
      };
      updated = await generateLifeSituationFromIdentity(identityData);
      if (!updated) return;
    }

    await saveOnboardingResponse(userId, '02-now', updated);
    await saveOnboardingResponse(userId, '01-now', updated);
    await updateProfileFields(userId, { life_situation: updated });
  } catch (error) {
    console.warn('refreshLifeSituationAfterIdentityUpdate failed silently:', error);
  }
}

/**
 * Recalculates dream self progress after identity fields are updated.
 * Compares profile before vs after the update and adjusts progress % and est_days_remaining.
 */
export async function refreshDreamProgressAfterIdentityUpdate(
  userId: string,
  profileBeforeUpdate: { current_location?: string; net_worth?: string; core_json?: any; dream_vision?: any; dream_self_progress?: Record<string, number>; est_days_remaining?: number | string } | null
): Promise<void> {
  try {
    const profileAfterUpdate = await getProfile(userId);
    if (!profileAfterUpdate?.dream_vision || Object.keys(profileAfterUpdate.dream_vision).length === 0) return;

    const oldProgress = profileBeforeUpdate?.dream_self_progress || {};
    const oldEstDays = profileBeforeUpdate?.est_days_remaining ?? 365;

    const { dream_self_progress, est_days_remaining } = await recalculateDreamProgress(
      profileBeforeUpdate || {},
      profileAfterUpdate,
      oldProgress,
      oldEstDays
    );

    await updateProfileFields(userId, { dream_self_progress, est_days_remaining });
  } catch (error) {
    console.warn('refreshDreamProgressAfterIdentityUpdate failed silently:', error);
  }
}

// ─── Life Chats ───────────────────────────────────────────────────────────────

export async function createLifeChat(userId: string, title: string = 'New conversation') {
  const { data, error } = await supabase
    .from('life_chats')
    .insert({ user_id: userId, title, messages: [] })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLifeChats(userId: string, limit = 15) {
  const { data, error } = await supabase
    .from('life_chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getLifeChat(chatId: string, userId: string) {
  const { data, error } = await supabase
    .from('life_chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveLifeChatMessage(
  chatId: string,
  userId: string,
  role: 'user' | 'architect',
  content: string
) {
  const existingChat = await getLifeChat(chatId, userId);
  if (!existingChat) throw new Error('Life chat not found');

  const newMessage = { role, content, timestamp: Date.now() };
  const messages = Array.isArray(existingChat.messages) ? existingChat.messages : [];
  const updatedMessages = [...messages, newMessage];

  const isFirstUserMessage =
    role === 'user' &&
    existingChat.title === 'New conversation' &&
    messages.filter((m: any) => m.role === 'user').length === 0;

  const updates: any = {
    messages: updatedMessages,
    updated_at: new Date().toISOString(),
  };
  if (isFirstUserMessage) {
    updates.title = content.substring(0, 50);
  }

  const { data, error } = await supabase
    .from('life_chats')
    .update(updates)
    .eq('id', chatId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Dream Self Chats ─────────────────────────────────────────────────────────

export async function createDreamSelfChat(userId: string, title: string = 'New conversation') {
  const { data, error } = await supabase
    .from('dream_self_chats')
    .insert({ user_id: userId, title, messages: [] })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDreamSelfChats(userId: string, limit = 15) {
  const { data, error } = await supabase
    .from('dream_self_chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getDreamSelfChat(chatId: string, userId: string) {
  const { data, error } = await supabase
    .from('dream_self_chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveDreamSelfChatMessage(
  chatId: string,
  userId: string,
  role: 'user' | 'dream_self',
  content: string
) {
  const existingChat = await getDreamSelfChat(chatId, userId);
  if (!existingChat) throw new Error('Dream self chat not found');

  const newMessage = { role, content, timestamp: Date.now() };
  const messages = Array.isArray(existingChat.messages) ? existingChat.messages : [];
  const updatedMessages = [...messages, newMessage];

  const isFirstUserMessage =
    role === 'user' &&
    existingChat.title === 'New conversation' &&
    messages.filter((m: any) => m.role === 'user').length === 0;

  const updates: any = {
    messages: updatedMessages,
    updated_at: new Date().toISOString(),
  };
  if (isFirstUserMessage) {
    updates.title = content.substring(0, 50);
  }

  const { data, error } = await supabase
    .from('dream_self_chats')
    .update(updates)
    .eq('id', chatId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
