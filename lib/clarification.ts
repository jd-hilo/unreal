/**
 * Clarification flows for Decision and Architect.
 * Question trees and state logic per REDESIGN_ONBOARDING_AND_APP_SPEC.md §1.
 */

export type DecisionClarificationKey = 'timeline' | 'risk_stability' | 'salary_vs_growth' | 'social_influence';

export interface DecisionClarificationState {
  timeline?: string;
  risk_stability?: string;
  salary_vs_growth?: string;
  social_influence?: string;
}

const DECISION_QUESTIONS: Record<DecisionClarificationKey, string> = {
  timeline: "What's the timeline or deadline for this decision?",
  risk_stability: 'Which matters more right now: stability or taking a chance?',
  salary_vs_growth: 'How important is salary vs. growth in this choice?',
  social_influence: "Would anyone else's opinion change your mind?",
};

/**
 * Parse clarification from context_summary JSON.
 */
export function parseDecisionClarification(contextSummary: string | null): DecisionClarificationState {
  if (!contextSummary || typeof contextSummary !== 'string') return {};
  try {
    const parsed = JSON.parse(contextSummary) as Record<string, string>;
    return {
      timeline: parsed.timeline,
      risk_stability: parsed.risk_stability,
      salary_vs_growth: parsed.salary_vs_growth,
      social_influence: parsed.social_influence,
    };
  } catch {
    return {};
  }
}

/**
 * Serialize clarification state to JSON for context_summary.
 */
export function serializeDecisionClarification(state: DecisionClarificationState): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(state).filter(([, v]) => v != null && v !== ''))
  );
}

/**
 * Get next question key based on current state and question/options.
 * Returns null if we have enough context (2+ rounds).
 */
export function getNextDecisionQuestionKey(
  state: DecisionClarificationState,
  question: string,
  options: string[]
): DecisionClarificationKey | null {
  const filled = Object.keys(state).filter((k) => state[k as DecisionClarificationKey]?.trim());
  if (filled.length >= 2) return null;

  // Always ask timeline first
  if (!state.timeline) return 'timeline';

  const q = question.toLowerCase();
  const opts = options.join(' ').toLowerCase();

  // Branch by question type
  if (filled.length >= 2) return null;
  if (!state.risk_stability && (opts.includes('risk') || opts.includes('stable') || opts.includes('chance') || q.includes('job') || q.includes('career')))
    return 'risk_stability';
  if (!state.salary_vs_growth && (q.includes('job') || q.includes('career') || q.includes('salary') || q.includes('promotion')))
    return 'salary_vs_growth';
  if (!state.social_influence && (q.includes('relationship') || q.includes('family') || q.includes('partner') || q.includes('move')))
    return 'social_influence';

  // Default to risk_stability or salary_vs_growth if we only have timeline
  if (!state.risk_stability) return 'risk_stability';
  if (!state.salary_vs_growth) return 'salary_vs_growth';
  if (!state.social_influence) return 'social_influence';

  return null;
}

/**
 * Get the next clarification question text for Decision flow.
 */
export function getNextDecisionQuestion(
  state: DecisionClarificationState,
  question: string,
  options: string[]
): string | null {
  const key = getNextDecisionQuestionKey(state, question, options);
  return key ? DECISION_QUESTIONS[key] : null;
}

export type ArchitectTopic = 'career' | 'health' | 'decision' | 'general';

/**
 * Classify the Architect topic from user message (simple keyword matching).
 */
export function classifyArchitectTopic(message: string): ArchitectTopic {
  const m = message.toLowerCase();
  if (/\b(work|job|career|burnout|boss|promotion|quit|employ)\b/.test(m)) return 'career';
  if (/\b(health|fitness|sleep|weight|exercise|stress|routine)\b/.test(m)) return 'health';
  if (/\b(decide|decision|choose|should i|option)\b/.test(m)) return 'decision';
  return 'general';
}

const ARCHITECT_QUESTIONS: Record<ArchitectTopic, string[]> = {
  career: ['How long has this been going on?', "What would change if things improved?"],
  health: ["What have you already tried?", "What's getting in the way?"],
  decision: ["What's the hardest part of choosing?", 'What would your future self tell you?'],
  general: ['Tell me more about that.', "What's really going on?"],
};

/**
 * Get the next Architect clarification question by topic and round.
 */
export function getNextArchitectQuestion(topic: ArchitectTopic, round: number): string {
  const questions = ARCHITECT_QUESTIONS[topic] || ARCHITECT_QUESTIONS.general;
  return questions[Math.min(round, questions.length - 1)] || questions[0];
}
