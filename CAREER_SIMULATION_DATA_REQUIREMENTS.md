# Career Simulation - Data Requirements & Transfer Guide

## Overview
This document outlines **exactly** what data is pulled from the user's profile and what information is needed to generate a career simulation in another app.

---

## 1. REQUIRED INPUT DATA (User Must Provide)

These are the **mandatory** fields the user enters directly in the setup flow:

```typescript
{
  timeHorizon: 5 | 10 | 15,           // Years to simulate
  currentRole: string,                 // e.g., "Senior Software Engineer"
  company: string,                     // e.g., "TechCorp"
  salary: string,                      // e.g., "150000"
  pathType: 'stay' | 'switch' | 'startup'  // Career path choice
}
```

**Where this is captured:**
- `app/career-sim/setup.tsx` - Setup screen where user inputs these values
- These are passed as URL params to the generating screen

---

## 2. PROFILE DATA ("CORE PACK") - Optional Context

The system pulls additional context from the user's profile to personalize the simulation. This is built by the `buildCorePack()` function in `lib/relevance.ts`.

### 2.1 Profile Table Fields

**From `profiles` table:**

```typescript
{
  // Basic Identity
  first_name: string | null,
  current_location: string | null,      // e.g., "San Francisco, CA"
  hometown: string | null,
  university: string | null,
  major: string | null,
  net_worth: string | null,
  political_views: string | null,
  
  // Core JSON (structured data)
  core_json: {
    age_range?: string,                 // e.g., "25-34"
    city?: string,                      // e.g., "San Francisco"
    country?: string,                   // e.g., "United States"
    primary_role?: string,              // e.g., "Software Engineer"
    job_sentiment?: string,             // e.g., "satisfied"
    employment_type?: string,           // e.g., "full-time"
    side_projects?: string,
    motivation?: string,                // What drives them
    
    // Onboarding responses (if available)
    onboarding_responses?: {
      '01-now'?: string,               // Current situation
      '02-path'?: string,              // Life path
      '03-values'?: string,            // Core values
      '04-style'?: string,             // Decision style
      '05-day'?: string,               // Typical day
      '06-stress'?: string,            // Stress response
      'local-preferences'?: string     // JSON string with food/activity prefs
    }
  },
  
  // Values & Narrative
  values_json: string[],                // e.g., ["growth", "autonomy", "impact"]
  narrative_summary: string | null      // AI-generated summary of their life
}
```

### 2.2 Relationships Data

**From `relationships` table (top 5):**

```typescript
{
  name: string,                         // e.g., "Sarah"
  relationship_type: string,            // e.g., "friend", "partner", "mentor"
  years_known: number | null,           // e.g., 5
  contact_frequency: string | null,     // e.g., "weekly"
  influence: number | null,             // 0-5 scale
  location: string | null
}
```

### 2.3 Career History

**From `career_entries` table (top 5):**

```typescript
{
  title: string,                        // e.g., "Software Engineer"
  company: string | null,               // e.g., "Google"
  start_date: string | null,            // e.g., "2020-01"
  end_date: string | null,              // e.g., "2023-06" or null if current
  satisfaction: number | null           // 1-5 scale
}
```

---

## 3. WHAT THE "CORE PACK" LOOKS LIKE

The `buildCorePack()` function assembles all this data into a text format that's sent to Claude AI. Here's an example:

```
IDENTITY SNAPSHOT
Age: 25-34
Current Location: San Francisco, CA
Location: San Francisco, United States
Role: Software Engineer
Employment: full-time
Hometown: Austin, TX
University: Stanford University
Major: Computer Science
Net Worth: $100k-$250k
Political Views: moderate

ONBOARDING CONTEXT
Current situation: Working at a mid-size tech company, feeling ready for growth
Life path: Focused on career advancement and financial stability
Core values: Growth, autonomy, impact
Decision style: Data-driven but considers gut feeling
Typical day: Morning coding, afternoon meetings, evening side projects
Stress response: Exercise and talking to friends

CORE VALUES
growth, autonomy, impact, learning, creativity

NARRATIVE SUMMARY
A driven software engineer in their late 20s, focused on career growth and making meaningful impact through technology. Values work-life balance but willing to work hard for the right opportunities.

KEY RELATIONSHIPS
- Sarah, friend, 8y, weekly, influence: 4.5
- Mike, mentor, 3y, monthly, influence: 4.8
- Alex, partner, 5y, daily, influence: 5.0

CAREER SUMMARY
- Software Engineer at TechCorp (2021-01 - present) satisfaction: 4/5
- Junior Developer at StartupXYZ (2019-06 - 2020-12) satisfaction: 3/5

MOTIVATION
Building products that solve real problems and growing as a technical leader
```

---

## 4. AI GENERATION PROCESS

### 4.1 API Call Details

**Model:** Claude Sonnet 4 (Anthropic)
- Model ID: `claude-sonnet-4-20250514`
- Max tokens: 4096
- Temperature: 0.7

**Function:** `generateCareerSimulation()` in `lib/ai.ts` (line 3599)

### 4.2 System Prompt Structure

The AI receives:

1. **System Prompt** with:
   - Instructions to generate realistic career trajectory
   - **CRITICAL REQUIREMENT**: Must start from the user's `currentRole`
   - Must use second person (you/your)
   - Must be specific with numbers and percentages
   - Must base on realistic industry data
   - Complete JSON structure with all required fields

2. **User Prompt** with:
   - Core Pack (profile context)
   - Current Career Situation (required inputs)
   - Path type explanation
   - Time horizon
   - Complete JSON schema to follow

### 4.3 Key Prompt Requirements

```
⚠️ ABSOLUTE CRITICAL REQUIREMENT:
The user's CURRENT ROLE is: "${currentRole}"

YOU MUST:
- Start Year 1 of the timeline with "${currentRole}" or logical next step
- NEVER generate roles unrelated to "${currentRole}"
- Final outcome must be logical progression from "${currentRole}"
```

---

## 5. OUTPUT DATA STRUCTURE

The AI returns a complete `CareerSimulation` object:

```typescript
interface CareerSimulation {
  id: string;
  timeHorizon: 5 | 10 | 15;
  pathName: string;
  confidence: number;                   // 0-100
  
  outcome: {
    title: string;                      // Final role title
    company: string;
    totalComp: number;                  // Total compensation
    location: string;
    satisfaction: number;               // 0-5 stars
  };
  
  stats: {
    compensation: {
      base: number;
      equity: number;
    };
    growth: {
      promotions: number;
      yearsToSenior: number;
      teamSize: number;
    };
    workLife: {
      hoursPerWeek: number;
      burnoutRisk: 'Low' | 'Medium' | 'High';
      flexibility: 'Low' | 'Medium' | 'High';
    };
    skills: {
      technical: string;
      leadership: string;
      expertise: string;
    };
  };
  
  timeline: {
    milestones: Array<{
      year: number;
      title: string;
      company: string;
      salary: number;
      description?: string;
    }>;
  };
  
  globalComparison: {
    income: {
      yourComp: number;
      globalPercentile: number;
      globalAverage: number;
      usAverage: number;
      topEarners: { range: string; group: string };
      developingMarkets: { min: number; max: number };
    };
    careerProgression: { /* ... */ };
    workLife: { /* ... */ };
    equity: { /* ... */ };
    geographic: { /* ... */ };
    globalReality: string;
  };
  
  zoomIns: {
    regretMoments: Array<{
      year: number;
      title: string;
      description: string;
    }>;
    reflection: string;
    cards: Array<{ id: string; title: string; icon: string }>;
    randomTuesday: { /* detailed day snapshot */ };
    theEmail: { /* pivotal email */ };
    calendar: { /* calendar evolution */ };
    teamFeedback: { /* team messages */ };
    inbox: { /* inbox comparison */ };
  };
  
  societalImpact: {
    productsShipped: string[];
    peopleInfluenced: string[];
    industryContributions: string[];
    rippleEffect: string;
    honestAssessment: string;
  };
  
  alternatePaths: Array<{
    id: string;
    label: string;
    year?: number;
    decision?: string;
  }>;
}
```

---

## 6. STORAGE & PERSISTENCE

### 6.1 Temporary Storage
- **AsyncStorage**: Simulation stored with key `career_sim_${userId}_${timestamp}`
- Used for immediate access and offline capability

### 6.2 Database Storage
- **Table**: `career_simulations`
- **Auto-save**: Happens automatically after generation
- **Fields saved**:
  ```typescript
  {
    user_id: string;
    time_horizon: number;
    path_type: 'stay' | 'switch' | 'startup';
    role_title: string;              // currentRole
    company: string;
    salary: string;
    simulation_data: CareerSimulation;  // Full JSON object
    created_at: timestamp;
  }
  ```

### 6.3 Recent Simulations
- Users can reload past simulations from dropdown
- Shows last 10 simulations
- Displays: name, time horizon, role, company, date

---

## 7. MINIMAL IMPLEMENTATION REQUIREMENTS

### For Another App - What You NEED:

**Absolute Minimum:**
```typescript
{
  currentRole: string,      // e.g., "Software Engineer"
  company: string,          // e.g., "TechCorp"
  salary: string,           // e.g., "150000"
  timeHorizon: 5 | 10 | 15,
  pathType: 'stay' | 'switch' | 'startup'
}
```

**Recommended (for better personalization):**
```typescript
{
  // Required fields above, plus:
  age_range?: string,
  location?: string,
  values?: string[],
  career_history?: Array<{
    title: string;
    company: string;
    years: number;
  }>;
  motivation?: string
}
```

**Optional (for rich context):**
- Full profile data as shown in Section 2
- Relationships
- Onboarding responses
- Narrative summary

---

## 8. API INTEGRATION CHECKLIST

To implement in another app:

- [ ] **Anthropic API Key** - Get from https://console.anthropic.com/
- [ ] **Input Form** - Collect: role, company, salary, time horizon, path type
- [ ] **Optional Profile** - Collect additional context (age, location, values, etc.)
- [ ] **Build Context String** - Format profile data like the "Core Pack" example
- [ ] **Call Claude API** - Use system + user prompt structure from `lib/ai.ts`
- [ ] **Parse JSON Response** - Extract and validate `CareerSimulation` object
- [ ] **Display Results** - Build UI components for each section
- [ ] **Storage** - Save to database for later retrieval
- [ ] **Error Handling** - Handle API failures, retries (529 errors), validation

---

## 9. COST CONSIDERATIONS

**Claude Sonnet 4 Pricing** (as of 2024):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

**Typical Simulation:**
- Input: ~2,000-4,000 tokens (Core Pack + Prompt)
- Output: ~3,000-4,000 tokens (Full simulation JSON)
- **Cost per simulation: ~$0.05-$0.10**

**Optimization:**
- Use shorter Core Pack for cost savings
- Cache common prompts
- Implement rate limiting
- Consider cooldown for free users

---

## 10. ALTERNATIVE APPROACHES

### Without User Profile Data:
You can generate simulations with **just the 5 required fields**. The AI will:
- Use industry averages and patterns
- Generate generic but realistic trajectories
- Base everything on the role/company/salary provided
- Still produce comprehensive output

### With Minimal Profile:
Add just 2-3 fields for better results:
- `age_range` - Affects timeline progression
- `location` - Affects compensation benchmarks
- `values` - Affects satisfaction and decision points

---

## 11. EXAMPLE API CALL (Minimal)

```typescript
const anthropic = new Anthropic({ apiKey: YOUR_API_KEY });

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  temperature: 0.7,
  system: `You are a career trajectory simulator. Generate realistic career simulation.
  
  The user's CURRENT ROLE is: "Software Engineer"
  You MUST start Year 1 with this role or logical next step.
  Use second person (you/your). Be specific with numbers.
  Return valid JSON matching the CareerSimulation schema.`,
  
  messages: [{
    role: 'user',
    content: `
Current Career Situation:
- STARTING ROLE: Software Engineer
- Company: TechCorp
- Current Salary: $150,000/year
- Chosen Path: Stay at Current Company
- Time Horizon: 10 years

Generate a comprehensive career simulation with complete JSON structure.
[Include full JSON schema here]
    `
  }]
});

const simulationData = JSON.parse(response.content[0].text);
```

---

## 12. TESTING & VALIDATION

**Test Cases:**
1. ✅ Different roles (engineer, designer, manager, etc.)
2. ✅ Different time horizons (5, 10, 15 years)
3. ✅ Different path types (stay, switch, startup)
4. ✅ With/without profile data
5. ✅ Edge cases (student, career changer, executive)

**Validation:**
- Ensure all required JSON fields present
- Verify timeline starts with current role
- Check compensation is realistic for role/location
- Validate year progression is logical
- Confirm alternate paths reference timeline events

---

## SUMMARY

**What you MUST have:**
- Current role, company, salary, time horizon, path type

**What significantly improves results:**
- Age, location, values, career history, motivation

**What's nice to have:**
- Full profile, relationships, onboarding responses, narrative

**What you DON'T need:**
- Any app-specific features (twin codes, gamification, etc.)
- Other simulation types (relationship, social, etc.)
- User authentication details
- Premium status (just affects cooldowns, not generation)

The career simulation is **self-contained** and can work with minimal data!
