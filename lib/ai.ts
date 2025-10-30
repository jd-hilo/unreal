import Constants from 'expo-constants';
import type {
  LifeExtractionResult,
  RelationshipExtraction,
  ClarifierQuestion,
  DecisionPrediction,
  SimulationScenario,
  WhatIfMetrics,
} from '@/types/database';

const apiKey = Constants.expoConfig?.extra?.openaiApiKey || process.env.OPENAI_API_KEY || '';

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

export async function transcribeAudioAsync(audioUri: string): Promise<string> {
  if (DEV_MODE) {
    return mockTranscription();
  }

  const openai = getOpenAI();

  try {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    const file = new File([blob], 'audio.m4a', { type: 'audio/m4a' });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

export async function embedText(text: string): Promise<number[]> {
  if (DEV_MODE) {
    return Array(1536).fill(0).map(() => Math.random());
  }

  const openai = getOpenAI();

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}

export async function extractFromTranscript(transcript: string): Promise<LifeExtractionResult> {
  if (DEV_MODE) {
    return mockLifeExtraction();
  }

  const openai = getOpenAI();

  const systemPrompt = `You are an expert at transforming user life narratives into concise key facts and a short reasoning summary. Output strict JSON and a separate summary.`;

  const userPrompt = `Text:

${transcript}

Extract:
- core_json (only minimal facts relevant to identity & work/life):
  - possible keys: age_range, city, country, primary_role, job_sentiment, employment_type, side_projects, motivation.
- values_json (array) if they explicitly list values.
- relationships (array): items with {name_or_label, relationship_type, years_known_or_unknown, contact_frequency_or_unknown, influence_guess_0_1, location_or_unknown, sentiment} whenever people are mentioned.
- career_snippets (array): {title, company, start_date_or_unknown, end_date_or_unknown, satisfaction_1_5_or_unknown} if present.
- needs flags (array of strings) for missing but important clarifiers, e.g., needs.city, needs.role_start_date, needs.relationship_years.
- summary (3–6 sentences) capturing who they are & what matters.

Return:

{
  "core_json": {...},
  "values_json": ["..."],
  "relationships": [...],
  "career_snippets": [...],
  "needs": ["needs.city", "needs.relationship_years"],
  "summary": "..."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as LifeExtractionResult;
  } catch (error) {
    console.error('Extraction error:', error);
    throw error;
  }
}

export async function mineRelationships(transcript: string): Promise<RelationshipExtraction[]> {
  if (DEV_MODE) {
    return mockRelationships();
  }

  const openai = getOpenAI();

  const systemPrompt = `Extract ongoing relationships from the text. Be conservative; only include people that affect decisions.`;

  const userPrompt = `${transcript}

Return JSON array:

[
  {"name":"Maya","relationship_type":"partner","duration":"4 years","contact_frequency":"daily","influence":0.9,"location":"Florida","sentiment":"positive"}
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const parsed = JSON.parse(content);
    return (parsed.relationships || parsed) as RelationshipExtraction[];
  } catch (error) {
    console.error('Relationship mining error:', error);
    throw error;
  }
}

export async function generateClarifiers(
  profileCoreJson: any,
  needs: string[]
): Promise<ClarifierQuestion[]> {
  if (DEV_MODE) {
    return mockClarifiers();
  }

  const openai = getOpenAI();

  const systemPrompt = `Given the current profile object and needs flags, generate up to 3 quick follow-up questions. Prefer chips, sliders, or short pickers.`;

  const userPrompt = `Profile: ${JSON.stringify(profileCoreJson)}
Needs: ${JSON.stringify(needs)}

Return:

{
  "questions": [
    {"id":"q1","type":"picker-month-year","label":"When did you start your current role?"},
    {"id":"q2","type":"slider-years","label":"How long have you known Sam?"},
    {"id":"q3","type":"city-autocomplete","label":"What city are you in now?"}
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const parsed = JSON.parse(content);
    return parsed.questions as ClarifierQuestion[];
  } catch (error) {
    console.error('Clarifier generation error:', error);
    throw error;
  }
}

export async function predictDecision(
  corePack: string,
  relevancePack: string,
  question: string,
  options: string[]
): Promise<DecisionPrediction> {
  if (DEV_MODE) {
    return mockDecisionPrediction(options);
  }

  const openai = getOpenAI();

  const systemPrompt = `You are the user's digital twin. Use the Core Pack for identity and values. Use only facts from the Relevance Pack when helpful. Output calibrated probabilities for each option (sum≈1), a short rationale, top factors considered, and an uncertainty (0–1 lower is better).`;

  const userPrompt = `Core Pack:

${corePack}

Relevance Pack:

${relevancePack}

Question:

${question}
Options: ${JSON.stringify(options)}

Return:

{
  "prediction": "<one of the options>",
  "probs": {"<opt1>": 0.34, "<opt2>": 0.66},
  "rationale": "Short 2-4 sentence why.",
  "factors": ["relationship:partner_4y_supportive","values:growth>stability","decision_style:test-small"],
  "uncertainty": 0.27
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as DecisionPrediction;
  } catch (error) {
    console.error('Decision prediction error:', error);
    throw error;
  }
}

export async function simulateOutcome(
  corePack: string,
  policy: string,
  horizonDays: number
): Promise<SimulationScenario> {
  if (DEV_MODE) {
    return mockSimulation();
  }

  const openai = getOpenAI();

  const systemPrompt = `Simulate the user's likely state trajectory under the chosen policy. Use simple rules for energy/sleep/work/social/money. Return deltas vs baseline for: happiness, money, relationship, freedom, growth, and brief risk_notes.`;

  const userPrompt = `Core Pack:

${corePack}

Policy:

${policy}

Horizon: ${horizonDays}

Return:

{
  "deltas": {
    "happiness": -0.5,
    "money": +0.5,
    "relationship": -0.9,
    "freedom": -1.9,
    "growth": -0.9
  },
  "risk_notes": ["Commute reduces side-project hours; watch sleep <6.5h"],
  "notes": "One brief paragraph."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as SimulationScenario;
  } catch (error) {
    console.error('Simulation error:', error);
    throw error;
  }
}

export async function runWhatIf(
  baselineSummary: string,
  userText: string
): Promise<{ metrics: WhatIfMetrics; summary: string }> {
  if (DEV_MODE) {
    return mockWhatIf();
  }

  const openai = getOpenAI();

  const systemPrompt = `Generate a counterfactual trajectory as if the alternate event occurred, then compare to current baseline. Provide simple metrics and a human summary.`;

  const userPrompt = `Current baseline summary:

${baselineSummary}

Counterfactual prompt:

${userText}

Return:

{
  "metrics": {
    "happiness": {"current":7.4,"alternate":6.9},
    "money": {"current":6.8,"alternate":7.3},
    "relationship": {"current":8.1,"alternate":7.2},
    "freedom": {"current":8.7,"alternate":6.8},
    "growth": {"current":8.3,"alternate":7.4}
  },
  "summary": "One paragraph comparison."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content);
  } catch (error) {
    console.error('What-if error:', error);
    throw error;
  }
}

function mockTranscription(): string {
  return "I'm 28 years old, working as a software engineer in San Francisco. I've been with my partner for 3 years, and we're thinking about moving to a different city for better quality of life.";
}

function mockLifeExtraction(): LifeExtractionResult {
  return {
    core_json: {
      age_range: '25-30',
      city: 'San Francisco',
      country: 'USA',
      primary_role: 'Software Engineer',
      job_sentiment: 'mixed',
      employment_type: 'full-time',
    },
    values_json: ['freedom', 'growth', 'relationships'],
    relationships: [
      {
        name: 'Partner',
        relationship_type: 'partner',
        years_known: 3,
        contact_frequency: 'daily',
        influence: 0.9,
        sentiment: 'positive',
      },
    ],
    career_snippets: [
      {
        title: 'Software Engineer',
        company: 'Tech Co',
        satisfaction: 3,
      },
    ],
    needs: ['needs.university', 'needs.hometown'],
    summary:
      'A young software engineer in their late twenties, currently navigating career and relationship decisions in San Francisco. Values personal growth and meaningful connections.',
  };
}

function mockRelationships(): RelationshipExtraction[] {
  return [
    {
      name: 'Sam',
      relationship_type: 'friend',
      years_known: 5,
      contact_frequency: 'weekly',
      influence: 0.6,
      location: 'Seattle',
    },
  ];
}

function mockClarifiers(): ClarifierQuestion[] {
  return [
    {
      id: 'q1',
      type: 'text',
      label: 'What university did you attend?',
    },
    {
      id: 'q2',
      type: 'text',
      label: 'Where did you grow up?',
    },
  ];
}

function mockDecisionPrediction(options: string[]): DecisionPrediction {
  const probs: Record<string, number> = {};
  const totalProb = 1.0;
  const baseProb = totalProb / options.length;

  options.forEach((opt, idx) => {
    probs[opt] = idx === 0 ? baseProb + 0.1 : baseProb - 0.1 / (options.length - 1);
  });

  return {
    prediction: options[0],
    probs,
    rationale:
      'Based on your core values and past decision patterns, this option aligns best with your long-term goals.',
    factors: ['values:growth', 'relationship:supportive', 'decision_style:analytical'],
    uncertainty: 0.3,
  };
}

function mockSimulation(): SimulationScenario {
  return {
    deltas: {
      happiness: 0.5,
      money: -0.3,
      relationship: 0.8,
      freedom: 0.6,
      growth: 0.7,
    },
    risk_notes: ['Initial adjustment period may be challenging', 'Financial cushion recommended'],
    notes:
      'This scenario shows overall positive trajectory with strong relationship and personal growth benefits, though with some short-term financial trade-offs.',
  };
}

function mockWhatIf(): { metrics: WhatIfMetrics; summary: string } {
  return {
    metrics: {
      happiness: { current: 7.2, alternate: 6.8 },
      money: { current: 6.5, alternate: 7.5 },
      relationship: { current: 8.0, alternate: 7.0 },
      freedom: { current: 7.5, alternate: 6.5 },
      growth: { current: 7.8, alternate: 7.2 },
    },
    summary:
      'In this alternate timeline, you would likely have higher financial security but lower personal freedom and relationship satisfaction. Your current path appears to prioritize personal fulfillment over purely financial metrics.',
  };
}
