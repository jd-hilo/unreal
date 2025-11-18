/**
 * Decision workflow pipeline
 * One-call wrapper that orchestrates pack building, prediction, post-processing, and storage
 */

import { buildCorePack, buildRelevancePack } from './relevance';
import { predictDecision } from './ai';
import { updateDecisionPrediction } from './storage';
import { renormalize, temperatureScale, entropyUncertainty } from './postprocess';
import type { DecisionPrediction } from '@/types/database';

/**
 * Run the complete decision pipeline:
 * 1. Build Core Pack (identity, personality, values, relationships, career)
 * 2. Build Relevance Pack (vector search over narratives/journals/decisions)
 * 3. Call OpenAI to predict decision
 * 4. Post-process (calibrate probabilities, calculate uncertainty)
 * 5. Save result to database
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
  const relevancePack = await buildRelevancePack(userId, question);

  // Step 2: Get AI prediction
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




















