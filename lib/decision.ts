/**
 * Decision workflow pipeline
 * One-call wrapper that orchestrates pack building, prediction, post-processing, and storage
 */

import { buildCorePack, buildRelevancePack } from './relevance';
import { predictDecision } from './ai';
import { updateDecisionPrediction, getProfile } from './storage';
import { renormalize, temperatureScale, entropyUncertainty } from './postprocess';
import type { DecisionPrediction } from '@/types/database';

// Conditionally import expo-location
let Location: typeof import('expo-location') | null = null;
try {
  Location = require('expo-location');
} catch (e) {
  // expo-location not available (e.g., in web environment)
}

/**
 * Detect if a question is location-specific (e.g., "where should I eat", "which bar")
 */
export function isLocationSpecificQuestion(question: string): boolean {
  const locationKeywords = [
    'where should i',
    'where to',
    'which restaurant',
    'which bar',
    'which place',
    'where can i',
    'where do you recommend',
    'best place to',
    'good place to',
    'where to eat',
    'where to go',
    'restaurant',
    'bar',
    'cafe',
    'coffee shop',
    'nightlife',
    'venue',
  ];
  
  const lowerQuestion = question.toLowerCase();
  return locationKeywords.some(keyword => lowerQuestion.includes(keyword));
}

/**
 * Run the complete decision pipeline:
 * 1. Build Core Pack (identity, personality, values, relationships, career)
 * 2. Build Relevance Pack (vector search over narratives/journals/decisions)
 * 3. Enhance with location context if location-specific question
 * 4. Call OpenAI to predict decision
 * 5. Post-process (calibrate probabilities, calculate uncertainty)
 * 6. Save result to database
 *
 * @param userId - User ID
 * @param decisionId - Decision ID to update
 * @param question - Decision question
 * @param options - Array of option strings
 * @returns Final prediction result
 */
export async function runDecisionPipeline(
  userId: string,
  decisionId: string,
  question: string,
  options: string[]
): Promise<DecisionPrediction> {
  // Step 1: Build packs
  const corePack = await buildCorePack(userId);
  let relevancePack = await buildRelevancePack(userId, question);

  // Step 2: Enhance with location context if location-specific question
  if (isLocationSpecificQuestion(question)) {
    try {
      const profile = await getProfile(userId);
      
      // Get location_enabled from core_json.onboarding_responses
      let locationEnabled = false;
      if (profile?.core_json?.onboarding_responses?.['local-preferences']) {
        try {
          const localPrefs = JSON.parse(profile.core_json.onboarding_responses['local-preferences']);
          locationEnabled = localPrefs.location_enabled === true;
        } catch (e) {
          console.warn('Failed to parse local preferences:', e);
        }
      }
      
      if (locationEnabled && Location) {
        try {
          // Try to get real-time location
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const locationContext = `\n\nCURRENT GPS LOCATION: ${location.coords.latitude}, ${location.coords.longitude}\nUse this exact location to recommend REAL restaurants, bars, or venues nearby. IMPORTANT: Prioritize LOCAL, INDEPENDENT restaurants and venues over chain restaurants. Only suggest chains if there are no good local options nearby. Provide specific venue names, addresses, and why they match the user's preferences.`;
            relevancePack += locationContext;
          }
        } catch (error) {
          console.warn('Failed to get real-time location, using fallback:', error);
        }
      }
      
      // Add fallback location context if available
      if (profile?.current_location && !relevancePack.includes('CURRENT GPS LOCATION')) {
        relevancePack += `\n\nLOCATION FALLBACK: ${profile.current_location}\nUse this city/area to recommend REAL restaurants, bars, or venues. IMPORTANT: Prioritize LOCAL, INDEPENDENT restaurants and venues over chain restaurants. Only suggest chains if there are no good local options. Provide specific venue names and why they match the user's preferences.`;
      }
    } catch (error) {
      console.warn('Failed to enhance location context:', error);
    }
  }

  // Step 3: Get AI prediction
  let result = await predictDecision({
    corePack,
    relevancePack,
    question,
    options,
  });

  // Step 3: Post-process (calibrate and normalize)
  // First ensure probabilities sum to 1
  result.probs = renormalize(result.probs);

  // Apply temperature scaling for calibration (slightly increase confidence)
  result.probs = temperatureScale(result.probs, 0.9);

  // Overwrite uncertainty with entropy-based calculation
  result.uncertainty = entropyUncertainty(result.probs);

  // Step 4: Save to database
  await updateDecisionPrediction(decisionId, result);

  return result;
}




























