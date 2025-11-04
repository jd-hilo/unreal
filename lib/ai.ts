import Constants from 'expo-constants';
import type {
  LifeExtractionResult,
  RelationshipExtraction,
  ClarifierQuestion,
  DecisionPrediction,
  SimulationScenario,
  WhatIfMetrics,
  TimelineSimulation,
} from '@/types/database';

const apiKey = 
  Constants.expoConfig?.extra?.openaiApiKey || 
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY || 
  '';

const DEV_MODE = !apiKey;

if (DEV_MODE) {
  console.warn('⚠️ OpenAI API key not found. Set EXPO_PUBLIC_OPENAI_API_KEY in .env file');
}

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

Return JSON:

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

  const systemPrompt = `Extract ALL relationships mentioned in the text. Include every person discussed. Be thorough and comprehensive.`;

  const userPrompt = `${transcript}

Extract ALL people mentioned in the text above. For each person, provide:
- name: their name
- relationship_type: one of: partner, spouse, family, friend, mentor, coworker, boss, or other
- duration: how long they've known them (e.g., "5 years", "2", etc.) 
- contact_frequency: how often they talk (daily, weekly, monthly, rarely)
- influence: 0-1 scale of how much they influence decisions (0.5 if unknown)
- location: where they live
- sentiment: positive, neutral, or negative

Return JSON object with ALL relationships:

{
  "relationships": [
    {"name":"Sarah","relationship_type":"partner","duration":"5","contact_frequency":"daily","influence":0.9,"location":"NYC","sentiment":"positive"},
    {"name":"Mike","relationship_type":"friend","duration":"10","contact_frequency":"weekly","influence":0.6,"location":"SF","sentiment":"positive"},
    {"name":"Jane","relationship_type":"mentor","duration":"3","contact_frequency":"monthly","influence":0.8,"location":"Boston","sentiment":"positive"}
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
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

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

  const systemPrompt = `Given the current profile object and needs flags, generate up to 3 quick follow-up questions. Prefer chips, sliders, or short pickers.`;

  const userPrompt = `Profile: ${JSON.stringify(profileCoreJson)}
Needs: ${JSON.stringify(needs)}

Return JSON:

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

export async function predictDecision({
  corePack,
  relevancePack,
  question,
  options,
}: {
  corePack: string;
  relevancePack: string;
  question: string;
  options: string[];
}): Promise<DecisionPrediction> {
  console.log('=== PREDICT DECISION CALLED ===');
  console.log('DEV_MODE:', DEV_MODE);
  console.log('Question:', question);
  console.log('Options:', options);
  console.log('Core Pack length:', corePack.length);
  console.log('Relevance Pack length:', relevancePack.length);
  
  if (DEV_MODE) {
    console.warn('⚠️ DEV_MODE: Using mock prediction (no API key configured)');
    return mockDecisionPrediction(options);
  }

  console.log('Calling OpenAI API...');
  const openai = getOpenAI();

  const systemPrompt = `You are the user's digital twin.

Use the Core Pack for identity, personality, values, and decision tendencies.

Use only facts from the Relevance Pack when they help answer the question.

Return calibrated probabilities for each option (summing to ~1), a concise rationale (2–4 sentences),
top factors considered, and an uncertainty score (0–1, lower = more confident).

Keep tone reflective, human, and emotionally grounded — not mechanical.`;

  const userPrompt = `Core Pack:

${corePack}

Relevance Pack:

${relevancePack}

Question:

${question}

Options:

${JSON.stringify(options)}

RETURN JSON with probabilities that sum to 1.0 based on YOUR actual analysis (don't copy these example numbers):

{
  "prediction": "<one_of_options>",
  "probs": {"<option1>": 0.XX, "<option2>": 0.XX},
  "rationale": "2–4 sentences explaining your reasoning.",
  "factors": ["values:freedom", "relationship:partner_4y_supportive", "decision_style:test-small"],
  "uncertainty": 0.XX
}

IMPORTANT: Generate probabilities based on the actual user context and decision - do NOT use 0.66 or 0.34 unless they truly reflect your analysis.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

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

  const openai = getOpenAI();

  const systemPrompt = `Simulate the user's likely state trajectory under the chosen policy. Use simple rules for energy/sleep/work/social/money. Return deltas vs baseline for: happiness, money, relationship, freedom, growth, and brief risk_notes.`;

  const userPrompt = `Core Pack:

${corePack}

Policy:

${policy}

Horizon: ${horizonDays}

Return JSON:

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

export async function generateTimelineSimulation(
  corePack: string,
  decision: string,
  chosenOption: string
): Promise<TimelineSimulation> {
  if (DEV_MODE) {
    return mockTimelineSimulation();
  }

  const openai = getOpenAI();

  const systemPrompt = `You are a life trajectory simulator. Generate HYPER-SPECIFIC, concrete events with real details. Use actual numbers, specific places, named scenarios. Avoid generic statements.`;

  const userPrompt = `User Context:

${corePack}

Decision Made:
${decision}

Chosen Option:
${chosenOption}

Generate a simple timeline of 5 HYPER-SPECIFIC events for each horizon (1 year, 3 years, 5 years, 10 years).

CRITICAL: Be HYPER-SPECIFIC with concrete details:
- Exact numbers ($X saved, X% growth, X hours per week, X people)
- Generic locations (coffee shop, downtown, convention center, office) - NO brand names
- Named people when relevant (can be hypothetical: "colleague Alex", "friend Jamie")
- Concrete activities (meeting, trip, project launch, purchase, move)
- Precise timeframes (Month 3, Week 2, Year 1.5)
- SHORT descriptions (1-2 sentences ONLY, prefer single sentence)

GOOD examples (specific but no brands):
- "Save $2,400 in high-yield savings account at 4.5% APY"
- "Move to 2BR apartment downtown for $2,200/mo, 8 min walk to work"
- "Lead team of 4 on major product launch, earn $15K performance bonus"
- "Meet potential mentor at industry conference, exchange contact info, follow up Tuesday"

BAD examples:
- Generic: "Professional growth continues" or "Financial situation improves"
- Brand names: "Open Marcus savings account" or "Buy Starbucks franchise"

Return JSON:

{
  "one_year": [
    {"time": "Month 2", "title": "Save $3,200 in High-Yield Account", "description": "Open savings account at 4.5% APY. Automate $800/mo deposits every payday."},
    {"time": "Month 5", "title": "Coffee Meeting With Industry Contact", "description": "Meet mentor contact introduced by college friend. 45-minute conversation leads to job referral."},
    {"time": "Month 8", "title": "Finish Online Course, 84 Hours", "description": "Complete certification program. Final project scores 94/100. Add credential to profile."},
    {"time": "Month 10", "title": "Sign Lease on $2,400/mo Apt", "description": "Move to new place 12 minutes from work. Commute drops from 75 to 12 minutes each way."},
    {"time": "Year 1", "title": "Performance Review: $6,500 Bonus", "description": "Annual review results in 'Exceeds' rating. Receive $6,500 bonus and 4% salary increase to $87,400."}
  ],
  "three_year": [
    {"time": "Year 1.5", "title": "Promotion to $112K Base Salary", "description": "Promoted to senior role managing 2 direct reports. Base salary increases from $87K to $112K plus new equity grant."},
    {"time": "Year 2", "title": "7-Day International Trip, $2,800", "description": "Book flights for $640, accommodation $890 for week. First international solo trip fully paid in cash."},
    {"time": "Year 2.5", "title": "Launch Side Consulting Practice", "description": "Start weekend consulting work. First client contract: $3,500 for 20 hours over 4 weeks."},
    {"time": "Year 2.8", "title": "Move In Together, Split $2,600", "description": "Partner moves into your 2BR. You each pay $1,300/mo vs $2,400 solo, saving $1,100/mo combined."},
    {"time": "Year 3", "title": "Investment Portfolio Hits $67K", "description": "Balances: $38K in 401k, $21K in index funds, $8K emergency fund. Compound growth accelerating."}
  ],
  "five_year": [
    {"time": "Year 3.5", "title": "Present at Industry Conference, 220 People", "description": "Deliver 30-minute talk at convention center. 37 connection requests, 4 job inquiries follow."},
    {"time": "Year 4", "title": "Buy $38K Electric Vehicle", "description": "Finance $32K over 5 years at 5.2% APR. Payment $605/mo, save $140/mo on fuel costs."},
    {"time": "Year 4.5", "title": "Host Family Dinner for 12", "description": "Thanksgiving at your place for first time. Cook dinner, serve at 6pm. Dad says 'You made it.'"},
    {"time": "Year 4.8", "title": "Complete Half Marathon in 1:58:42", "description": "Finish city half marathon after 14-week training plan. Beat goal by 8 minutes. Lost 15 lbs since starting."},
    {"time": "Year 5", "title": "Accept $165K Offer at Growth Company", "description": "New job: Director role at 45-person startup. $140K base + $25K equity. Start date: March 15."}
  ],
  "ten_year": [
    {"time": "Year 6.5", "title": "$85K Down Payment on $475K Home", "description": "Close on 2BR/2BA property. Mortgage $2,850/mo at 6.1%. Build equity vs renting."},
    {"time": "Year 7.5", "title": "Consulting Revenue: $95K/Year", "description": "Side practice nets $7,900/mo with 6 retainer clients. Hire assistant for $1,800/mo to handle admin."},
    {"time": "Year 8.5", "title": "10-Week International Sabbatical", "description": "Take July-Sept unpaid leave. Budget $16,500 for multi-country trip. Return with 200+ photos and fresh energy."},
    {"time": "Year 9", "title": "Mentor 4 People Through Program", "description": "Official mentor in company program. Meet mentees bi-weekly for coffee. One mentee gets promoted within 8 months."},
    {"time": "Year 10", "title": "Net Worth Reaches $380K", "description": "Assets: $165K home equity, $125K in retirement, $55K brokerage, $35K cash. Average monthly expenses: $4,200."}
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
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as TimelineSimulation;
  } catch (error) {
    console.error('Timeline simulation error:', error);
    throw error;
  }
}

function mockTimelineSimulation(): TimelineSimulation {
  return {
    one_year: [
      { time: "Month 2", title: "Save $1,800 Emergency Fund", description: "Deposit $450 bi-weekly into high-yield savings at 4.3% APY. Account balance reaches $1,800." },
      { time: "Month 5", title: "Networking Event Downtown", description: "Attend tech meetup with 45 people. Exchange cards with 3 founders, follow up with coffee next week." },
      { time: "Month 8", title: "Complete Online Course, 62 Hours", description: "Finish certification program. Build portfolio project: task manager app with 847 lines of code." },
      { time: "Month 10", title: "Lease Sedan, $385/mo", description: "Trade in old vehicle for certified pre-owned newer model. 36-month lease, 12K miles/year allowance." },
      { time: "Year 1", title: "Bonus Check: $4,200 After Tax", description: "Year-end performance bonus deposits Dec 15. Transfer $3,000 to index funds, spend $1,200 on gifts." }
    ],
    three_year: [
      { time: "Year 1.5", title: "Salary Bump to $95K", description: "Promotion from associate to senior associate. Base increases from $82K to $95K, vesting schedule resets." },
      { time: "Year 2", title: "Weekend Trip Out of State, $1,650", description: "Fly budget airline $280, accommodation $420 for 3 nights. Attend 2 concerts, explore local restaurants." },
      { time: "Year 2.5", title: "Freelance Client Pays $5,500", description: "Complete 3-month contract building website. Work 8 hours/week remotely. Client renews for Phase 2." },
      { time: "Year 2.8", title: "Sign Joint Lease, $2,200/mo", description: "Move to larger apartment with partner. You pay $1,100 each, includes parking spot and gym access." },
      { time: "Year 3", title: "401k Balance Crosses $52K", description: "Contributions: $19.5K/year, employer match $5.8K, market gains $8.2K. Portfolio: 80% stocks, 20% bonds." }
    ],
    five_year: [
      { time: "Year 3.5", title: "Speak to 180 at State Conference", description: "Keynote slot 10:30am Saturday. Presentation runs 35 minutes plus Q&A. 4 media mentions in industry blogs." },
      { time: "Year 4", title: "Purchase Electric Car for $32K", description: "Buy outright with savings. Charging costs $45/mo vs $220 gas. Resale value holds at 78%." },
      { time: "Year 4.5", title: "Host Engagement Party, 28 Guests", description: "Announce engagement at your place. Catering costs $680. Champagne toast at 8pm." },
      { time: "Year 4.8", title: "Run Marathon in 4:12:18", description: "City marathon finish: 26.2 miles. Training plan: 18 weeks, peak mileage 45 mi/week. Lost 22 lbs total." },
      { time: "Year 5", title: "Accept VP Role at $185K + Equity", description: "Join 120-person company as VP. $155K salary, $30K stock/year, 0.4% equity. Manage team of 8." }
    ],
    ten_year: [
      { time: "Year 6.5", title: "Close on $520K House, 3BR/2BA", description: "Buy property in desirable neighborhood. Put down $104K (20%), mortgage $3,280/mo at 5.8% for 30 years." },
      { time: "Year 7.5", title: "Consulting Income: $142K/Year", description: "11 active clients paying $1,800-$3,200/mo retainers. Total monthly revenue $11,800, net after costs $9,500." },
      { time: "Year 8.5", title: "3-Month International Sabbatical", description: "Visit multiple countries Sept-Dec. Budget $22,000 total. Document journey with 1,800+ photos." },
      { time: "Year 9", title: "Mentor 6 Emerging Leaders", description: "Run bi-weekly 1-on-1s with mentees. 3 get promoted within 12 months. Start monthly group dinner series." },
      { time: "Year 10", title: "Net Worth Hits $625K", description: "Breakdown: $245K home equity, $215K retirement accounts, $105K brokerage, $60K cash. Debt: $12K car loan only." }
    ]
  };
}

export async function runWhatIf(
  baselineSummary: string,
  userText: string
): Promise<{ metrics: WhatIfMetrics; summary: string }> {
  if (DEV_MODE) {
    return mockWhatIf();
  }

  const openai = getOpenAI();

  const systemPrompt = `You are analyzing alternate life trajectories. Generate realistic metrics comparing the user's CURRENT reality to an ALTERNATE reality where they made different choices. 

IMPORTANT: 
- Base the "current" values on their actual baseline summary
- Generate the "alternate" values based on how that specific counterfactual would have changed things
- Values should be on a scale of 0-10
- Make meaningful differences - avoid tiny changes unless truly warranted
- Consider second-order effects (e.g., better job = more money but maybe less freedom)`;

  const userPrompt = `Current baseline summary:

${baselineSummary}

Counterfactual prompt:

${userText}

Analyze how this alternate choice would have affected their life across 5 dimensions. For each metric, provide:
- "current": Their actual current state (0-10 scale based on baseline)
- "alternate": Where they'd likely be if they'd made the alternate choice (0-10 scale)

Return JSON (do NOT copy these example numbers - generate based on actual analysis):

{
  "metrics": {
    "happiness": {"current": X.X, "alternate": X.X},
    "money": {"current": X.X, "alternate": X.X},
    "relationship": {"current": X.X, "alternate": X.X},
    "freedom": {"current": X.X, "alternate": X.X},
    "growth": {"current": X.X, "alternate": X.X}
  },
  "summary": "One paragraph comparing the two trajectories and explaining key differences."
}

CRITICAL: Generate values based on YOUR analysis of the baseline and counterfactual, not the example format above.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    console.log('What-If AI response:', content);
    const parsed = JSON.parse(content);
    console.log('Parsed metrics:', parsed.metrics);
    
    return parsed;
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

  const systemPrompt = `You are analyzing a specific decision and generating realistic "what-if" scenarios that could change the outcome.

Rules:
- Each suggestion must be DIRECTLY relevant to the exact decision question being asked
- Tweaks should be small, realistic changes to the specific situation (not fantasy scenarios)
- Focus on actionable variables within the decision context (compensation, timing, conditions, responsibilities, etc.)
- Predict how each tweak would shift the probabilities based on the user's values and factors
- Keep suggestions grounded in the real decision at hand`;

  const userPrompt = `I'm helping someone decide: "${question}"

Their options are: ${JSON.stringify(options)}

Current probabilities based on who they are: ${JSON.stringify(currentProbs)}

Key factors influencing their decision: ${factors.join(', ')}

User's values and context: ${corePackSummary}

Generate 3-5 realistic tweaks SPECIFIC TO THIS DECISION that could change the probabilities. 

Examples of GOOD suggestions for different decision types:
- Job decision: "If salary was $X higher", "If role was fully remote", "If team was larger/smaller"
- Relationship decision: "If they moved closer", "If commitment timeline was different"
- Purchase decision: "If price was X% lower", "If warranty was longer"

For THIS decision ("${question}"), generate contextual tweaks that make sense for the OPTIONS provided.

Return JSON:
{
  "suggestions": [
    {
      "label": "Specific, actionable tweak relevant to the decision",
      "probs": {"${options[0]}": 0.XX, "${options[1] || 'option2'}": 0.XX},
      "delta": "Brief description of probability change"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
