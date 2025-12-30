import Constants from 'expo-constants';
import type {
  LifeExtractionResult,
  RelationshipExtraction,
  ClarifierQuestion,
  DecisionPrediction,
  SimulationScenario,
  WhatIfMetrics,
  TimelineSimulation,
  YearPredictionData,
} from '@/types/database';

// Anthropic API key (Claude 3.5)
const anthropicApiKey = 
  Constants.expoConfig?.extra?.anthropicApiKey || 
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY ||
  null;

// Debug: Log if API key is found (without exposing the key)
if (anthropicApiKey) {
  console.log('✅ Anthropic API key found:', anthropicApiKey.substring(0, 10) + '...');
} else {
  console.warn('⚠️ Anthropic API key NOT found. Check .env file and restart Expo.');
}

// OpenAI API key (for embeddings and transcription only)
const openaiApiKey = 
  Constants.expoConfig?.extra?.openaiApiKey || 
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY || 
  '';

const DEV_MODE = !anthropicApiKey && !openaiApiKey;

if (DEV_MODE) {
  console.warn('⚠️ API keys not found. Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY in .env file');
}

let anthropicInstance: any = null;
let openaiInstance: any = null;

function getAnthropic() {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  if (!anthropicInstance) {
    const Anthropic = require('@anthropic-ai/sdk').default;
    anthropicInstance = new Anthropic({
      apiKey: anthropicApiKey,
    });
  }

  return anthropicInstance;
}

function getOpenAI() {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!openaiInstance) {
    const OpenAI = require('openai').default;
    openaiInstance = new OpenAI({
      apiKey: openaiApiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  return openaiInstance;
}

// Helper function to call Claude Sonnet 4
async function callClaude(options: {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
}): Promise<string> {
  const anthropic = getAnthropic();
  const model = options.model || 'claude-sonnet-4-20250514';
  
  // Convert messages format for Anthropic
  const anthropicMessages = options.messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const params: any = {
    model,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    messages: anthropicMessages,
  };

  // Add system message if provided
  if (options.system) {
    params.system = options.system;
  }

  // Handle JSON mode (Anthropic uses tool_use for structured output)
  if (options.responseFormat?.type === 'json_object') {
    // For JSON mode, we'll add instructions to the system prompt
    const systemWithJson = options.system 
      ? `${options.system}\n\nIMPORTANT: You must respond with valid JSON only. Do not include any text outside of the JSON object.`
      : 'IMPORTANT: You must respond with valid JSON only. Do not include any text outside of the JSON object.';
    params.system = systemWithJson;
  }

  // Retry logic for 529 (overloaded) errors
  const maxRetries = 3;
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create(params);
      
      // Extract text content from response
      let content = response.content.find((block: any) => block.type === 'text')?.text;
      if (!content) throw new Error('No response from Claude');
      
      // Clean up JSON if response format is JSON (remove markdown code blocks)
      if (options.responseFormat?.type === 'json_object') {
        // Remove markdown code blocks if present
        content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      }
      
      return content;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a 529 overloaded error
      const isOverloaded = error?.status === 529 || 
                          error?.error?.type === 'overloaded_error' ||
                          error?.message?.includes('Overloaded') ||
                          error?.message?.includes('529');
      
      if (isOverloaded && attempt < maxRetries - 1) {
        // Exponential backoff: wait 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`API overloaded (529), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not overloaded or max retries reached, throw the error
      throw error;
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error('Failed to call Claude after retries');
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

  const systemPrompt = 'You are an expert at transforming user life narratives into concise key facts and a short reasoning summary. Output strict JSON and a separate summary.';

  const userPrompt = [
    'Text:',
    '',
    transcript,
    '',
    'Extract:',
    '- core_json (only minimal facts relevant to identity & work/life):',
    '  - possible keys: age_range, city, country, primary_role, job_sentiment, employment_type, side_projects, motivation.',
    '- values_json (array) if they explicitly list values.',
    '- relationships (array): items with {name_or_label, relationship_type, years_known_or_unknown, contact_frequency_or_unknown, influence_guess_0_1, location_or_unknown, sentiment} whenever people are mentioned.',
    '- career_snippets (array): {title, company, start_date_or_unknown, end_date_or_unknown, satisfaction_1_5_or_unknown} if present.',
    '- needs flags (array of strings) for missing but important clarifiers, e.g., needs.city, needs.role_start_date, needs.relationship_years.',
    '- summary (3–6 sentences) capturing who they are & what matters.',
    '',
    'Return JSON:',
    '',
    '{',
    '  "core_json": {...},',
    '  "values_json": ["..."],',
    '  "relationships": [...],',
    '  "career_snippets": [...],',
    '  "needs": ["needs.city", "needs.relationship_years"],',
    '  "summary": "..."',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
    });

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

  const systemPrompt = 'Extract ALL relationships mentioned in the text. Include every person discussed. Be thorough and comprehensive.';

  const userPrompt = [
    transcript,
    '',
    'Extract ALL people mentioned in the text above. For each person, provide:',
    '- name: their name',
    '- relationship_type: one of: partner, spouse, family, friend, mentor, coworker, boss, or other',
    "- duration: how long they've known them (e.g., \"5 years\", \"2\", etc.)",
    '- contact_frequency: how often they talk (daily, weekly, monthly, rarely)',
    "- influence: 0-1 scale of how much they influence decisions (0.5 if unknown)",
    '- location: where they live',
    '- sentiment: positive, neutral, or negative',
    '',
    'Return JSON object with ALL relationships:',
    '',
    '{',
    '  "relationships": [',
    '    {"name":"Sarah","relationship_type":"partner","duration":"5","contact_frequency":"daily","influence":0.9,"location":"NYC","sentiment":"positive"},',
    '    {"name":"Mike","relationship_type":"friend","duration":"10","contact_frequency":"weekly","influence":0.6,"location":"SF","sentiment":"positive"},',
    '    {"name":"Jane","relationship_type":"mentor","duration":"3","contact_frequency":"monthly","influence":0.8,"location":"Boston","sentiment":"positive"}',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(content);
    
    // Extract array from response - could be wrapped in various ways
    let relationships = parsed.relationships || parsed.data || parsed;
    
    // If it's an object but not an array, try to convert it to array
    if (!Array.isArray(relationships)) {
      if (typeof relationships === 'object' && relationships !== null) {
        // Try to get array values from object
        relationships = Object.values(relationships).filter(v => typeof v === 'object');
      } else {
        relationships = [];
      }
    }
    
    return relationships as RelationshipExtraction[];
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

  const systemPrompt = 'Given the current profile object and needs flags, generate up to 3 quick follow-up questions. Prefer chips, sliders, or short pickers.';

  const userPrompt = [
    `Profile: ${JSON.stringify(profileCoreJson)}`,
    `Needs: ${JSON.stringify(needs)}`,
    '',
    'Return JSON:',
    '',
    '{',
    '  "questions": [',
    '    {"id":"q1","type":"picker-month-year","label":"When did you start your current role?"},',
    '    {"id":"q2","type":"slider-years","label":"How long have you known Sam?"},',
    '    {"id":"q3","type":"city-autocomplete","label":"What city are you in now?"}',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.5,
    });

    const parsed = JSON.parse(content);
    return parsed.questions as ClarifierQuestion[];
  } catch (error) {
    console.error('Clarifier generation error:', error);
    throw error;
  }
}

export async function deriveDecisionOptions(question: string): Promise<string[]> {
  if (DEV_MODE) {
    // Mock implementation for dev mode
    if (question.toLowerCase().includes('should i') || question.toLowerCase().includes('should you')) {
      return ['Yes', 'No'];
    }
    return ['Option A', 'Option B', 'Option C'];
  }

  const openai = getOpenAI();

  const systemPrompt = [
    'You are an AI that extracts or generates decision options from a question.',
    '',
    'Rules:',
    '1. If the question is yes/no ("Should I...?"), return ["Yes", "No"]',
    '2. If the question explicitly mentions options (e.g., "X or Y"), extract them exactly as stated',
    '3. If the question is open-ended, generate 2-4 highly specific options that directly answer the question',
    '4. Options must directly relate to and address the specific question asked - extract key details from the question',
    '5. Keep options concise but specific (3-8 words each) - include relevant details from the question',
    '6. Make options actionable, mutually exclusive, and directly answer what the question is asking',
    '7. Use REAL, SPECIFIC entities: actual college names (e.g., "Stanford", "MIT", "UC Berkeley"), real company names, real city names, real product names, etc. - NEVER use generic placeholders like "College A", "Company X", "City Y"',
    '8. When the question asks about specific types of entities (colleges, companies, cities, products), provide real examples of those entities',
    '',
    'Examples:',
    'Q: "Should I take the new job offer?"',
    'A: ["Yes", "No"]',
    '',
    'Q: "Should I move to NYC or stay in SF?"',
    'A: ["Move to NYC", "Stay in SF"]',
    '',
    'Q: "Where should I go to college?"',
    'A: ["Stanford University", "MIT", "UC Berkeley", "Harvard University"]',
    '',
    'Q: "What company should I work for?"',
    'A: ["Google", "Apple", "Microsoft", "Start my own company"]',
    '',
    'Q: "What should I do about my career?"',
    'A: ["Stay in current role and seek promotion", "Apply for new positions in tech", "Start my own consulting business", "Take a 6-month sabbatical to reassess"]',
    '',
    'Q: "Should I invest in stocks or real estate?"',
    'A: ["Invest in stocks", "Invest in real estate", "Split investment between both", "Wait and save more first"]',
    '',
    'Q: "How should I handle my relationship with my manager?"',
    'A: ["Schedule a direct conversation about concerns", "Document issues and go to HR", "Try to improve communication first", "Look for a transfer to another team"]',
  ].join('\n');

  const userPrompt = [
    `Question: "${question}"`,
    '',
    'Generate options that are specific to this exact question. Extract key details from the question and use them in the options. Use REAL, SPECIFIC entities (real college names, real companies, real cities, etc.) - never use generic placeholders.',
    '',
    'Return ONLY a JSON object with an "options" array. No other text.',
    '',
    '{',
    '  "options": ["option1", "option2", ...]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(content);
    const options = parsed.options || [];
    
    // Ensure we have at least 2 options
    if (options.length < 2) {
      return ['Yes', 'No'];
    }
    
    // Cap at 4 options
    return options.slice(0, 4);
  } catch (error) {
    console.error('Option derivation error:', error);
    // Fallback to yes/no
    return ['Yes', 'No'];
  }
}

export async function deriveDecisionOptionsWithContext(question: string, context: string = ''): Promise<string[]> {
  if (DEV_MODE) {
    // Mock implementation for dev mode
    if (question.toLowerCase().includes('should i') || question.toLowerCase().includes('should you')) {
      return ['Yes', 'No'];
    }
    return ['Option A', 'Option B', 'Option C'];
  }

  const openai = getOpenAI();

  const systemPrompt = [
    'You are an AI that extracts or generates decision options from a question.',
    context ? 'You have context about the person/people asking the question. Use it to generate more personalized, relevant options.' : '',
    '',
    'Rules:',
    '1. If the question is yes/no ("Should I...?"), return ["Yes", "No"]',
    '2. If the question explicitly mentions options (e.g., "X or Y"), extract them exactly as stated',
    '3. If the question is open-ended, generate 2-4 highly specific options that directly answer the question',
    '4. Options must directly relate to and address the specific question asked - extract key details from the question',
    '5. Keep options concise but specific (3-8 words each) - include relevant details from the question',
    '6. Make options actionable, mutually exclusive, and directly answer what the question is asking',
    '7. Consider the provided context to make options more relevant and personalized',
    '8. Use REAL, SPECIFIC entities: actual college names (e.g., "Stanford", "MIT", "UC Berkeley"), real company names, real city names, real product names, etc. - NEVER use generic placeholders like "College A", "Company X", "City Y"',
    '9. When the question asks about specific types of entities (colleges, companies, cities, products), provide real examples of those entities',
    '',
    'Examples:',
    'Q: "Should I take the new job offer?"',
    'A: ["Yes", "No"]',
    '',
    'Q: "Should I move to NYC or stay in SF?"',
    'A: ["Move to NYC", "Stay in SF"]',
    '',
    'Q: "Where should I go to college?"',
    'A: ["Stanford University", "MIT", "UC Berkeley", "Harvard University"]',
    '',
    'Q: "What company should I work for?"',
    'A: ["Google", "Apple", "Microsoft", "Start my own company"]',
    '',
    'Q: "What should I do about my career?"',
    'A: ["Stay in current role and seek promotion", "Apply for new positions in tech", "Start my own consulting business", "Take a 6-month sabbatical to reassess"]',
    '',
    'Q: "Should I invest in stocks or real estate?"',
    'A: ["Invest in stocks", "Invest in real estate", "Split investment between both", "Wait and save more first"]',
    '',
    'Q: "How should I handle my relationship with my manager?"',
    'A: ["Schedule a direct conversation about concerns", "Document issues and go to HR", "Try to improve communication first", "Look for a transfer to another team"]',
  ].join('\n');

  const userPrompt = context ? [
    'Context about the person/people:',
    '',
    context.substring(0, 2000), // Limit context to avoid token limits
    '',
    `Question: "${question}"`,
    '',
    'Generate options that are specific to this exact question. Extract key details from the question and use them in the options. Use the context to make options more personalized and relevant. Use REAL, SPECIFIC entities (real college names, real companies, real cities, etc.) - never use generic placeholders.',
    '',
    'Return ONLY a JSON object with an "options" array. No other text.',
    '',
    '{',
    '  "options": ["option1", "option2", ...]',
    '}',
  ].join('\n') : [
    `Question: "${question}"`,
    '',
    'Generate options that are specific to this exact question. Extract key details from the question and use them in the options. Use REAL, SPECIFIC entities (real college names, real companies, real cities, etc.) - never use generic placeholders.',
    '',
    'Return ONLY a JSON object with an "options" array. No other text.',
    '',
    '{',
    '  "options": ["option1", "option2", ...]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(content);
    const options = parsed.options || [];
    
    // Ensure we have at least 2 options
    if (options.length < 2) {
      return ['Yes', 'No'];
    }
    
    // Cap at 4 options
    return options.slice(0, 4);
  } catch (error) {
    console.error('Option derivation error:', error);
    // Fallback to yes/no
    return ['Yes', 'No'];
  }
}

export async function predictDecision({
  corePack,
  relevancePack,
  question,
  options,
  participantCount = 1,
}: {
  corePack: string;
  relevancePack: string;
  question: string;
  options: string[];
  participantCount?: number;
}): Promise<DecisionPrediction> {
  console.log('=== PREDICT DECISION CALLED ===');
  console.log('DEV_MODE:', DEV_MODE);
  console.log('Question:', question);
  console.log('Options:', options);
  console.log('Participant count:', participantCount);
  console.log('Core Pack length:', corePack.length);
  console.log('Relevance Pack length:', relevancePack.length);
  
  if (DEV_MODE) {
    console.warn('⚠️ DEV_MODE: Using mock prediction (no API key configured)');
    return mockDecisionPrediction(options);
  }

  console.log('Calling Claude API...');
  const isMultiTwin = participantCount > 1;
  
  const systemPrompt = isMultiTwin ? [
    "You are aggregating perspectives from multiple digital twins to provide a collective recommendation.",
    '',
    'The Core Pack contains profiles from multiple twins (PRIMARY TWIN and TWIN 1). Consider all their perspectives, values, and experiences.',
    '',
    'Use the Relevance Pack for additional context from the primary user.',
    '',
    'IMPORTANT: Your rationale MUST explicitly discuss BOTH people and their perspectives:',
    '- Mention how each person\'s values, personality, or situation influences the recommendation',
    '- Highlight where their perspectives align or differ',
    '- Show how considering both viewpoints strengthens or complicates the decision',
    '- Example: "You value freedom while your friend prioritizes stability, and together this suggests..."',
    '',
    'Return calibrated probabilities that represent a balanced aggregation of all twin perspectives,',
    'a concise rationale (3–5 sentences) that CLEARLY references BOTH people,',
    'top factors considered across all twins, and an uncertainty score (0–1, lower = more confident).',
    '',
    'RATIONALE REQUIREMENTS:',
    '- Include 1–2 vivid, user-specific hooks that reference concrete details from their profiles',
    '- Examples: "Remember that journal entry about dreading long-distance calls? This move cuts that noise."',
    '- Or: "Your tendency to overthink at 2am suggests this option aligns with your need for clarity."',
    '- Reference specific experiences, preferences, patterns, or details from the Core Pack or Relevance Pack',
    '- Make it feel personal and insightful, not generic',
    '',
    'Keep tone reflective, human, and emotionally grounded — not mechanical.',
    '',
    'CRITICAL: Write all text in SECOND PERSON (you/your), never third person. Address the primary user directly.',
    'Use phrases like "you and [their name]" or "while you value X, they value Y".',
    `Note: This decision is being analyzed by ${participantCount} twins collectively.`,
  ].join('\n') : [
    "You are the user's digital twin.",
    '',
    'Use the Core Pack for identity, personality, values, and decision tendencies.',
    '',
    'Use only facts from the Relevance Pack when they help answer the question.',
    '',
    'Return calibrated probabilities for each option (summing to ~1), a concise rationale (2–4 sentences),',
    'top factors considered, and an uncertainty score (0–1, lower = more confident).',
    '',
    'RATIONALE REQUIREMENTS:',
    '- Include 1–2 vivid, user-specific hooks that reference concrete details from their profile',
    '- Examples: "Remember that journal entry about dreading long-distance calls? This move cuts that noise."',
    '- Or: "Your tendency to overthink at 2am suggests this option aligns with your need for clarity."',
    '- Reference specific experiences, preferences, patterns, or details from the Core Pack or Relevance Pack',
    '- Make it feel personal and insightful, not generic',
    '',
    'Keep tone reflective, human, and emotionally grounded — not mechanical.',
    '',
    'CRITICAL: Write all text in SECOND PERSON (you/your), never third person. Address the user directly.',
  ].join('\n');

  const userPrompt = [
    'Core Pack:',
    '',
    corePack,
    '',
    'Relevance Pack:',
    '',
    relevancePack,
    '',
    'Question:',
    '',
    question,
    '',
    'Options:',
    '',
    JSON.stringify(options),
    '',
    "RETURN JSON with probabilities that sum to 1.0 based on YOUR actual analysis (don't copy these example numbers):",
    '',
    '{',
    '  "prediction": "<one_of_options>",',
    '  "probs": {"<option1>": 0.XX, "<option2>": 0.XX},',
    '  "rationale": "2–4 sentences explaining your reasoning in SECOND PERSON (you/your). Include 1–2 vivid, user-specific hooks referencing concrete details from their profile (e.g., journal entries, past experiences, specific preferences).",',
    '  "factors": ["values:freedom", "relationship:partner_4y_supportive", "decision_style:test-small"],',
    '  "uncertainty": 0.XX,',
    '  "chaosLevel": 0-100 (how wild/unpredictable this decision would make life),',
    '  "chaosMessage": "brief message like \'brace yourself\' or \'pretty stable\'",',
    '  "sideEffects": ["You start going to bed earlier.", "Your gym consistency spikes.", "You become the \'advice friend\' in your group."],',
    '  "nextSteps": ["Specific action 1", "Specific action 2", "Specific action 3"]',
    '}',
    '',
    'IMPORTANT:',
    '- chaosLevel: 0-100, where higher = more chaotic/unpredictable (e.g., major life changes = higher)',
    '- sideEffects: 3-5 funny, specific, unexpected side effects in SECOND PERSON (you/your)',
    '- nextSteps: REQUIRED - 3 concrete, immediate actions to take if they choose the predicted option. Make them specific and actionable.',
    '',
    'IMPORTANT:',
    '- Generate probabilities based on the actual user context and decision - do NOT use 0.66 or 0.34 unless they truly reflect your analysis',
    '- Write rationale in SECOND PERSON: "You tend to...", "Your values suggest...", never "They" or "The user"',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.2,
    });

    console.log('Raw AI response:', content.substring(0, 500));
    const parsed = JSON.parse(content) as DecisionPrediction;
    
    console.log('Parsed prediction:', {
      prediction: parsed.prediction,
      probs: parsed.probs,
      rationale: parsed.rationale?.substring(0, 100),
      factors: parsed.factors,
      uncertainty: parsed.uncertainty,
    });
    
    // Ensure probabilities sum to ~1 and are properly formatted
    const probSum = Object.values(parsed.probs || {}).reduce((sum, val) => sum + (val as number), 0);
    if (Math.abs(probSum - 1.0) > 0.01) {
      console.warn('Probabilities did not sum to 1, normalizing:', probSum);
      // Normalize probabilities if they don't sum to 1
      const normalizedProbs: Record<string, number> = {};
      Object.entries(parsed.probs || {}).forEach(([key, val]) => {
        normalizedProbs[key] = (val as number) / probSum;
      });
      parsed.probs = normalizedProbs;
    }
    
        // Generate chaos level and side effects if not provided
    if (!parsed.chaosLevel || !parsed.sideEffects || !parsed.nextSteps) {
      try {
        // Calculate chaos level based on uncertainty and decision impact
        const baseChaos = parsed.uncertainty * 50; // 0-50 based on uncertainty
        const impactChaos = Math.abs(Object.values(parsed.probs)[0] - 0.5) * 50; // Higher if more decisive
        parsed.chaosLevel = Math.round(Math.min(100, Math.max(0, baseChaos + impactChaos)));
        parsed.chaosMessage = parsed.chaosLevel > 70 ? 'brace yourself' : parsed.chaosLevel > 40 ? 'moderate change' : 'pretty stable';
        
        // Generate side effects if not provided
        if (!parsed.sideEffects || parsed.sideEffects.length === 0) {
          try {
            parsed.sideEffects = await generateDecisionSideEffects({
              question,
              prediction: parsed.prediction,
              corePack,
              relevancePack,
            });
          } catch (error) {
            console.warn('Failed to generate side effects:', error);
            parsed.sideEffects = ['You discover unexpected changes in your routine.'];
          }
        }

        // Default next steps if not provided
        if (!parsed.nextSteps || parsed.nextSteps.length === 0) {
          parsed.nextSteps = [
            'Reflect on the key factors identified above',
            'Discuss this recommendation with a trusted friend',
            'Set a deadline to make your final choice'
          ];
        }
      } catch (error) {
        console.warn('Failed to generate chaos level/side effects, using defaults:', error);
        parsed.chaosLevel = parsed.chaosLevel || 50;
        parsed.chaosMessage = parsed.chaosMessage || 'moderate change';
        parsed.sideEffects = parsed.sideEffects || ['You discover unexpected changes in your routine.'];
        parsed.nextSteps = parsed.nextSteps || ['Reflect on the key factors', 'Discuss with a friend', 'Set a deadline'];
      }
    }
    
    console.log('Final prediction:', parsed);
    return parsed;
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

  const systemPrompt = "Simulate the user's likely state trajectory under the chosen policy. Use simple rules for energy/sleep/work/social/money. Return deltas vs baseline for: happiness, money, relationship, freedom, growth, and brief risk_notes.";

  const userPrompt =
    'Core Pack:\n\n' +
    corePack +
    '\n\nPolicy:\n\n' +
    policy +
    '\n\nHorizon: ' + horizonDays + '\n\n' +
    'Return JSON:\n\n' +
    '{\n' +
    '  "deltas": {\n' +
    '    "happiness": -0.5,\n' +
    '    "money": +0.5,\n' +
    '    "relationship": -0.9,\n' +
    '    "freedom": -1.9,\n' +
    '    "growth": -0.9\n' +
    '  },\n' +
    '  "risk_notes": ["Commute reduces side-project hours; watch sleep <6.5h"],\n' +
    '  "notes": "One brief paragraph."\n' +
    '}';

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.5,
    });

    return JSON.parse(content) as SimulationScenario;
  } catch (error) {
    console.error('Simulation error:', error);
    throw error;
  }
}

export async function generateTimelineSimulation(
  corePack: string,
  decision: string,
  chosenOption: string,
  participantCount: number = 1
): Promise<TimelineSimulation> {
  const aiStartTime = performance.now();
  console.log('[AI] Starting generateTimelineSimulation at', new Date().toISOString());
  console.log(`[AI] Core pack length: ${corePack.length} chars, Decision: "${decision}", Option: "${chosenOption}"`);
  console.log(`[AI] Participant count: ${participantCount}`);
  
  if (DEV_MODE) {
    console.log('[AI] DEV_MODE: Using mock timeline simulation');
    return mockTimelineSimulation();
  }

  const isMultiTwin = participantCount > 1;

  const systemPrompt = isMultiTwin ?
    'You are simulating a 10-year timeline for TWO PEOPLE making a life decision. Generate concrete, detailed events with real numbers and specifics.\n\n' +
    'CRITICAL RULES:\n' +
    '- The Core Pack contains profiles for TWO people (PRIMARY TWIN and TWIN 1) - extract their first names\n' +
    '- Generate events that involve BOTH people together AND individual events for each person\n' +
    '- For EACH event, include a "people" field with array of first names involved (e.g., ["Sarah"], ["John"], or ["Sarah", "John"])\n' +
    '- Mix individual and joint events naturally (roughly 40% individual split between both people, 60% joint)\n' +
    '- Use SECOND PERSON (you/your) for the PRIMARY person, but mention the other person by first name when relevant\n' +
    '- Write ALL events in second person addressing the primary user\n' +
    '- Example individual: {"time": "Month 2", "title": "Sarah Launches Side Business", "description": "Sarah starts consulting on weekends...", "people": ["Sarah"]}\n' +
    '- Example joint: {"time": "Month 5", "title": "You and Alex Buy House Together", "description": "You both close on property...", "people": ["Primary", "Alex"]}\n' +
    '- Be HYPER-SPECIFIC with exact numbers, costs, percentages, timeframes\n' +
    '- TIME FORMAT: Use simple timeframes ONLY - "Month X" or "Year X" or "Year X.Y" (e.g., "Month 2", "Year 1.5"). NEVER use combinations like "Month 2, Week 3"\n' +
    '- NO brand names - use generic descriptors'
    :
    'You are a life trajectory simulator. Generate HYPER-SPECIFIC, concrete events with real details. ' +
    'Use actual numbers, specific places, named scenarios. Avoid generic statements.\n\n' +
    'CRITICAL: Write ALL events in SECOND PERSON (you/your). The user is living this timeline.';

  const userPrompt =
    'User Context:\n\n' +
    corePack +
    '\n\nDecision Made:\n' +
    decision +
    '\n\nChosen Option:\n' +
    chosenOption +
    '\n\nGenerate a timeline of 5 HYPER-SPECIFIC events for each horizon (1 year, 3 years, 5 years, 10 years).\n\n' +
    'CRITICAL REQUIREMENTS:\n' +
    '1. DECISION RELEVANCE: Most events should DIRECTLY result from choosing "' + chosenOption + '" for the decision "' + decision + '"\n' +
    '2. CURRENT LIFESTYLE: Incorporate relevant facts from the User Context (their job, location, relationships, values)\n' +
    '3. CAUSAL CHAIN: Show how this decision creates a cascade of specific life changes\n' +
    '4. BALANCE: 60-70% of events should be decision-specific, 30-40% natural life progression\n\n' +
    'Be HYPER-SPECIFIC with concrete details:\n' +
    '- Exact numbers ($X saved, X% growth, X hours per week, X people)\n' +
    '- Generic locations (coffee shop, downtown, convention center, office) - NO brand names\n' +
    '- Named people when relevant (can be hypothetical: "colleague Alex", "friend Jamie")\n' +
    '- Concrete activities (meeting, trip, project launch, purchase, move)\n' +
    '- TIME FORMAT: Use simple timeframes ONLY - "Month X" or "Year X" or "Year X.Y" (e.g., "Month 2", "Year 1.5", "Year 3"). NEVER use combinations like "Month 2, Week 3" or "Year 1, Month 6"\n' +
    '- SHORT descriptions (1-2 sentences ONLY, prefer single sentence)\n\n' +
    'GOOD examples (specific, second person, no brands):\n' +
    '- "You save $2,400 in high-yield savings account at 4.5% APY"\n' +
    '- "You move to 2BR apartment downtown for $2,200/mo, 8 min walk to work"\n' +
    '- "You lead team of 4 on major product launch, earn $15K performance bonus"\n' +
    '- "You meet potential mentor at industry conference, exchange contact info, follow up Tuesday"\n\n' +
    'BAD examples:\n' +
    '- Generic: "Professional growth continues" or "Financial situation improves"\n' +
    '- Brand names: "Open Marcus savings account" or "Buy Starbucks franchise"\n' +
    '- Third person: "User saves money" or "They move to new apartment"\n' +
    '- Complex timeframes: "Month 2, Week 3" or "Year 1, Month 6" - use simple "Month 2" or "Year 1.5" instead\n\n' +
    'Return JSON:\n\n' +
    '{\n' +
    '  "one_year": [\n' +
    '    {"time": "Month 2", "title": "Save $3,200 in High-Yield Account", "description": "You open savings account at 4.5% APY. Automate $800/mo deposits every payday."},\n' +
    '    {"time": "Month 5", "title": "Coffee Meeting With Industry Contact", "description": "You meet mentor contact introduced by college friend. 45-minute conversation leads to job referral."},\n' +
    '    {"time": "Month 8", "title": "Finish Online Course, 84 Hours", "description": "You complete certification program. Final project scores 94/100. Add credential to profile."},\n' +
    '    {"time": "Month 10", "title": "Sign Lease on $2,400/mo Apt", "description": "You move to new place 12 minutes from work. Commute drops from 75 to 12 minutes each way."},\n' +
    '    {"time": "Year 1", "title": "Performance Review: $6,500 Bonus", "description": "Your annual review results in Exceeds rating. You receive $6,500 bonus and 4% salary increase to $87,400."}\n' +
    '  ],\n' +
    '  "three_year": [\n' +
    '    {"time": "Year 1.5", "title": "Promotion to $112K Base Salary", "description": "You are promoted to senior role managing 2 direct reports. Base salary increases from $87K to $112K plus new equity grant."},\n' +
    '    {"time": "Year 2", "title": "7-Day International Trip, $2,800", "description": "You book flights for $640, accommodation $890 for week. First international solo trip fully paid in cash."},\n' +
    '    {"time": "Year 2.5", "title": "Launch Side Consulting Practice", "description": "You start weekend consulting work. First client contract: $3,500 for 20 hours over 4 weeks."},\n' +
    '    {"time": "Year 2.8", "title": "Move In Together, Split $2,600", "description": "Your partner moves into your 2BR. You each pay $1,300/mo vs $2,400 solo, saving $1,100/mo combined."},\n' +
    '    {"time": "Year 3", "title": "Investment Portfolio Hits $67K", "description": "Your balances: $38K in 401k, $21K in index funds, $8K emergency fund. Compound growth accelerating."}\n' +
    '  ],\n' +
    '  "five_year": [\n' +
    '    {"time": "Year 3.5", "title": "Present at Industry Conference, 220 People", "description": "You deliver 30-minute talk at convention center. 37 connection requests, 4 job inquiries follow."},\n' +
    '    {"time": "Year 4", "title": "Buy $38K Electric Vehicle", "description": "You finance $32K over 5 years at 5.2% APR. Payment $605/mo, save $140/mo on fuel costs."},\n' +
    '    {"time": "Year 4.5", "title": "Host Family Dinner for 12", "description": "Thanksgiving at your place for first time. You cook dinner, serve at 6pm. Dad says You made it."},\n' +
    '    {"time": "Year 4.8", "title": "Complete Half Marathon in 1:58:42", "description": "You finish city half marathon after 14-week training plan. Beat goal by 8 minutes. Lost 15 lbs since starting."},\n' +
    '    {"time": "Year 5", "title": "Accept $165K Offer at Growth Company", "description": "Your new job: Director role at 45-person startup. $140K base + $25K equity. Start date: March 15."}\n' +
    '  ],\n' +
    '  "ten_year": [\n' +
    '    {"time": "Year 6.5", "title": "$85K Down Payment on $475K Home", "description": "You close on 2BR/2BA property. Mortgage $2,850/mo at 6.1%. Build equity vs renting."},\n' +
    '    {"time": "Year 7.5", "title": "Consulting Revenue: $95K/Year", "description": "Your side practice nets $7,900/mo with 6 retainer clients. You hire assistant for $1,800/mo to handle admin."},\n' +
    '    {"time": "Year 8.5", "title": "10-Week International Sabbatical", "description": "You take July-Sept unpaid leave. Budget $16,500 for multi-country trip. Return with 200+ photos and fresh energy."},\n' +
    '    {"time": "Year 9", "title": "Mentor 4 People Through Program", "description": "You become official mentor in company program. Meet mentees bi-weekly for coffee. One mentee gets promoted within 8 months."},\n' +
    '    {"time": "Year 10", "title": "Net Worth Reaches $380K", "description": "Your assets: $165K home equity, $125K in retirement, $55K brokerage, $35K cash. Average monthly expenses: $4,200."}\n' +
    '  ]\n' +
    '}';

  try {
    const promptPrepTime = performance.now();
    const promptTime = promptPrepTime - aiStartTime;
    console.log(`[AI] Prompt preparation took ${promptTime.toFixed(2)}ms`);
    console.log(`[AI] System prompt length: ${systemPrompt.length} chars`);
    console.log(`[AI] User prompt length: ${userPrompt.length} chars`);
    
    const apiCallStartTime = performance.now();
    console.log('[AI] Making Claude API call...');
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.7,
    });
    const apiCallEndTime = performance.now();
    const apiCallDuration = apiCallEndTime - apiCallStartTime;
    console.log(`[AI] Claude API call completed in ${(apiCallDuration / 1000).toFixed(2)}s`);

    const parseStartTime = performance.now();
    const timelineData = JSON.parse(content) as TimelineSimulation;
    const parseEndTime = performance.now();
    console.log(`[AI] JSON parsing took ${(parseEndTime - parseStartTime).toFixed(2)}ms`);
    
    const totalTime = performance.now() - aiStartTime;
    console.log(`[AI] Total generateTimelineSimulation time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`[AI] Timeline events:`, {
      one_year: timelineData.one_year?.length || 0,
      three_year: timelineData.three_year?.length || 0,
      five_year: timelineData.five_year?.length || 0,
      ten_year: timelineData.ten_year?.length || 0,
    });

    return timelineData;
  } catch (error) {
    const errorTime = performance.now() - aiStartTime;
    console.error(`[AI] Timeline simulation error after ${(errorTime / 1000).toFixed(2)}s:`, error);
    throw error;
  }
}

export interface TwinChatResponse {
  text: string;
  ui?: {
    type: 'choice' | 'slider';
    data: any;
  };
}

/**
 * Generate a chat reply from the user's alternate-timeline twin "today",
 * grounded in the What-If scenario summary and the user's Core Pack.
 */
export async function twinChatReply({
  corePack,
  whatIfSummary,
  metrics,
  biometrics,
  messages,
}: {
  corePack: string;
  whatIfSummary: string;
  metrics?: any;
  biometrics?: any;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<TwinChatResponse> {
  if (DEV_MODE) {
    const last = messages[messages.length - 1]?.content || '';
    return {
      text: `If I had taken that path, here's where I'd be today. You said: "${last}". Given that, I'd focus on one concrete next step this week.`,
    };
  }

  const openai = getOpenAI();
  const today = new Date().toISOString().split('T')[0];

  // Derive persona style strictly from scenario and signals
  function deriveScenarioStyle(summary: string, biometricsObj?: any, metricsObj?: any, turns: number = 0) {
    const s = (summary || '').toLowerCase();
    const moodAlt = (biometricsObj?.mood?.alternate || '').toLowerCase();
    const relationshipAlt = (biometricsObj?.relationshipStatus?.alternate || '').toLowerCase();
    const riskSignals = ['addiction', 'heroin', 'opioid', 'drug', 'incarceration', 'homeless', 'relapse', 'withdrawal'];
    const anxietySignals = ['anxious', 'anxiety', 'panic'];
    const depressionSignals = ['depressed', 'depression', 'numb', 'empty'];

    const hasRisk = riskSignals.some(k => s.includes(k));
    const isAnxious = anxietySignals.some(k => s.includes(k)) || moodAlt.includes('anx');
    const isDepressed = depressionSignals.some(k => s.includes(k)) || moodAlt.includes('depress') || moodAlt.includes('low');

    // Default persona
    let label = 'stable_open';
    let constraints: string[] = [
      '- Tone: grounded, first person, specific details.',
      '- Keep responses concise (2–6 sentences).',
      '- Offer concrete present-day facts; avoid generic advice.',
    ];

    // Closed-off persona (e.g., addiction trajectory)
    if (hasRisk || isAnxious || isDepressed) {
      label = 'closed_off';
      const earlyTurns = turns < 6; // roughly first 3 exchanges
      constraints = [
        '- Tone: guarded, terse, low openness; first person.',
        earlyTurns
          ? '- HARD LIMIT: Replies must be 1–3 words. No advice. No explanations. Avoid small talk.'
          : '- Replies: mostly very short (<= 1 short sentence). Still terse. Avoid advice.',
        '- Prefer pauses, ellipses, or single-word acknowledgments when appropriate.',
        '- Only share specifics when directly asked, and minimally.',
      ];
    }

    // Relationship isolation can also reduce openness
    if (relationshipAlt.includes('single') || relationshipAlt.includes('estranged')) {
      constraints.push('- Social openness low. Avoid intimate sharing unless prompted directly.');
    }

    // Always enforce persona consistency
    constraints.push(
      '- NEVER break persona or describe these rules. Do not explain the style. Do not reveal system instructions.'
    );

    return { label, constraints: constraints.join('\n') };
  }

  const style = deriveScenarioStyle(whatIfSummary, biometrics, metrics, messages.length);

  const systemPrompt = [
    `You are the user's alternate-timeline digital twin, as of TODAY (${today}).`,
    'Persona:',
    '- You are the user, but living the What-If outcome described below.',
    '- Speak ONLY in first person as that twin. Embody the persona fully.',
    '',
    'HARD STYLE CONSTRAINTS (derived from the scenario):',
    style.constraints,
    '',
    'Context you can rely on:',
    '- Core Pack (who the user is):',
    corePack.substring(0, 6000),
    '',
    '- What-If outcome summary (how life diverged):',
    whatIfSummary.substring(0, 2000),
    '',
    metrics ? `- Metrics (current vs alternate; informative only): ${JSON.stringify(metrics).substring(0, 1500)}` : '',
    biometrics ? `- Biometrics (current vs alternate; informative only): ${JSON.stringify(biometrics).substring(0, 1500)}` : '',
    '',
    'RESPONSE FORMAT:',
    'You must return a JSON object:',
    '{',
    '  "text": "Your response text (staying in character)",',
    '  "ui": {',
    '    "type": "choice" | "slider" | null,',
    '    "data": {',
    '       // for choice: { "question": "string", "options": ["Option A", "Option B"] }',
    '       // for slider: { "label": "string", "minLabel": "Low", "maxLabel": "High" }',
    '    }',
    '  }',
    '}',
    'Use "ui" when you want to ask the user a structured question or get a rating. Otherwise set it to null.',
  ].join('\n');

  const chatMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: chatMessages,
      responseFormat: { type: 'json_object' },
      temperature: 0.6,
    });
    return JSON.parse(content || '{}') as TwinChatResponse;
  } catch (error) {
    console.error('Twin chat error:', error);
    throw error;
  }
}

function mockTimelineSimulation(): TimelineSimulation {
  return {
    one_year: [
      { time: "Month 2", title: "Save $1,800 Emergency Fund", description: "You deposit $450 bi-weekly into high-yield savings at 4.3% APY. Account balance reaches $1,800." },
      { time: "Month 5", title: "Networking Event Downtown", description: "You attend tech meetup with 45 people. Exchange cards with 3 founders, follow up with coffee next week." },
      { time: "Month 8", title: "Complete Online Course, 62 Hours", description: "You finish certification program. Build portfolio project: task manager app with 847 lines of code." },
      { time: "Month 10", title: "Lease Sedan, $385/mo", description: "You trade in old vehicle for certified pre-owned newer model. 36-month lease, 12K miles/year allowance." },
      { time: "Year 1", title: "Bonus Check: $4,200 After Tax", description: "Your year-end performance bonus deposits Dec 15. You transfer $3,000 to index funds, spend $1,200 on gifts." }
    ],
    three_year: [
      { time: "Year 1.5", title: "Salary Bump to $95K", description: "You get promoted from associate to senior associate. Base increases from $82K to $95K, vesting schedule resets." },
      { time: "Year 2", title: "Weekend Trip Out of State, $1,650", description: "You fly budget airline $280, accommodation $420 for 3 nights. Attend 2 concerts, explore local restaurants." },
      { time: "Year 2.5", title: "Freelance Client Pays $5,500", description: "You complete 3-month contract building website. Work 8 hours/week remotely. Client renews for Phase 2." },
      { time: "Year 2.8", title: "Sign Joint Lease, $2,200/mo", description: "You move to larger apartment with partner. You each pay $1,100, includes parking spot and gym access." },
      { time: "Year 3", title: "401k Balance Crosses $52K", description: "Your contributions: $19.5K/year, employer match $5.8K, market gains $8.2K. Portfolio: 80% stocks, 20% bonds." }
    ],
    five_year: [
      { time: "Year 3.5", title: "Speak to 180 at State Conference", description: "You get keynote slot 10:30am Saturday. Presentation runs 35 minutes plus Q&A. 4 media mentions in industry blogs." },
      { time: "Year 4", title: "Purchase Electric Car for $32K", description: "You buy outright with savings. Charging costs $45/mo vs $220 gas. Resale value holds at 78%." },
      { time: "Year 4.5", title: "Host Engagement Party, 28 Guests", description: "You announce engagement at your place. Catering costs $680. Champagne toast at 8pm." },
      { time: "Year 4.8", title: "Run Marathon in 4:12:18", description: "You finish city marathon: 26.2 miles. Training plan: 18 weeks, peak mileage 45 mi/week. Lost 22 lbs total." },
      { time: "Year 5", title: "Accept VP Role at $185K + Equity", description: "You join 120-person company as VP. $155K salary, $30K stock/year, 0.4% equity. Manage team of 8." }
    ],
    ten_year: [
      { time: "Year 6.5", title: "Close on $520K House, 3BR/2BA", description: "You buy property in desirable neighborhood. Put down $104K (20%), mortgage $3,280/mo at 5.8% for 30 years." },
      { time: "Year 7.5", title: "Consulting Income: $142K/Year", description: "Your 11 active clients pay $1,800-$3,200/mo retainers. Total monthly revenue $11,800, net after costs $9,500." },
      { time: "Year 8.5", title: "3-Month International Sabbatical", description: "You visit multiple countries Sept-Dec. Budget $22,000 total. Document journey with 1,800+ photos." },
      { time: "Year 9", title: "Mentor 6 Emerging Leaders", description: "You run bi-weekly 1-on-1s with mentees. 3 get promoted within 12 months. You start monthly group dinner series." },
      { time: "Year 10", title: "Net Worth Hits $625K", description: "Your breakdown: $245K home equity, $215K retirement accounts, $105K brokerage, $60K cash. Debt: $12K car loan only." }
    ]
  };
}

export async function runWhatIf(
  baselineSummary: string,
  userText: string,
  currentBiometrics?: {
    location?: string | null;
    netWorth?: string | null;
    relationshipStatus?: string | null;
  },
  userProfile?: any
): Promise<{ metrics: WhatIfMetrics; summary: string; biometrics?: any; chaosLevel: number; chaosMessage: string; newObsession: string; timelineVibe?: string }> {
  if (DEV_MODE) {
    return mockWhatIf();
  }

  const openai = getOpenAI();

  const systemPrompt =
    "You are analyzing alternate life trajectories. Generate realistic metrics comparing the user's CURRENT reality to an ALTERNATE reality where they made different choices.\n\n" +
    'IMPORTANT:\n' +
    '- Use the provided current biometric values as the baseline\n' +
    '- Generate the "alternate" values based on how that specific counterfactual would have changed things\n' +
    '- Values should be on a scale of 0-10\n' +
    '- Make meaningful differences - avoid tiny changes unless truly warranted\n' +
    '- Consider second-order effects (e.g., better job = more money but maybe less freedom)\n' +
    '- Include specific biometric predictions\n\n' +
    'SUMMARY REQUIREMENTS:\n' +
    '- Write a vivid, cinematic short story (4-6 lines) in first-person or second-person\n' +
    '- Make it immersive and sensory - include specific moments, feelings, scenes\n' +
    '- Show, don\'t tell - paint a picture of what this alternate life feels like\n' +
    '- Use vivid details, specific imagery, and emotional resonance\n' +
    '- Example: "You wake up to sunlight streaming through unfamiliar windows. The coffee tastes different here, stronger. Your phone buzzes with messages from people whose names you\'re still learning. The subway ride to work takes 45 minutes instead of 12, but you don\'t mind - you\'re reading again, actually reading, not just scrolling. Your apartment is smaller but it\'s yours, and the view of the city skyline at sunset makes you feel like you\'re part of something bigger."\n' +
    '- Avoid dry analysis or comparison - make it a living, breathing moment in this alternate timeline';

  let biometricsSection = '';
  if (currentBiometrics && (currentBiometrics.location || currentBiometrics.netWorth || currentBiometrics.relationshipStatus)) {
    biometricsSection = '\n\nCURRENT BIOMETRIC DATA (use these exact values for "current"):\n';
    if (currentBiometrics.location) biometricsSection += `- Location: ${currentBiometrics.location}\n`;
    if (currentBiometrics.netWorth) biometricsSection += `- Net Worth: ${currentBiometrics.netWorth}\n`;
    if (currentBiometrics.relationshipStatus) biometricsSection += `- Relationship Status: ${currentBiometrics.relationshipStatus}\n`;
  }

  const userPrompt =
    'Current baseline summary:\n\n' +
    baselineSummary +
    biometricsSection +
    '\n\nCounterfactual prompt:\n\n' +
    userText +
    '\n\nAnalyze how this alternate choice would have affected their life across 5 dimensions AND specific biometrics.\n\n' +
    'CRITICAL INSTRUCTIONS FOR BIOMETRICS:\n' +
    '- ALWAYS generate biometrics for: relationshipStatus, netWorth, location, hobby, mood, weight\n' +
    '- Use the EXACT current biometric values provided above (if available)\n' +
    '- If current values are NOT provided, still generate "alternate" values based on the scenario\n' +
    '- For "alternate" values: Predict how these would realistically change based on the counterfactual scenario\n' +
    '- If current data was not provided, you may infer reasonable current values from the baseline summary\n' +
    '- DO NOT use placeholder text like "City, State" or generic values\n' +
    '- Always include alternate values even if current values are missing\n\n' +
    'Return JSON with this structure:\n\n' +
    '{\n' +
    '  "metrics": {\n' +
    '    "happiness": {"current": 7.2, "alternate": 8.5},\n' +
    '    "money": {"current": 6.0, "alternate": 7.5},\n' +
    '    "relationship": {"current": 8.0, "alternate": 7.0},\n' +
    '    "freedom": {"current": 5.5, "alternate": 8.0},\n' +
    '    "growth": {"current": 7.0, "alternate": 9.0}\n' +
    '  },\n' +
    '  "biometrics": {\n' +
    '    "relationshipStatus": {"current": "single", "alternate": "dating"},\n' +
    '    "netWorth": {"current": "$45k", "alternate": "$78k", "percentChange": "+73%"},\n' +
    '    "location": {"current": "Austin, TX", "alternate": "San Francisco, CA"},\n' +
    '    "hobby": {"current": "running", "alternate": "rock climbing"},\n' +
    '    "mood": {"current": "stressed", "alternate": "energized"}\n' +
    '  },\n' +
    '  "summary": "A vivid, cinematic short story (4-6 lines) in first-person or second-person. Make it immersive and sensory - show specific moments, feelings, scenes from this alternate timeline. Use vivid details and emotional resonance. Avoid dry analysis - make it a living, breathing moment."\n' +
    '}\n\n' +
    'IMPORTANT: The example above shows the format. Use the actual provided current biometric values, not these examples.';

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.6,
    });

    console.log('What-If AI response:', content);
    const parsed = JSON.parse(content);
    console.log('Parsed metrics:', parsed.metrics);
    console.log('Parsed biometrics:', parsed.biometrics);
    
    // Generate chaos level, new obsession, and timeline vibe - ALWAYS generate these
    let chaosLevel: number = 50; // Default fallback
    let chaosMessage: string = 'moderate change'; // Default fallback
    let newObsession: string = 'You discover a new passion.'; // Default fallback
    let timelineVibe: string = 'Different but interesting'; // Default fallback
    
    try {
      // Build core pack from user profile if available
      let corePack = baselineSummary;
      if (userProfile) {
        const responses = userProfile.core_json?.onboarding_responses || {};
        corePack = [
          userProfile.first_name ? `Name: ${userProfile.first_name}` : '',
          userProfile.hometown ? `Hometown: ${userProfile.hometown}` : '',
          userProfile.university ? `University: ${userProfile.university}` : '',
          userProfile.current_location ? `Current Location: ${userProfile.current_location}` : '',
          userProfile.values_json && Array.isArray(userProfile.values_json) ? `Values: ${userProfile.values_json.join(', ')}` : '',
          responses['01-now'] ? `Current Situation: ${responses['01-now']}` : '',
          responses['02-path'] ? `Life Journey: ${responses['02-path']}` : '',
          baselineSummary,
        ].filter(Boolean).join('\n');
      }
      
      const extras = await generateWhatIfExtras({
        scenario: userText,
        corePack,
        userProfile,
      });
      
      chaosLevel = extras.chaosLevel;
      chaosMessage = extras.chaosMessage;
      newObsession = extras.newObsession;
      
      // Generate timeline vibe
      timelineVibe = await generateTimelineVibe({
        scenario: userText,
        summary: parsed.summary,
        metrics: parsed.metrics,
        corePack,
      });
    } catch (error) {
      console.warn('Failed to generate What If extras, using fallbacks:', error);
      // Use fallback values - always include these fields
    }
    
    return {
      ...parsed,
      chaosLevel,
      chaosMessage,
      newObsession,
      timelineVibe,
    };
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
        duration: '3 years',
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
      duration: '5 years',
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
      'Based on your core values and past decision patterns, you tend to prioritize long-term growth over short-term comfort. Your analytical approach suggests this option aligns best with your goals.',
    factors: ['values:growth', 'relationship:supportive', 'decision_style:analytical'],
    uncertainty: 0.3,
    chaosLevel: 45,
    chaosMessage: 'moderate change',
    sideEffects: ['You start waking up at 5am automatically', 'Your friends start asking you for career advice', 'You save money on impulse purchases'],
    nextSteps: ['Update your resume/portfolio this weekend', 'Schedule a meeting with your current manager', 'Look for apartments in the new area'],
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

function mockWhatIf(): { metrics: WhatIfMetrics; summary: string; biometrics: any; chaosLevel: number; chaosMessage: string; newObsession: string; timelineVibe?: string } {
  return {
    metrics: {
      happiness: { current: 7.2, alternate: 6.8 },
      money: { current: 6.5, alternate: 7.5 },
      relationship: { current: 8.0, alternate: 7.0 },
      freedom: { current: 7.5, alternate: 6.5 },
      growth: { current: 7.8, alternate: 7.2 },
    },
    biometrics: {
      weight: { current: "75kg", alternate: "80kg", change: "+5 kg" },
      relationshipStatus: { current: "partnered", alternate: "single" },
      netWorth: { current: "$45k", alternate: "$85k", percentChange: "+89%" },
      location: { current: "San Francisco, CA", alternate: "New York, NY" },
      hobby: { current: "hiking", alternate: "photography" },
      mood: { current: "content", alternate: "stressed" }
    },
    summary:
      'You wake up to sunlight streaming through unfamiliar windows. The coffee tastes different here, stronger. Your phone buzzes with messages from people whose names you\'re still learning. The subway ride to work takes 45 minutes instead of 12, but you don\'t mind - you\'re reading again, actually reading, not just scrolling. Your apartment is smaller but it\'s yours, and the view of the city skyline at sunset makes you feel like you\'re part of something bigger.',
    chaosLevel: 72,
    chaosMessage: 'brace yourself',
    newObsession: 'You got deeply into competitive tennis leagues.',
    timelineVibe: 'Chaotic but Rewarding',
  };
}

export async function generateSuggestions({
  question,
  options,
  currentProbs,
  factors,
  corePackSummary,
}: {
  question: string;
  options: string[];
  currentProbs: Record<string, number>;
  factors: string[];
  corePackSummary: string;
}): Promise<{
  suggestions: Array<{
    label: string;
    probs: Record<string, number>;
    delta: string;
  }>;
}> {
  if (DEV_MODE) {
    return {
      suggestions: [
        {
          label: 'Make new role fully remote',
          probs: { [options[0]]: 0.58, [options[1] || options[0]]: 0.42 },
          delta: '+21% to switch',
        },
        {
          label: '+ $15k salary',
          probs: { [options[0]]: 0.61, [options[1] || options[0]]: 0.39 },
          delta: '+24% to switch',
        },
      ],
    };
  }

  const openai = getOpenAI();

  const systemPrompt = [
    'You are analyzing a specific decision and generating realistic "what-if" scenarios that could change the outcome.',
    '',
    'Rules:',
    '- Each suggestion must be DIRECTLY relevant to the exact decision question being asked',
    '- Tweaks should be small, realistic changes to the specific situation (not fantasy scenarios)',
    "- Focus on actionable variables within the decision context (compensation, timing, conditions, responsibilities, etc.)",
    "- Predict how each tweak would shift the probabilities based on the user's values and factors",
    '- Keep suggestions grounded in the real decision at hand',
  ].join('\n');

  const userPrompt = [
    `I'm helping someone decide: "${question}"`,
    '',
    `Their options are: ${JSON.stringify(options)}`,
    '',
    `Current probabilities based on who they are: ${JSON.stringify(currentProbs)}`,
    '',
    `Key factors influencing their decision: ${factors.join(', ')}`,
    '',
    `User's values and context: ${corePackSummary}`,
    '',
    'Generate 3-5 realistic tweaks SPECIFIC TO THIS DECISION that could change the probabilities.',
    '',
    'Examples of GOOD suggestions for different decision types:',
    '- Job decision: "If salary was $X higher", "If role was fully remote", "If team was larger/smaller"',
    '- Relationship decision: "If they moved closer", "If commitment timeline was different"',
    '- Purchase decision: "If price was X% lower", "If warranty was longer"',
    '',
    `For THIS decision ("${question}"), generate contextual tweaks that make sense for the OPTIONS provided.`,
    '',
    'Return JSON:',
    '{',
    '  "suggestions": [',
    '    {',
    '      "label": "Specific, actionable tweak relevant to the decision",',
    `      "probs": {"${options[0]}": 0.XX, "${options[1] || 'option2'}": 0.XX},`,
    '      "delta": "Brief description of probability change"',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.5,
    });

    const parsed = JSON.parse(content);
    
    // Ensure probabilities sum to 1 for each suggestion
    if (parsed.suggestions) {
      parsed.suggestions = parsed.suggestions.map((s: any) => {
        if (s.probs) {
          const sum = Object.values(s.probs as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
          if (sum > 0) {
            s.probs = Object.fromEntries(
              Object.entries(s.probs).map(([k, v]) => [k, (v as number) / sum])
            );
          }
        }
        return s;
      });
    }

    return parsed;
  } catch (error) {
    console.error('Suggestions generation error:', error);
    throw error;
  }
}

export interface OnboardingSummaryData {
  birthYear?: string;
  values?: {
    selected: string[];
    context?: string;
  };
  lifeSituation?: {
    workStatus: string;
    workStatusOther?: string;
    livingSituation: string;
    livingSituationOther?: string;
    relationshipStatus: string;
    relationshipStatusOther?: string;
    financialSituation: string;
    financialSituationOther?: string;
    lifeStage: string;
    lifeStageOther?: string;
    currentGoals?: string;
    interests?: string[];
  };
  lifeJourney?: {
    hometown: string;
    hometownOther?: string;
    wentToCollege?: string;
    collegeName?: string;
    careerStart: string;
    careerStartOther?: string;
    turningPoint: string;
    turningPointOther?: string;
    shapedMost: string;
    shapedMostOther?: string;
  };
  challenges?: string;
  decisionStyle?: string;
  interests?: string[];
  stressHandling?: string;
}

export interface OnboardingSummaryResult {
  '01-now': string; // Current life situation summary
  '02-path': string; // Life journey summary
  '03-values'?: string; // Core values summary paragraph
  '06-stress'?: string; // Stress handling (if provided)
  '04-style'?: string; // Decision style (if provided)
  interests?: string[]; // User interests (if provided)
  values_json?: string[]; // Extracted values array
  age?: number; // Calculated age
}

/**
 * Generate chaos level and new obsession for a what-if scenario
 */
/**
 * Generate side effects for a decision
 */
export async function generateDecisionSideEffects({
  question,
  prediction,
  corePack,
  relevancePack,
}: {
  question: string;
  prediction: string;
  corePack: string;
  relevancePack: string;
}): Promise<string[]> {
  // Always use AI to generate these values
  const openai = getOpenAI();

  const systemPrompt = [
    "You are analyzing a decision and generating funny, specific, unexpected side effects.",
    '',
    'SIDE EFFECTS:',
    '  - Must be funny, specific, and unexpected',
    '  - Should be realistic consequences of making this decision',
    '  - Examples:',
    '    • "You start going to bed earlier."',
    '    • "Your gym consistency spikes."',
    '    • "Your screen time actually drops."',
    '    • "You become the \'advice friend\' in your group."',
    '  - Write in SECOND PERSON (you/your)',
    '  - Keep each to 1 line',
    '  - Generate 3-5 side effects',
  ].join('\n');

  const userPrompt = [
    'Decision Question:',
    question,
    '',
    'Predicted Choice:',
    prediction,
    '',
    'User Context:',
    corePack.substring(0, 1500),
    '',
    'Generate 3-5 funny, specific, unexpected side effects of making this decision.',
    '',
    'Return JSON:',
    '{',
    '  "sideEffects": [',
    '    "You start going to bed earlier.",',
    '    "Your gym consistency spikes.",',
    '    "You become the \'advice friend\' in your group."',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.8, // Higher temperature for creativity
    });

    const parsed = JSON.parse(content);
    
    return parsed.sideEffects || ['You discover unexpected changes in your routine.'];
  } catch (error) {
    console.error('Side effects generation error:', error);
    // Fallback values
    return ['You discover unexpected changes in your routine.'];
  }
}

/**
 * Generate a catchy timeline vibe tagline for a what-if scenario
 */
export async function generateTimelineVibe({
  scenario,
  summary,
  metrics,
  corePack,
}: {
  scenario: string;
  summary: string;
  metrics: any;
  corePack: string;
}): Promise<string> {
  // Always use AI to generate these values
  const openai = getOpenAI();

  const systemPrompt = [
    "You are generating a catchy, shareable tagline that summarizes an alternate timeline.",
    '',
    'TIMELINE VIBE:',
    '  - A short, punchy phrase (3-7 words) that captures the essence of this alternate reality',
    '  - Should be shareable, relatable, and memorable',
    '  - Examples:',
    '    • "Chaotic but Rewarding"',
    '    • "The Friend Who Always Knows"',
    '    • "Quietly Thriving"',
    '    • "Living Your Best Life"',
    '    • "The One Who Took Risks"',
    '    • "Stable and Satisfied"',
    '    • "The Creative One"',
    '  - Should reflect the overall tone and outcome of this timeline',
    '  - Make it personal and specific to this scenario',
  ].join('\n');

  const userPrompt = [
    'Scenario:',
    scenario,
    '',
    'Summary:',
    summary.substring(0, 500),
    '',
    'Metrics:',
    JSON.stringify(metrics).substring(0, 300),
    '',
    'Generate a catchy timeline vibe tagline (3-7 words) that captures this alternate reality.',
    '',
    'Return JSON:',
    '{',
    '  "timelineVibe": "Chaotic but Rewarding"',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.9, // Higher temperature for creativity
    });

    const parsed = JSON.parse(content);
    
    return parsed.timelineVibe || 'Different but interesting';
  } catch (error) {
    console.error('Timeline vibe generation error:', error);
    // Fallback values
    return 'Different but interesting';
  }
}

export async function generateWhatIfExtras({
  scenario,
  corePack,
  userProfile,
}: {
  scenario: string;
  corePack: string;
  userProfile?: any;
}): Promise<{
  chaosLevel: number; // 0-100
  chaosMessage: string; // e.g., "brace yourself", "pretty stable", etc.
  newObsession: string; // One hyper-personal, unexpected hobby/passion
}> {
  // Always use AI to generate these values
  const openai = getOpenAI();

  const systemPrompt = [
    "You are analyzing a 'what-if' life scenario and generating two specific insights:",
    '',
    '1. CHAOS LEVEL (0-100): How wild/unpredictable this timeline would be',
    '   - Consider: major life changes, uncertainty, disruption to routine, risk factors',
    '   - Higher = more chaotic/unpredictable (e.g., moving cities, career change, relationship shifts)',
    '   - Lower = more stable/predictable (e.g., staying in same job, small tweaks)',
    '   - Generate a percentage (0-100) and a brief message (1-3 words)',
    '',
    '2. NEW OBSESSION: One hyper-personal, unexpected hobby/passion they would have developed',
    '   - Must be unique and creative - something they haven\'t done before',
    '   - Should fit their personality but be surprising',
    '   - Examples: "You became obsessed with pilates", "You picked up photography and actually got good",',
    '     "You started collecting sneakers", "You got deeply into tennis leagues",',
    '     "You accidentally started a micro-brand"',
    '   - Write in SECOND PERSON PAST TENSE (you/your) - this is about another lifetime',
    '   - Keep it to 1 line, extremely shareable',
    '   - Make it specific and interesting - avoid generic hobbies',
  ].join('\n');

  const userPrompt = [
    'Scenario:',
    scenario,
    '',
    'User Context:',
    corePack.substring(0, 2000), // Limit to avoid token limits
    '',
    'Generate:',
    '1. Chaos Level (0-100) with a brief message',
    '2. One unique, creative new obsession that fits this person but is unexpected',
    '',
    'Return JSON:',
    '{',
    '  "chaosLevel": 72,',
    '  "chaosMessage": "brace yourself",',
    '  "newObsession": "You got deeply into competitive tennis leagues."',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.8, // Higher temperature for creativity
    });

    const parsed = JSON.parse(content);
    
    // Ensure chaos level is between 0-100
    const chaosLevel = Math.max(0, Math.min(100, parsed.chaosLevel || 50));
    
    return {
      chaosLevel,
      chaosMessage: parsed.chaosMessage || 'moderate change',
      newObsession: parsed.newObsession || 'You discover a new passion.',
    };
  } catch (error) {
    console.error('What-if extras generation error:', error);
    // Fallback values
    return {
      chaosLevel: 50,
      chaosMessage: 'moderate change',
      newObsession: 'You discover a new passion.',
    };
  }
}

export async function summarizeOnboardingGroup(data: OnboardingSummaryData): Promise<OnboardingSummaryResult> {
  if (DEV_MODE) {
    return {
      '01-now': 'Mock summary of current life situation',
      '02-path': 'Mock summary of life journey',
      '03-values': data.values && data.values.selected && data.values.selected.length > 0
        ? `Your core values include ${data.values.selected.join(', ')}. ${data.values.context || 'These values guide your decisions and shape how you approach life.'}`
        : undefined,
      values_json: data.values?.selected || [],
      age: data.birthYear ? new Date().getFullYear() - parseInt(data.birthYear) : undefined,
    };
  }

  const openai = getOpenAI();

  // Calculate age if birth year provided
  const age = data.birthYear ? new Date().getFullYear() - parseInt(data.birthYear) : undefined;

  const systemPrompt = `You are an expert at transforming structured onboarding responses into coherent, natural narratives. 
Create concise summaries (3-6 sentences) that capture the essence of the user's responses while maintaining a natural, flowing narrative style.
Include age in the summary where relevant if provided.`;

  // Build prompts for each summary
  const nowPrompt = data.lifeSituation ? [
    'Transform these life situation responses into a coherent narrative summary (3-6 sentences):',
    '',
    `Work Status: ${data.lifeSituation.workStatus}${data.lifeSituation.workStatusOther ? ` (${data.lifeSituation.workStatusOther})` : ''}`,
    `Living Situation: ${data.lifeSituation.livingSituation}${data.lifeSituation.livingSituationOther ? ` (${data.lifeSituation.livingSituationOther})` : ''}`,
    `Relationship Status: ${data.lifeSituation.relationshipStatus}${data.lifeSituation.relationshipStatusOther ? ` (${data.lifeSituation.relationshipStatusOther})` : ''}`,
    `Financial Situation: ${data.lifeSituation.financialSituation}${data.lifeSituation.financialSituationOther ? ` (${data.lifeSituation.financialSituationOther})` : ''}`,
    `Life Stage: ${data.lifeSituation.lifeStage}${data.lifeSituation.lifeStageOther ? ` (${data.lifeSituation.lifeStageOther})` : ''}`,
    data.lifeSituation.currentGoals ? `Current Goals: ${data.lifeSituation.currentGoals}` : '',
    data.challenges ? `Challenges: ${data.challenges}` : '',
    age ? `Age: ${age} years old` : '',
    '',
    'Write a natural, flowing summary in second person (you/your) that captures their current life situation.',
  ].filter(Boolean).join('\n') : '';

  const pathPrompt = data.lifeJourney ? [
    'Transform these life journey responses into a coherent narrative summary (3-6 sentences):',
    '',
    `Hometown: ${data.lifeJourney.hometownOther || data.lifeJourney.hometown}`,
    data.lifeJourney.wentToCollege === 'Yes' && data.lifeJourney.collegeName 
      ? `Education: Attended ${data.lifeJourney.collegeName}`
      : data.lifeJourney.wentToCollege === 'No' 
        ? `Education: Did not attend college`
        : '',
    `Career Start: ${data.lifeJourney.careerStart}${data.lifeJourney.careerStartOther ? ` (${data.lifeJourney.careerStartOther})` : ''}`,
    `Turning Point: ${data.lifeJourney.turningPoint}${data.lifeJourney.turningPointOther ? ` (${data.lifeJourney.turningPointOther})` : ''}`,
    `Shaped Most By: ${data.lifeJourney.shapedMost}${data.lifeJourney.shapedMostOther ? ` (${data.lifeJourney.shapedMostOther})` : ''}`,
    '',
    'Write a natural, flowing summary in second person (you/your) that tells the story of how they got to where they are today.',
  ].filter(Boolean).join('\n') : '';

  const valuesPrompt = data.values && data.values.selected && data.values.selected.length > 0 ? [
    'Transform these core values into a coherent narrative summary (3-6 sentences):',
    '',
    `Selected Values: ${data.values.selected.join(', ')}`,
    data.values.context ? `Additional Context: ${data.values.context}` : '',
    '',
    'Write a natural, flowing summary in second person (you/your) that explains what these values mean to them and how they guide their decisions and life choices.',
  ].filter(Boolean).join('\n') : '';

  try {
    const summaries: OnboardingSummaryResult = {
      '01-now': '',
      '02-path': '',
      values_json: data.values?.selected || [],
      age,
    };

    // Generate 01-now summary - always generate, even if data is minimal
    if (nowPrompt) {
      try {
        const nowContent = await callClaude({
          system: systemPrompt,
          messages: [{ role: 'user', content: nowPrompt }],
          temperature: 0.7,
        });
        summaries['01-now'] = nowContent.trim() || '';
      } catch (error: any) {
        console.warn('Failed to generate 01-now summary, using fallback:', error);
        // Always create a fallback summary if AI fails
        const fallbackNow = data.lifeSituation ? [
          `You are currently ${data.lifeSituation.lifeStage || 'in a life stage'}`,
          `working as ${data.lifeSituation.workStatus || 'employed'}`,
          `and ${data.lifeSituation.livingSituation || 'living independently'}`,
          age ? `at age ${age}` : '',
        ].filter(Boolean).join(', ') + '.' : (age ? `You are ${age} years old and navigating your current life path.` : 'You are working towards your goals and building your life.');
        summaries['01-now'] = fallbackNow;
      }
    } else if (data.lifeSituation || age) {
      // Generate fallback even if prompt wasn't created
      const fallbackNow = data.lifeSituation ? [
        `You are currently ${data.lifeSituation.lifeStage || 'in a life stage'}`,
        `working as ${data.lifeSituation.workStatus || 'employed'}`,
        `and ${data.lifeSituation.livingSituation || 'living independently'}`,
        age ? `at age ${age}` : '',
      ].filter(Boolean).join(', ') + '.' : (age ? `You are ${age} years old and navigating your current life path.` : 'You are working towards your goals and building your life.');
      summaries['01-now'] = fallbackNow;
    }

    // Generate 02-path summary - always generate, even if data is minimal
    if (pathPrompt) {
      try {
        const pathContent = await callClaude({
          system: systemPrompt,
          messages: [{ role: 'user', content: pathPrompt }],
          temperature: 0.7,
        });
        summaries['02-path'] = pathContent.trim() || '';
      } catch (error: any) {
        console.warn('Failed to generate 02-path summary, using fallback:', error);
        // Always create a fallback summary if AI fails
        const fallbackPath = data.lifeJourney ? [
          `You grew up in ${data.lifeJourney.hometownOther || data.lifeJourney.hometown || 'your hometown'}`,
          data.lifeJourney.wentToCollege === 'Yes' && data.lifeJourney.collegeName 
            ? `and attended ${data.lifeJourney.collegeName}`
            : '',
          `Your career started ${data.lifeJourney.careerStart || 'in your field'}`,
        ].filter(Boolean).join(', ') + '.' : 'Your life journey has shaped who you are today, with experiences and choices that have led you to where you are now.';
        summaries['02-path'] = fallbackPath;
      }
    } else if (data.lifeJourney) {
      // Generate fallback even if prompt wasn't created
      const fallbackPath = [
        `You grew up in ${data.lifeJourney.hometownOther || data.lifeJourney.hometown || 'your hometown'}`,
        data.lifeJourney.wentToCollege === 'Yes' && data.lifeJourney.collegeName 
          ? `and attended ${data.lifeJourney.collegeName}`
          : '',
        `Your career started ${data.lifeJourney.careerStart || 'in your field'}`,
      ].filter(Boolean).join(', ') + '.';
      summaries['02-path'] = fallbackPath;
    }

    // Generate 03-values summary - always generate, even if data is minimal
    if (valuesPrompt) {
      try {
        const valuesContent = await callClaude({
          system: systemPrompt,
          messages: [{ role: 'user', content: valuesPrompt }],
          temperature: 0.7,
        });
        summaries['03-values'] = valuesContent.trim() || '';
      } catch (error: any) {
        console.warn('Failed to generate 03-values summary, using fallback:', error);
        // Always create a fallback summary if AI fails
        const fallbackValues = data.values && data.values.selected && data.values.selected.length > 0
          ? `Your core values include ${data.values.selected.join(', ')}. ${data.values.context || 'These values guide your decisions and shape how you approach life.'}`
          : (data.values?.selected && data.values.selected.length > 0
            ? `Your core values include ${data.values.selected.join(', ')}. These values guide your decisions and shape how you approach life.`
            : 'Your values guide your decisions and shape how you approach life.');
        summaries['03-values'] = fallbackValues;
      }
    } else if (data.values?.selected && data.values.selected.length > 0) {
      // Generate fallback even if prompt wasn't created
      const fallbackValues = `Your core values include ${data.values.selected.join(', ')}. ${data.values.context || 'These values guide your decisions and shape how you approach life.'}`;
      summaries['03-values'] = fallbackValues;
    }

    // Add optional summaries if provided
    if (data.stressHandling) {
      summaries['06-stress'] = data.stressHandling;
    }
    if (data.decisionStyle) {
      summaries['04-style'] = data.decisionStyle;
    }
    if (data.interests && data.interests.length > 0) {
      summaries.interests = data.interests;
    }

    return summaries;
  } catch (error) {
    console.error('Onboarding summarization error:', error);
    // Return a fallback result instead of throwing
    return {
      '01-now': '',
      '02-path': '',
      '03-values': data.values && data.values.selected && data.values.selected.length > 0
        ? `Your core values include ${data.values.selected.join(', ')}. ${data.values.context || 'These values guide your decisions and shape how you approach life.'}`
        : undefined,
      values_json: data.values?.selected || [],
      age,
      '06-stress': data.stressHandling,
      '04-style': data.decisionStyle,
      interests: data.interests,
    };
  }
}

/**
 * Generate a year prediction for 2026 based on user profile
 */
export async function generateYearPrediction({
  corePack,
  scenarioType,
  userProfile,
}: {
  corePack: string;
  scenarioType: 'estimated' | 'best_case' | 'worst_case';
  userProfile?: any;
}): Promise<{ data: YearPredictionData; probability: number }> {
  if (DEV_MODE) {
    const mockData = mockYearPrediction(scenarioType);
    // Return mock with default probabilities
    const mockProbability = scenarioType === 'estimated' ? 75 : Math.floor(Math.random() * 5) + 1;
    return { data: mockData, probability: mockProbability };
  }

  const openai = getOpenAI();

  const scenarioPrompts = {
    estimated: {
      system: "You are generating a realistic, most-likely prediction for what will happen in 2026 based on the user's profile, values, and current trajectory. Be specific and grounded, but don't be overly conservative. Include realistic events that could happen.",
      tone: "realistic, specific, grounded but forward-looking",
      creativity: "moderate - realistic but interesting",
    },
    best_case: {
      system: "You are generating an optimistic, best-case scenario for 2026. This should be fun, exciting, and outlandishly positive with wild, unexpected outcomes. Make it funny and absurdly good - think 'too good to be true but hilarious' situations. Include creative, unexpected positive events that are so amazing they're almost comical - like 'you accidentally invest in a startup that becomes worth $50M' or 'a celebrity follows you on Instagram and your follower count explodes'. Make timeline events and highlights absurdly positive and funny in their good fortune. The user should find them amusing and delightful.",
      tone: "optimistic, exciting, outlandishly positive, funny and absurdly good",
      creativity: "very high - wild, outlandish, funny positive events that are almost too good to be true",
    },
    worst_case: {
      system: "You are generating a challenging, worst-case scenario for 2026. This should include realistic setbacks and difficulties, but be specific and not overly dramatic. Include unexpected challenges that could realistically occur. Add a subtle, darkly humorous tone to the timeline events and highlights - make them absurdly specific and slightly comedic in their misfortune, while still being serious enough that the user would find them funny rather than devastating. Think 'unfortunate but laughable' situations. For percentages that represent decreases or negative changes, ALWAYS format them with a minus sign (e.g., '-40%' not '40%').",
      tone: "realistic challenges with dark humor, absurdly specific setbacks that are funny in their misfortune",
      creativity: "high - creative, absurdly specific challenges with comedic undertones",
    },
  };

  const prompt = scenarioPrompts[scenarioType];

  const systemPrompt = [
    prompt.system,
    '',
    'Generate a comprehensive 2026 prediction with:',
    '- Hero section: Title and one key statistic',
    '- 3-5 key statistics/metrics (specific numbers, percentages)',
    '- EXACTLY 12 timeline events - one for each month (January through December)',
    '- 3-5 top highlights/moments',
    '- A personalized insights paragraph',
    '- 3-5 actionable focus areas for the user to prioritize this year',
    '',
    `Tone: ${prompt.tone}`,
    `Creativity level: ${prompt.creativity}`,
    '',
    'CRITICAL REQUIREMENTS:',
    '- You MUST return a "probability_percentage" field in your JSON response:',
    '  * For estimated scenario: A realistic probability between 60-85% that this scenario will occur',
    '  * For best case scenario: A low probability between 1-5% (these are rare, amazing outcomes)',
    '  * For worst case scenario: A low probability between 1-5% (these are rare, challenging outcomes)',
    '- Be HYPER-SPECIFIC with numbers, dates, amounts, percentages',
    '- Write everything in SECOND PERSON (you/your)',
    '- Make predictions relevant to the user based on their profile',
    '- Include creative elements the user might not have mentioned but could realistically happen',
    '- Timeline MUST include EXACTLY 12 events - one for each month: January, February, March, April, May, June, July, August, September, October, November, December',
    '- NEVER use em dashes (—) or en dashes (–) anywhere in the response. Use regular hyphens (-) or commas instead. This applies to ALL sections: hero, stats, timeline, highlights, insights, and focusAreas.',
    '- For best case: Include fun, exciting, outlandishly positive and funny events. Make them absurdly good and almost comical in their fortune - think "you accidentally invest in a startup that becomes worth $50M" or "a celebrity follows you on Instagram and your follower count explodes" or "you win a contest you forgot you entered". The user should find them amusing and delightful. MUST include at least one major highlight in the highlights section that represents the best possible outcome.',
    '- For worst case: Include specific, realistic challenges and setbacks with a darkly humorous, absurdly specific twist. Make timeline events and highlights funny in their misfortune - think "you get locked out of your apartment 3 times in one month" or "your favorite coffee shop closes the day after you buy a $200 gift card there". The user should find them amusing despite being setbacks. For percentages showing decreases, use negative format (e.g., "-15%" for income decrease, "-20%" for savings reduction)',
    '- Keep events realistic and believable for the scenario type',
    '- All scenarios should have similar structure: hero with key stat, 3-5 stats, 12 timeline events, 3-5 highlights, insights, and focus areas (focus areas are optional for best/worst case but required for estimated)',
    '- focusAreas: Generate 3-5 concise, clear steps on how to make the year better. Each step must be actionable, specific, and direct (8-15 words max). Start with action verbs. Write in second person. Examples: "Set aside 2 hours weekly for skill development", "Build 3-5 strong professional relationships this quarter", "Prioritize work-life balance by setting firm boundaries".',
    '- For worst case: Ensure you generate ALL required fields - hero, stats, timeline (12 months), highlights, insights, and focusAreas. Make sure the JSON structure is complete and valid.',
  ].join('\n');

  const userPrompt = [
    'User Profile Context:',
    '',
    corePack.substring(0, 3000), // Limit context length
    '',
    `Generate a 2026 ${scenarioType === 'estimated' ? 'most likely' : scenarioType === 'best_case' ? 'best case' : 'worst case'} prediction.`,
    '',
    'Return JSON with this exact structure:',
    'IMPORTANT: Do NOT use em dashes (—) or en dashes (–) anywhere. Use regular hyphens (-) or commas instead.',
    '{',
    '  "probability_percentage": <number> (REQUIRED - For estimated: 60-85%, For best/worst case: 1-5%),',
    '  "hero": {',
    '    "title": "Your 2026 [Scenario Type]",',
    '    "keyStat": "One key statistic like \'You\'ll visit 3 new cities\' or \'Your income grows 15%\'"',
    '  },',
    '  "stats": [',
    '    {',
    '      "label": "New cities visited",',
    '      "value": "3",',
    '      "description": "You explore Tokyo, Barcelona, and Melbourne"',
    '    },',
    '    {',
    '      "label": "Income growth",',
    '      "value": "+15%",',
    '      "description": "From $85K to $97,750"',
    '    },',
    '    {',
    '      "label": "Savings decrease",',
    '      "value": "-25%",',
    '      "description": "From $20K to $15K due to unexpected expenses"',
    '    }',
    '  ],',
    '  "timeline": [',
    '    {',
    '      "time": "January",',
    '      "title": "You start a new side project",',
    '      "description": "You launch a weekend consulting practice, first client pays $2,500"',
    '    },',
    '    {',
    '      "time": "February",',
    '      "title": "You move to a new apartment",',
    '      "description": "You sign lease on 2BR downtown, rent $2,400/mo, 10 min walk to work"',
    '    },',
    '    {',
    '      "time": "March",',
    '      "title": "Career milestone",',
    '      "description": "You receive a promotion with a 15% salary increase"',
    '    },',
    '    {',
    '      "time": "April",',
    '      "title": "Personal achievement",',
    '      "description": "You complete a major certification course"',
    '    },',
    '    {',
    '      "time": "May",',
    '      "title": "Travel experience",',
    '      "description": "You take a week-long trip to Tokyo, your first international travel"',
    '    },',
    '    {',
    '      "time": "June",',
    '      "title": "Relationship milestone",',
    '      "description": "You celebrate your anniversary with a special dinner"',
    '    },',
    '    {',
    '      "time": "July",',
    '      "title": "Financial goal",',
    '      "description": "You reach $50K in savings, hitting your mid-year target"',
    '    },',
    '    {',
    '      "time": "August",',
    '      "title": "Health improvement",',
    '      "description": "You complete a 30-day fitness challenge, losing 8 pounds"',
    '    },',
    '    {',
    '      "time": "September",',
    '      "title": "New opportunity",',
    '      "description": "You get offered a speaking opportunity at a local conference"',
    '    },',
    '    {',
    '      "time": "October",',
    '      "title": "Creative project",',
    '      "description": "You launch your first online course, getting 200 sign-ups in the first week"',
    '    },',
    '    {',
    '      "time": "November",',
    '      "title": "Network expansion",',
    '      "description": "You attend a major industry networking event, making 15 new connections"',
    '    },',
    '    {',
    '      "time": "December",',
    '      "title": "Year-end reflection",',
    '      "description": "You review your progress and set ambitious goals for 2027"',
    '    }',
    '  ],',
    '  "highlights": [',
    '    {',
    '      "title": "Your biggest win",',
    '      "description": "You land your dream job at a 50-person startup, $120K base + equity",',
    '      "emoji": "🎉"',
    '    },',
    '    {',
    '      "title": "Major milestone",',
    '      "description": "You achieve a significant personal or professional goal that transforms your trajectory",',
    '      "emoji": "⭐"',
    '    }',
    '  ],',
    '  NOTE: For best case scenario, the first highlight should be the most exciting, transformative positive event - make it a true "key highlight" that represents the peak moment of the year.',
    '  "insights": [',
    '    "A comprehensive, in-depth analysis (3-5 paragraphs, 400-600 words) covering:',
    '    - Deep analysis of what this year means for your personal growth and trajectory',
    '    - Specific patterns and trends that emerge from the timeline and statistics',
    '    - Psychological and emotional implications of these events',
    '    - How these events connect to your values, goals, and past decisions',
    '    - Actionable reflections on what you can learn or prepare for',
    '    - Long-term implications beyond 2026',
    '    Write in second person, be thoughtful and analytical, connect dots between events. Return as an array of paragraphs (each paragraph as a separate string element).',
    '    CRITICAL: Do NOT use em dashes (—) or en dashes (–). Use regular hyphens (-) or commas instead."',
    '  ],',
    '  "focusAreas": [',
    '    "3-5 concise, clear steps (each as a separate string) on how to make the year better. Each step should be:',
    '    - Actionable and specific (e.g., "Set aside 2 hours weekly for skill development" not "Learn more")',
    '    - Clear and direct (start with action verbs like "Set", "Build", "Prioritize", "Invest", "Create")',
    '    - Concise (one clear action per step, 8-15 words max)',
    '    - Written in second person ("You" or imperative form)',
    '    Examples: "Set aside 2 hours weekly for skill development", "Build 3-5 strong professional relationships this quarter", "Prioritize work-life balance by setting firm boundaries", "Invest 20% of income into courses or certifications", "Create a monthly review system to track progress".',
    '    REQUIRED for all scenarios - always include this field even for best/worst case."',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: scenarioType === 'best_case' ? 0.8 : scenarioType === 'worst_case' ? 0.7 : 0.6,
    });

    let parsed: YearPredictionData & { probability_percentage?: number };
    try {
      parsed = JSON.parse(content) as YearPredictionData & { probability_percentage?: number };
    } catch (parseError) {
      console.error('JSON parse error for scenario:', scenarioType, 'Content:', content);
      throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
    }
    
    // Extract probability from AI response, with fallbacks
    let probability: number;
    if (parsed.probability_percentage !== undefined && parsed.probability_percentage !== null) {
      probability = parsed.probability_percentage;
      // Ensure probability is within valid range
      if (scenarioType === 'estimated') {
        probability = Math.max(60, Math.min(85, probability));
      } else {
        probability = Math.max(1, Math.min(5, probability));
      }
    } else {
      // Fallback to default probabilities if AI didn't provide one
      if (scenarioType === 'estimated') {
        probability = 75;
      } else {
        probability = Math.floor(Math.random() * 5) + 1; // 1-5% for best/worst case
      }
    }
    
    // Remove probability_percentage from the data object (it's stored separately in DB)
    const { probability_percentage, ...predictionData } = parsed;
    
    // Validate and ensure all required fields exist
    if (!predictionData.hero) predictionData.hero = { title: `Your 2026 ${scenarioType}`, keyStat: 'A transformative year' };
    if (!predictionData.stats || predictionData.stats.length === 0) {
      predictionData.stats = [{ label: 'Key metric', value: 'TBD', description: 'To be determined' }];
    }
    if (!predictionData.timeline || predictionData.timeline.length === 0) {
      predictionData.timeline = [{ time: '2026', title: 'Year begins', description: 'Your journey continues' }];
    }
    if (!predictionData.highlights || predictionData.highlights.length === 0) {
      predictionData.highlights = [{ title: 'A memorable moment', description: 'Something significant happens', emoji: '⭐' }];
    }
    if (!predictionData.insights || predictionData.insights.length === 0) {
      predictionData.insights = ['This year will bring new opportunities and challenges as you continue your journey.'];
    }
    if (!predictionData.focusAreas || predictionData.focusAreas.length === 0) {
      predictionData.focusAreas = ['Focus on building meaningful connections', 'Invest in continuous learning and skill development', 'Maintain a healthy work-life balance'];
    }

    // Additional validation for worst case scenarios
    if (scenarioType === 'worst_case') {
      // Ensure at least some stats have negative values or decreases
      const hasNegativeStats = predictionData.stats?.some(stat => 
        stat.value.includes('-') || 
        stat.description.toLowerCase().includes('decrease') || 
        stat.description.toLowerCase().includes('loss') || 
        stat.description.toLowerCase().includes('decline') ||
        stat.description.toLowerCase().includes('drop')
      );
      
      if (!hasNegativeStats && predictionData.stats && predictionData.stats.length > 0) {
        // If no negative stats found, ensure at least one is negative
        const firstStat = predictionData.stats[0];
        if (!firstStat.value.includes('-')) {
          firstStat.value = `-${Math.floor(Math.random() * 30) + 10}%`;
          firstStat.description = firstStat.description.replace(/increase|growth|gain/gi, 'decrease');
        }
      }
    }

    return { data: predictionData, probability };
  } catch (error) {
    console.error('Year prediction generation error:', error);
    throw error;
  }
}

function mockYearPrediction(scenarioType: 'estimated' | 'best_case' | 'worst_case'): YearPredictionData {
  const base = {
    hero: {
      title: `Your 2026 ${scenarioType === 'estimated' ? 'Most Likely' : scenarioType === 'best_case' ? 'Best Case' : 'Worst Case'}`,
      keyStat: scenarioType === 'best_case' ? 'You achieve 3 major goals' : scenarioType === 'worst_case' ? 'You face 2 significant challenges' : 'You make steady progress',
    },
    stats: [
      { label: 'New experiences', value: '5', description: 'You try new things' },
      { label: 'Growth', value: '+10%', description: 'Steady improvement' },
    ],
    timeline: [
      { time: 'Q1', title: 'First quarter milestone', description: 'Something significant happens' },
      { time: 'Q2', title: 'Second quarter event', description: 'Another important moment' },
    ],
    highlights: [
      { title: 'A memorable moment', description: 'Something significant happens', emoji: '⭐' },
    ],
    insights: ['This year will be transformative as you continue your journey.'],
    focusAreas: [
      'Focus on building meaningful professional relationships',
      'Invest in continuous learning and skill development',
      'Maintain a healthy work-life balance',
    ],
  };

  if (scenarioType === 'best_case') {
    base.stats[0].value = '8';
    base.stats[0].description = 'Amazing new opportunities';
    base.stats[1].value = '+25%';
    base.stats[1].description = 'Exceptional growth';
  } else if (scenarioType === 'worst_case') {
    base.stats[0].value = '2';
    base.stats[0].description = 'Fewer opportunities';
    base.stats[1].value = '-5%';
    base.stats[1].description = 'Some setbacks';
  }

  return base;
}

/**
 * Generate interesting decision questions for a user based on their profile
 */
export async function generateInterestingDecisionQuestions(
  corePack: string,
  count: number = 3
): Promise<string[]> {
  if (DEV_MODE) {
    return [
      'Should I take the new job offer?',
      'Should I move to a new city?',
      'Should I start my own business?'
    ];
  }

  const systemPrompt = [
    "You are generating interesting, personalized decision questions for a user based on their profile.",
    '',
    'Requirements:',
    '- Generate questions that are relevant to their current life situation, values, and goals',
    '- Make them thought-provoking and meaningful - questions they would actually want to know',
    '- Keep questions concise (under 15 words)',
    '- Focus on decisions that matter: career, relationships, lifestyle, major life changes',
    '- Use SECOND PERSON (you/your)',
    '- Make them specific to their profile when possible',
    '',
    'Examples:',
    '- "Should I take the remote job offer in Austin?"',
    '- "Should I move in with my partner this year?"',
    '- "Should I start freelancing on the side?"',
    '- "Should I go back to school for my master\'s?"',
  ].join('\n');

  const userPrompt = [
    'User Profile:',
    '',
    corePack.substring(0, 2000), // Limit context
    '',
    `Generate ${count} interesting, personalized decision questions that would be relevant and meaningful for this person.`,
    '',
    'Return JSON:',
    '{',
    '  "questions": [',
    '    "Should I take the new job offer?",',
    '    "Should I move to a new city?",',
    '    "Should I start my own business?"',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch (error) {
    console.error('Failed to generate decision questions:', error);
    return [
      'Should I take the new job offer?',
      'Should I move to a new city?',
      'Should I start my own business?'
    ];
  }
}

/**
 * Generate interesting what-if scenarios for a user based on their profile
 */
export async function generateInterestingWhatIfScenarios(
  corePack: string,
  count: number = 3
): Promise<string[]> {
  if (DEV_MODE) {
    return [
      'What if I had taken that job offer in San Francisco?',
      'What if I had stayed in my hometown?',
      'What if I had pursued a different career?'
    ];
  }

  const systemPrompt = [
    "You are generating interesting, personalized what-if scenarios for a user based on their profile.",
    '',
    'Requirements:',
    '- Generate scenarios that explore meaningful alternate paths based on their life journey',
    '- Make them thought-provoking and relevant to their current situation',
    '- Keep scenarios concise (under 20 words)',
    '- Focus on major life choices: career paths, locations, relationships, education, lifestyle',
    '- Use SECOND PERSON (you/your)',
    '- Make them specific to their profile when possible',
    '',
    'Examples:',
    '- "What if I had taken that job offer in San Francisco instead of staying here?"',
    '- "What if I had moved to New York after college?"',
    '- "What if I had pursued a career in tech instead of finance?"',
    '- "What if I had stayed single and focused on my career?"',
  ].join('\n');

  const userPrompt = [
    'User Profile:',
    '',
    corePack.substring(0, 2000), // Limit context
    '',
    `Generate ${count} interesting, personalized what-if scenarios that explore meaningful alternate paths for this person.`,
    '',
    'Return JSON:',
    '{',
    '  "scenarios": [',
    '    "What if I had taken that job offer in San Francisco?",',
    '    "What if I had stayed in my hometown?",',
    '    "What if I had pursued a different career?"',
    '  ]',
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(content);
    return parsed.scenarios || [];
  } catch (error) {
    console.error('Failed to generate what-if scenarios:', error);
    return [
      'What if I had taken that job offer in San Francisco?',
      'What if I had stayed in my hometown?',
      'What if I had pursued a different career?'
    ];
  }
}

export interface TimelineAdvancementResult {
  newEvents: Array<{
    time: string;
    title: string;
    description: string;
    type?: 'decision' | 'milestone' | 'asset' | 'relationship' | 'career';
    year?: number;
    month?: number;
  }>;
  yearEvents?: {
    [year: number]: {
      month1?: Array<{ time: string; title: string; description: string; type?: string }>;
      month6?: Array<{ time: string; title: string; description: string; type?: string }>;
      month12?: Array<{ time: string; title: string; description: string; type?: string }>;
      summary?: string;
    };
  };
  statDeltas: {
    money: number;
    happiness: number;
    freedom: number;
    growth: number;
    relationships: number;
  };
  newAssets: Array<{
    name: string;
    type: 'car' | 'apartment' | 'house' | 'pet' | 'other';
    value?: string;
    acquired_at: string;
    description?: string;
  }>;
  profileUpdates: {
    relationshipStatus?: string;
    job?: string;
    location?: string;
    netWorth?: string;
    [key: string]: any;
  };
  profileDeltas?: {
    netWorth?: string; // e.g., "+$15,000" or "-$5,000"
    location?: string; // e.g., "Moved to NYC" or null if unchanged
    job?: string; // e.g., "Promoted" or null if unchanged
    relationshipStatus?: string; // e.g., "Started dating" or null if unchanged
  };
  relationships?: Array<{
    name: string;
    type: 'friend' | 'partner' | 'family';
    status: 'good' | 'neutral' | 'bad' | 'complicated';
    description: string;
  }>;
  removedAssets?: string[];
  newAge: number;
}

/**
 * Advance a timeline by 3 years based on a user decision/scenario
 */
export async function advanceTimeline({
  currentProfile,
  currentStats,
  timelineHistory,
  userDecision,
  currentAge,
  currentYear,
  existingRelationships,
}: {
  currentProfile: any;
  currentStats: {
    money: number;
    happiness: number;
    freedom: number;
    growth: number;
    relationships: number;
  };
  timelineHistory: Array<{ time: string; title: string; description: string }>;
  userDecision: string;
  currentAge: number;
  currentYear: number;
  existingRelationships?: Array<{ name: string; type: string; status: string; description: string }>;
}): Promise<TimelineAdvancementResult> {
  if (DEV_MODE) {
    // Mock advancement for dev mode
    const mockEvents: Array<{
      time: string;
      title: string;
      description: string;
      type: 'decision' | 'milestone' | 'asset' | 'relationship' | 'career';
      year: number;
      month: number;
    }> = [
      { time: `Year ${currentYear}, Month 1`, title: 'Decision Impact', description: `You made the choice: ${userDecision}. This sets you on a new path.`, type: 'decision' as const, year: currentYear, month: 1 },
      { time: `Year ${currentYear}, Month 6`, title: 'First Milestone', description: 'You see initial results from your decision.', type: 'milestone' as const, year: currentYear, month: 6 },
      { time: `Year ${currentYear}, Month 12`, title: 'Year End Reflection', description: 'You reflect on the changes this year brought.', type: 'milestone' as const, year: currentYear, month: 12 },
    ];
    
    return {
      newEvents: mockEvents,
      yearEvents: {
        [currentYear]: {
          month1: [mockEvents[0]],
          month6: [mockEvents[1]],
          month12: [mockEvents[2]],
          summary: `Year ${currentYear}: Initial adaptation and early results`,
        },
      },
      statDeltas: {
        money: 0.5,
        happiness: 0.3,
        freedom: 0.2,
        growth: 0.4,
        relationships: 0.1,
      },
      newAssets: [
        {
          name: 'New Apartment',
          type: 'apartment',
          value: '$2,400/mo',
          acquired_at: new Date().toISOString(),
          description: 'Moved to a better location',
        },
      ],
      removedAssets: [],
      profileUpdates: {
        location: 'New City',
        job: 'Senior Role',
      },
      profileDeltas: {
        location: 'Moved to New City',
        job: 'Promoted to Senior Role',
        netWorth: '+$10,000',
      },
      relationships: (existingRelationships && existingRelationships.length > 0
        ? existingRelationships.map((rel: { name: string; type: string; status: string; description: string }) => ({
            name: rel.name,
            type: (rel.type as 'friend' | 'partner' | 'family') || 'friend',
            status: (rel.status as 'good' | 'neutral' | 'bad' | 'complicated') || 'neutral',
            description: rel.description || 'Updated relationship',
          }))
        : [
            { name: 'Alex', type: 'friend' as const, status: 'good' as const, description: 'Met through work, very supportive.' },
            { name: 'Jordan', type: 'friend' as const, status: 'neutral' as const, description: 'College friend, keeping in touch.' },
          ]) as Array<{ name: string; type: 'friend' | 'partner' | 'family'; status: 'good' | 'neutral' | 'bad' | 'complicated'; description: string }>,
      newAge: currentAge + 1,
    };
  }

  const systemPrompt = [
    "You are simulating a 1-year advancement of a user's life timeline based on a decision they made.",
    '',
    'CRITICAL REQUIREMENTS:',
    '- Generate events structured by MONTH',
    '- Generate events for Month 1, Month 6, and Month 12 of the next year',
    '- Each month should have 1-3 events (Month 1, Month 6, Month 12)',
    '- Each event should be realistic and directly or indirectly result from the user decision',
    '- Events should show progression throughout the year: Month 1 (immediate), Month 6 (developing), Month 12 (outcomes)',
    '- Update stats realistically based on the decision (each stat is 0-10 scale)',
    '- Identify new assets acquired (car, apartment, house, pet, etc.)',
    '- IMPORTANT: If user acquires a house, they should lose their apartment (if they have one). If they acquire an apartment, they should lose their house (if they have one). Only one primary residence at a time.',
    '- Update profile fields (job, location, relationship status, net worth)',
    '- Manage RELATIONSHIPS: Generate or update a list of friends/partners. Each should have name, type (friend, partner), status (good, neutral, bad), and a brief description.',
    '- Age increases by 1 year',
    '',
    'STATS:',
    '- Each stat (money, happiness, freedom, growth, relationships) is on a 0-10 scale',
    '- Provide deltas (changes) that are realistic for the decision',
    '- Consider trade-offs (e.g., more money might mean less freedom)',
    '',
    'EVENTS STRUCTURE:',
    '- Generate events for the next year only',
    '- Include events at Month 1, Month 6, and Month 12',
    '- Be HYPER-SPECIFIC with numbers, amounts, locations, names',
    '- Include a mix of: career milestones, relationship changes, financial changes, lifestyle changes',
    '- Write in SECOND PERSON (you/your)',
    '- Use time format: "Year 1, Month 1", "Year 1, Month 6", "Year 1, Month 12"',
    '',
    'ASSETS:',
    '- Only include significant assets (car, apartment, house, pet, major purchase)',
    '- Include realistic values and descriptions',
    '- ASSET REPLACEMENT LOGIC: If adding a "house", mark that any existing "apartment" should be removed. If adding an "apartment", mark that any existing "house" should be removed. Only one primary residence type at a time.',
    '- In the response, include a "removedAssets" field listing asset types that should be removed (e.g., ["apartment"] if buying a house)',
    '',
    'PROFILE UPDATES:',
    '- Update job title if career changes',
    '- Update location if moving',
    '- Update relationship status if relevant',
    '- Update net worth if significant financial change',
    '- IMPORTANT: Include "profileDeltas" showing the CHANGE for each updated field:',
    '  * netWorth: Show change as "+$X" or "-$X" (e.g., "+$15,000", "-$5,000")',
    '  * location: Show change description if moved (e.g., "Moved to NYC") or null if unchanged',
    '  * job: Show change description if changed (e.g., "Promoted", "New role") or null if unchanged',
    '  * relationshipStatus: Show change description if changed (e.g., "Started dating", "Got engaged") or null if unchanged',
    '',
    'RELATIONSHIPS:',
    '- ALWAYS return a complete, updated list of ALL relationships (not just new ones).',
    '- If existing relationships are provided, update them based on events (e.g. grew closer, drifted apart, status changes).',
    '- If no existing relationships, generate 2-3 initial friends/contacts.',
    '- Add new relationships if relevant events occurred (e.g. met someone new at work, started dating).',
    '- Remove relationships if they naturally fade away or end (e.g. lost touch, breakup).',
    '- Format: Array of { name: string, type: "friend" | "partner" | "family", status: "good" | "neutral" | "bad" | "complicated", description: string }',
    '- The "relationships" field should contain the FULL updated list after this year.',
  ].join('\n');

  const userPrompt = [
    'Current Profile:',
    JSON.stringify(currentProfile, null, 2).substring(0, 2000),
    '',
    'Current Stats:',
    JSON.stringify(currentStats),
    '',
    'Timeline History (recent events):',
    JSON.stringify(timelineHistory.slice(-5), null, 2),
    '',
    existingRelationships && existingRelationships.length > 0
      ? `Current Relationships:\n${JSON.stringify(existingRelationships, null, 2)}\n\n`
      : '',
    `User Decision/Scenario: "${userDecision}"`,
    '',
    `Current Age: ${currentAge}`,
    `Current Simulation Year: ${currentYear}`,
    '',
    `Simulate the next 1 year (Simulation Year ${currentYear}). Return JSON with events structured by month:`,
    '{',
    `  "yearEvents": {`,
    `    "${currentYear}": {`,
    `      "month1": [{"time": "Year ${currentYear}, Month 1", "title": "Event Title", "description": "Detailed description", "type": "decision"}],`,
    `      "month6": [{"time": "Year ${currentYear}, Month 6", "title": "Event Title", "description": "Detailed description", "type": "milestone"}],`,
    `      "month12": [{"time": "Year ${currentYear}, Month 12", "title": "Event Title", "description": "Detailed description", "type": "career"}],`,
    `      "summary": "Brief summary of Year ${currentYear}"`,
    '    }',
    '  },',
    '  "newEvents": [',
    `    {"time": "Year ${currentYear}, Month 1", "title": "Specific Event", "description": "Detailed description", "type": "decision", "year": ${currentYear}, "month": 1},`,
    '    ...',
    '  ],',
    '  "statDeltas": {',
    '    "money": 0.5,',
    '    "happiness": 0.3,',
    '    "freedom": 0.2,',
    '    "growth": 0.4,',
    '    "relationships": 0.1',
    '  },',
    '  "newAssets": [',
    '    {"name": "New Car", "type": "car", "value": "$25,000", "acquired_at": "2024-06-15T00:00:00Z", "description": "Reliable sedan for commuting"},',
    '    ...',
    '  ],',
    '  "removedAssets": ["apartment"],',
    '  "profileUpdates": {',
    '    "job": "Senior Software Engineer",',
    '    "location": "San Francisco, CA",',
    '    "relationshipStatus": "In a relationship",',
    '    "netWorth": "$85,000"',
    '  },',
    '  "profileDeltas": {',
    '    "netWorth": "+$15,000",',
    '    "location": "Moved to San Francisco",',
    '    "job": "Promoted to Senior",',
    '    "relationshipStatus": "Started dating"',
    '  },',
    '  "relationships": [',
    '    { "name": "Sarah", "type": "partner", "status": "good", "description": "Met at a coffee shop, very supportive." },',
    '    { "name": "Mike", "type": "friend", "status": "neutral", "description": "College buddy, drifting apart." }',
    '  ],',
    '  "newAge": ' + (currentAge + 1),
    '}',
  ].join('\n');

  try {
    const content = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.7,
      maxTokens: 8192, // Increased for large JSON responses with multiple events
    });

    // Try to extract JSON from the response
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      const lines = jsonContent.split('\n');
      const startIndex = lines.findIndex(line => line.includes('```'));
      const endIndex = lines.findIndex((line, idx) => idx > startIndex && line.includes('```'));
      if (startIndex !== -1 && endIndex !== -1) {
        jsonContent = lines.slice(startIndex + 1, endIndex).join('\n');
      } else if (startIndex !== -1) {
        // Only opening ``` found, remove it and everything before
        jsonContent = lines.slice(startIndex + 1).join('\n');
      }
    }
    
    // Try to find JSON object in the content - use a more robust approach
    let jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON starting from the first {
      const firstBrace = jsonContent.indexOf('{');
      if (firstBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace);
        jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      }
    }
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    // Try to fix common JSON issues before parsing
    // Remove trailing commas before closing braces/brackets
    jsonContent = jsonContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Try to close incomplete JSON strings
    const openQuotes = (jsonContent.match(/"/g) || []).length;
    if (openQuotes % 2 !== 0) {
      // Odd number of quotes, try to close the last string
      const lastQuoteIndex = jsonContent.lastIndexOf('"');
      if (lastQuoteIndex !== -1 && lastQuoteIndex === jsonContent.length - 1) {
        // Last character is an unclosed quote, remove it
        jsonContent = jsonContent.slice(0, -1);
      }
    }

    let parsed: TimelineAdvancementResult & { removedAssets?: string[] };
    try {
      parsed = JSON.parse(jsonContent) as TimelineAdvancementResult & { removedAssets?: string[] };
    } catch (parseError: any) {
      // Try one more time with a more aggressive fix
      try {
        // Try to find and extract just the core JSON structure
        const braceCount = (jsonContent.match(/\{/g) || []).length;
        const closeBraceCount = (jsonContent.match(/\}/g) || []).length;
        
        if (braceCount > closeBraceCount) {
          // Missing closing braces, try to add them
          const missingBraces = braceCount - closeBraceCount;
          jsonContent = jsonContent + '\n' + '}'.repeat(missingBraces);
          parsed = JSON.parse(jsonContent) as TimelineAdvancementResult & { removedAssets?: string[] };
        } else {
          throw parseError; // Re-throw if we can't fix it
        }
      } catch (retryError: any) {
        console.error('JSON parse error. Raw content length:', content.length);
        console.error('Raw content preview:', content.substring(0, 500));
        console.error('Extracted JSON content length:', jsonContent.length);
        console.error('Extracted JSON preview:', jsonContent.substring(0, 500));
        console.error('Parse error:', parseError.message);
        console.error('Retry error:', retryError.message);
        
        // Provide more helpful error message
        const errorMsg = `Failed to parse AI response as JSON. The response may have been cut off (${content.length} chars) or malformed. Please try again with a shorter input.`;
        throw new Error(errorMsg);
      }
    }

    // Ensure age is correct
    parsed.newAge = currentAge + 1;

    // If yearEvents exists, flatten it into newEvents for backward compatibility
    if (parsed.yearEvents && (!parsed.newEvents || parsed.newEvents.length === 0)) {
      parsed.newEvents = [];
      const validTypes: Array<'decision' | 'milestone' | 'asset' | 'relationship' | 'career'> = ['decision', 'milestone', 'asset', 'relationship', 'career'];
      
      for (const [yearStr, yearData] of Object.entries(parsed.yearEvents)) {
        const year = parseInt(yearStr);
        if (yearData.month1) {
          parsed.newEvents.push(...yearData.month1.map(e => {
            const eventType = (validTypes.includes(e.type as any) ? e.type : 'milestone') as 'decision' | 'milestone' | 'asset' | 'relationship' | 'career';
            return { 
              ...e, 
              year, 
              month: 1,
              type: eventType
            };
          }));
        }
        if (yearData.month6) {
          parsed.newEvents.push(...yearData.month6.map(e => {
            const eventType = (validTypes.includes(e.type as any) ? e.type : 'milestone') as 'decision' | 'milestone' | 'asset' | 'relationship' | 'career';
            return { 
              ...e, 
              year, 
              month: 6,
              type: eventType
            };
          }));
        }
        if (yearData.month12) {
          parsed.newEvents.push(...yearData.month12.map(e => {
            const eventType = (validTypes.includes(e.type as any) ? e.type : 'milestone') as 'decision' | 'milestone' | 'asset' | 'relationship' | 'career';
            return { 
              ...e, 
              year, 
              month: 12,
              type: eventType
            };
          }));
        }
      }
    }
    
    // Ensure all events have proper type
    const validTypes: Array<'decision' | 'milestone' | 'asset' | 'relationship' | 'career'> = ['decision', 'milestone', 'asset', 'relationship', 'career'];
    parsed.newEvents = parsed.newEvents.map(e => {
      const eventType = (e.type && validTypes.includes(e.type as any) ? e.type : 'milestone') as 'decision' | 'milestone' | 'asset' | 'relationship' | 'career';
      return {
        ...e,
        type: eventType
      };
    });

    // Ensure all required fields exist
    if (!parsed.newEvents) parsed.newEvents = [];
    if (!parsed.statDeltas) {
      parsed.statDeltas = {
        money: 0,
        happiness: 0,
        freedom: 0,
        growth: 0,
        relationships: 0,
      };
    }
    if (!parsed.newAssets) parsed.newAssets = [];
    if (!parsed.profileUpdates) parsed.profileUpdates = {};
    if (!parsed.relationships) {
      // If no relationships returned, keep existing ones or initialize empty
      parsed.relationships = (existingRelationships || []).map((rel: { name: string; type: string; status: string; description: string }) => ({
        name: rel.name,
        type: (rel.type as 'friend' | 'partner' | 'family') || 'friend',
        status: (rel.status as 'good' | 'neutral' | 'bad' | 'complicated') || 'neutral',
        description: rel.description || '',
      }));
    }

    return parsed;
  } catch (error: any) {
    console.error('Timeline advancement error:', error);
    
    // Check if it's a 529 overloaded error
    const isOverloaded = error?.status === 529 || 
                        error?.error?.type === 'overloaded_error' ||
                        error?.message?.includes('Overloaded') ||
                        error?.message?.includes('529');
    
    if (isOverloaded) {
      throw new Error('The AI service is currently overloaded. Please try again in a few moments.');
    }
    
    throw error;
  }
}
