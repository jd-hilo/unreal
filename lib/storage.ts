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
  InterestResponse,
  YearPredictionData,
  TimelineStats,
  TimelineEvent,
  TimelineAsset,
  TimelineTwinProfile,
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
/**
 * Assign A/B test group to a user
 * Randomly assigns 'A' or 'B' with 50/50 distribution
 */
export async function assignABTestGroup(userId: string): Promise<'A' | 'B'> {
  // Randomly assign A or B (50/50 split)
  const group: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
  
  // Ensure profile exists first
  let profile = await getProfile(userId);
  if (!profile) {
    // Create a basic profile if it doesn't exist
    const { error: createError } = await supabase
      .from('profiles')
      .insert({ user_id: userId, ab_test_group: group });
    if (createError) {
      console.error('Failed to create profile with AB test group:', createError);
      throw createError;
    }
    profile = await getProfile(userId);
  } else {
    // Update existing profile with AB test group if not already set
    if (!profile.ab_test_group) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ab_test_group: group })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Failed to update profile with AB test group:', updateError);
        throw updateError;
      }
    } else {
      // Return existing group if already assigned
      return profile.ab_test_group as 'A' | 'B';
    }
  }
  
  // Verify the group was saved
  const updatedProfile = await getProfile(userId);
  if (!updatedProfile?.ab_test_group) {
    throw new Error('Failed to verify AB test group was saved');
  }
  
  return updatedProfile.ab_test_group as 'A' | 'B';
}

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
 * Create a new timeline
 */
export async function createTimeline(
  userId: string,
  title: string,
  currentAge: number,
  initialStats?: TimelineStats,
  initialProfile?: TimelineTwinProfile,
  initialRelationships?: Array<{ name: string; type: string; status: string; description: string }>
) {
  const { data, error } = await supabase
    .from('timelines')
    .insert({
      user_id: userId,
      title,
      current_age: currentAge,
      current_year: 1, // Start each simulation at Year 1
      stats: initialStats || {
        money: 5,
        happiness: 5,
        freedom: 5,
        growth: 5,
        relationships: 5,
      },
      events: [],
      assets: [],
      relationships: initialRelationships || [],
      twin_profile: initialProfile || {},
      scenario_count: 0,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
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
 * Update a timeline with new events, stats, assets, and profile updates
 */
export async function updateTimeline(
  timelineId: string,
  updates: {
    current_age?: number;
    current_year?: number;
    stats?: TimelineStats;
    newEvents?: TimelineEvent[];
    newAssets?: TimelineAsset[];
    removedAssetTypes?: string[];
    twin_profile?: TimelineTwinProfile;
    relationships?: any[];
    scenario_count?: number;
  }
) {
  // Get current timeline
  const currentTimeline = await getTimeline(timelineId);
  if (!currentTimeline) {
    throw new Error('Timeline not found');
  }

  // Merge events (append new ones)
  const events = [
    ...(currentTimeline.events || []),
    ...(updates.newEvents || []),
  ];

  // Handle assets: remove old ones by type, then add new ones
  let assets = [...(currentTimeline.assets || [])];
  
  // Remove assets by type (e.g., remove "apartment" when buying "house")
  if (updates.removedAssetTypes && updates.removedAssetTypes.length > 0) {
    assets = assets.filter(
      (a: TimelineAsset) => !updates.removedAssetTypes!.includes(a.type || '')
    );
  }
  
  // Add new assets (avoiding duplicates by name)
  const existingAssetNames = new Set(assets.map((a: TimelineAsset) => a.name));
  const newAssets = (updates.newAssets || []).filter(
    (a) => !existingAssetNames.has(a.name)
  );
  assets = [...assets, ...newAssets];

  // Handle relationships: replace entirely with new list if provided, or keep existing
  // The AI should return the full updated list of relationships
  const relationships = updates.relationships || currentTimeline.relationships || [];

  const { data, error } = await supabase
    .from('timelines')
    .update({
      current_age: updates.current_age ?? currentTimeline.current_age,
      current_year: updates.current_year ?? currentTimeline.current_year ?? 1,
      stats: updates.stats ?? currentTimeline.stats,
      events: events as any,
      assets: assets as any,
      relationships: relationships as any,
      twin_profile: updates.twin_profile
        ? { ...currentTimeline.twin_profile, ...updates.twin_profile }
        : currentTimeline.twin_profile,
      scenario_count:
        updates.scenario_count ?? currentTimeline.scenario_count + 1,
    } as any)
    .eq('id', timelineId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a timeline
 */
export async function deleteTimeline(timelineId: string) {
  const { error } = await supabase.from('timelines').delete().eq('id', timelineId);

  if (error) throw error;
}
