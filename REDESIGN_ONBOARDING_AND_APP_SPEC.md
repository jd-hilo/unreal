# Life Coach / Digital Twin App Redesign Spec

**Version:** 1.0  
**Date:** 2025-03-17  
**Constraints:** No database schema changes. Use only `profiles.core_json.onboarding_responses` and existing columns. Old users must not be forced through new onboarding.

---

## 1. Chat Flow for Decision & Architect

### 1.1 Architecture Overview

Both **Decision** and **Architect** flows will use a **conversational Q&A phase** before the main AI response. The flow is:

1. **User intent** → User enters question/topic
2. **Clarification phase** → AI asks 2–4 contextual questions via chat
3. **Minimum-info check** → System validates required context is gathered
4. **Response phase** → AI provides prediction (Decision) or advice (Architect)

The clarification phase is driven by a **state machine** backed by prompt templates. Questions are asked one at a time in chat; user answers are accumulated in a structured `context_summary` object.

---

### 1.2 Decision Tab – Clarification Flow

**Entry point:** User enters a decision question (e.g., "Should I take this job?") → options are derived → prediction runs.

**Problem today:** Prediction runs immediately with only `corePack` + question + options. No chance to ask "What matters most to you?" or "What's holding you back?"

**Solution:** Before calling `predictDecision()`, run a short clarifying chat. Store answers in `decision.context_summary` (or a new `clarification_responses` JSON field on the decision record).

#### Question Tree (Decision)

| Round | Condition | Question Template |
|-------|-----------|-------------------|
| 1 | Always | "What’s the timeline or deadline for this decision?" |
| 2 | If options differ on risk/stability | "Which matters more right now: stability or taking a chance?" |
| 3 | If options differ on money/career | "How important is salary vs. growth in this choice?" |
| 4 | If relationship/family in question | "Would anyone else’s opinion change your mind?" |

**Minimum required info (before prediction):**

- At least **2 rounds** of Q&A (e.g., timeline + one of: risk preference / salary vs growth / social influence)
- OR user explicitly says "I’m ready" / "Just give me your take"

**State machine (simplified):**

```
INIT → Q_TIMELINE → (branch by question type) →
  [risk_options] → Q_RISK_STABILITY
  [career_options] → Q_SALARY_VS_GROWTH
  [relationship_options] → Q_SOCIAL_INFLUENCE
→ MINIMUM_MET → RESPOND
```

**Implementation:**

- Add `clarification_state` and `clarification_responses` to the decision creation flow.
- In `/decision/new` and `/decision/[id]`, before showing prediction:
  - If `clarification_responses` has &lt; 2 required fields, show chat UI with the next question.
  - On each user reply, append to `clarification_responses`, then either ask next question or call `predictDecision()` with enriched context.

---

### 1.3 Architect Tab – Clarification Flow

**Entry point:** User starts a life chat with a topic (e.g., "I’m burnt out at work").

**Problem today:** Architect responds immediately from `corePack` alone. No structured probing.

**Solution:** Before the main advice, run 1–3 clarifying questions tailored to the topic.

#### Question Tree (Architect)

| Round | Topic Signal (in user message) | Question Template |
|-------|-------------------------------|-------------------|
| 1 | work/career/burnout | "How long has this been going on?" |
| 2 | work/career | "What would change if things improved?" |
| 3 | relationship/family | "Is this something you’ve talked about with them?" |
| 1 | health/fitness | "What have you already tried?" |
| 2 | health | "What’s getting in the way?" |
| 1 | big decision | "What’s the hardest part of choosing?" |
| 2 | big decision | "What would your future self tell you?" |

**Minimum required info (before advice):**

- At least **1–2 rounds** of Q&A depending on topic depth
- OR user gives a long, detailed message (e.g. &gt; 100 words) → can skip to advice

**State machine (simplified):**

```
INIT → (classify topic from first message) →
  [career] → Q_DURATION → Q_WHAT_CHANGE
  [health] → Q_ALREADY_TRIED → Q_GETTING_IN_WAY
  [decision] → Q_HARDEST_PART → Q_FUTURE_SELF
→ MINIMUM_MET → RESPOND
```

**Implementation:**

- In `/chat/life/[id]`, before first Architect reply:
  - Call a lightweight `classifyArchitectTopic(message)` to pick topic.
  - Use a `clarification_round` counter (0, 1, 2) stored in chat state or `life_chats` metadata.
  - If `clarification_round < 2` and message is short, respond with the next clarifying question instead of advice.
  - When `clarification_round >= 2` or message is long, call `architectLifeChat()` and include `clarification_responses` in the system prompt.

---

### 1.4 Prompt Templates for Clarification

**Decision – System prompt addition (for clarification phase):**

```
You are helping the user clarify their decision before your twin makes a prediction.
Ask ONE short question at a time. Be warm and direct. No lists or bullet points.
Current question: [QUESTION]
Options: [OPTIONS]
Context gathered so far: [CONTEXT]
Next question to ask (from script): [NEXT_QUESTION_TEMPLATE]
Respond with ONLY the next clarifying question, 1-2 sentences max.
```

**Architect – System prompt addition (for clarification phase):**

```
You are The Architect, gathering context before giving advice.
The user said: [USER_MESSAGE]
Topic: [TOPIC]
Context gathered: [CONTEXT]
Ask ONE natural follow-up question (from script): [NEXT_QUESTION_TEMPLATE]
Respond with ONLY that question, 1-2 sentences. Match their tone.
```

---

### 1.5 Summary Table

| Flow | Min Rounds | Max Rounds | Stored Where |
|------|------------|------------|--------------|
| Decision | 2 | 4 | `decisions.context_summary` or new JSON field |
| Architect | 1 | 3 | `life_chats` metadata or in-memory for first session |

---

## 2. Tool Teaser Copy (3 Lines)

These appear before the paywall to highlight premium value. Punchy, benefit-focused, consistent tone.

### Final Copy

1. **Architect:**  
   "Chat with the Architect anytime—your twin that knows you and tells it straight."

2. **Simulate:**  
   "Run simulations on big life decisions and see what changes before you commit."

3. **See changes:**  
   "See exactly what changes if you change—no guesswork, just clarity."

### Alternative Options (for A/B testing)

| Line | Option A | Option B |
|------|----------|----------|
| Architect | "Chat with the Architect anytime." | "Your twin who knows you. Available whenever you need a straight take." |
| Simulate | "Run simulations on big life decisions." | "Model career moves before you make them." |
| See changes | "See exactly what changes if you change." | "Know what shifts before you act." |

**Recommended:** Use the **Final Copy** above for consistency and clarity.

---

## 3. Journey Generation System Prompt + Output Schema

### 3.1 Inputs (from simplified onboarding)

- `name` (from `00-name` or `first_name`)
- `gender` (from `00-gender`)
- `age` / birth year (from `00-birth-year`)
- `interests` (from `interests`)
- `career` (new: from LinkedIn / resume upload / text)
- `health` (new: from Apple Health / text)
- `goals` (new: 5 career + 5 health + 5 custom options selected)

### 3.2 System Prompt

```
You are a life coach creating a personalized journey for a user based on their profile and goals.
Your output must be motivating, coherent, and specific—never generic.

Input profile:
- Name: {name}
- Gender: {gender}
- Age: {age} (or birth year: {birth_year})
- Interests: {interests}
- Career: {career}
- Health: {health}
- Goals: Career: {career_goals}, Health: {health_goals}, Custom: {custom_goals}

Generate a journey that:
1. Has 4–6 high-level phases (e.g., "Foundation", "Momentum", "Breakthrough", "Integration")
2. Each phase has a short title (2–4 words) and 2–3 sentence description
3. Phases flow logically from where they are now toward their goals
4. Include an estimated total time to completion (in weeks or months, realistic)
5. Include a "daily task preview" with the first 3–5 days of suggested tasks

Tone: Warm, direct, personal. Use their name. Reference their specific goals. Avoid clichés.
Output: Valid JSON matching the exact schema below.
```

### 3.3 Output Schema (JSON)

```json
{
  "phases": [
    {
      "id": "phase-1",
      "title": "Foundation",
      "description": "2–3 sentences describing this phase and what the user will focus on.",
      "estimated_weeks": 4,
      "order": 1
    }
  ],
  "estimated_completion_weeks": 24,
  "daily_task_preview": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "task": "Short actionable task (4–10 words)",
      "category": "Career | Health | Growth | Personal | Lifestyle | Financial"
    }
  ]
}
```

### 3.4 Stored Location

- **Key:** `onboarding_responses['journey']`
- **Value:** JSON string of the above schema  
- **Alternative:** `core_json.journey_json` if you prefer top-level separation from onboarding_responses.

### 3.5 buildCorePack() Update

Add to `lib/relevance.ts` when building core pack:

```typescript
if (profile.core_json?.onboarding_responses?.['journey']) {
  try {
    const journey = JSON.parse(profile.core_json.onboarding_responses['journey']);
    sections.push('\nJOURNEY');
    sections.push(`Phases: ${journey.phases?.map((p: any) => p.title).join(' → ')}`);
    sections.push(`Est. completion: ${journey.estimated_completion_weeks} weeks`);
    if (journey.daily_task_preview?.length) {
      sections.push(`Preview tasks: ${journey.daily_task_preview.map((t: any) => t.task).join('; ')}`);
    }
  } catch (e) {}
}
```

---

## 4. Backward Compatibility Strategy

### 4.1 Detecting Old vs New Users

```typescript
function isNewOnboardingUser(profile: Profile | null): boolean {
  if (!profile?.core_json?.onboarding_complete) return false;
  const responses = profile.core_json?.onboarding_responses || {};
  // New flow stores 'journey' — single source of truth for new flow completion
  return responses['journey'] !== undefined && responses['journey'] !== '';
}

function isLegacyOnboardingUser(profile: Profile | null): boolean {
  if (!profile?.core_json?.onboarding_complete) return false;
  // If they have journey, they're new flow
  if (profile.core_json?.onboarding_responses?.['journey']) return false;
  // Old flow has 02-path, 01-now, etc.
  const responses = profile.core_json?.onboarding_responses || {};
  return ['01-now', '02-path', '03-values', '04-style', '06-stress']
    .some(k => responses[k] !== undefined && responses[k] !== '');
}
```

### 4.2 Routing Logic

| User Type | Onboarding | Journey View | Daily Tasks | Decision/Architect |
|-----------|------------|--------------|-------------|--------------------|
| **New** (short flow) | New steps only | Show `journey` from `onboarding_responses['journey']` | From journey phases + goals | Full access |
| **Old** (long flow) | Never show new onboarding | Derive from `02-path`, `dream_vision`, values | From `dream_vision` + `generateArchitectPlan()` | Full access |

### 4.3 Journey View Logic

```typescript
function getJourneyForUser(profile: Profile): JourneyData | null {
  if (isNewOnboardingUser(profile)) {
    const journeyRaw = profile.core_json?.onboarding_responses?.['journey'];
    if (journeyRaw) {
      try {
        return JSON.parse(journeyRaw);
      } catch (e) {}
    }
  }
  // Legacy: build synthetic journey from 02-path + dream_vision
  if (isLegacyOnboardingUser(profile)) {
    return buildLegacyJourney(profile);
  }
  return null;
}
```

### 4.4 buildLegacyJourney (Pseudo-code)

```typescript
function buildLegacyJourney(profile: Profile): JourneyData {
  const path = profile.core_json?.onboarding_responses?.['02-path'] || '';
  const dream = profile.dream_vision || {};
  return {
    phases: [
      { id: 'current', title: 'Where You Are', description: path || 'Your current path.', estimated_weeks: 0, order: 1 },
      { id: 'vision', title: 'Your Vision', description: formatDreamVision(dream), estimated_weeks: 52, order: 2 },
    ],
    estimated_completion_weeks: 52,
    daily_task_preview: [], // Legacy users get tasks from generateArchitectPlan
  };
}
```

### 4.5 Daily Tasks Logic

- **New users:** Can seed initial tasks from `journey.daily_task_preview`; ongoing tasks from a `generateArchitectPlan` variant that uses `goals` + `journey.phases`.
- **Old users:** Unchanged; continue using `dream_vision` + `generateArchitectPlan()`.

### 4.6 onboarding_responses Key Mapping (New Flow)

| New Step | Key in onboarding_responses | Example Value |
|----------|-----------------------------|---------------|
| Name | `00-name` (existing) | `"Sarah"` |
| Gender | `00-gender` (existing) | `"female"` |
| Birth year | `00-birth-year` (existing) | `"1990"` |
| Interests | `interests` (existing) | `"fitness,reading,travel"` |
| Career | `career` | `{"method":"text","content":"..."}` or `{"method":"linkedin","..."}` |
| Health | `health` | `{"method":"text","content":"..."}` or `{"method":"apple_health","summary":"..."}` |
| Goals | `goals` | `{"career":["opt1","opt2"],"health":["opt3"],"custom":["opt4"]}` |
| Journey | `journey` | JSON string (schema in §3.3) |
| Signature | `signature` | `{"signed_at":"ISO8601","committed":true}` |

---

## 5. Goal Options (15 total: 5 per category)

### 5.1 Career Goals

| ID | Option | Description (for display) |
|----|--------|-----------------------------|
| cg1 | Get promoted | Move up within my current path |
| cg2 | Switch industries | Pivot to a new field |
| cg3 | Start my own thing | Launch a business or side project |
| cg4 | Land my dream role | Land a specific target job |
| cg5 | Build expertise | Become a recognized expert in my field |

### 5.2 Health Goals

| ID | Option | Description |
|----|--------|-------------|
| hg1 | Lose weight | Shed pounds and feel lighter |
| hg2 | Get stronger | Build muscle and endurance |
| hg3 | Sleep better | Improve sleep quality and consistency |
| hg4 | Manage stress | Reduce anxiety and burnout |
| hg5 | Build a routine | Create consistent healthy habits |

### 5.3 Custom Goals (Other Life Areas)

| ID | Option | Description |
|----|--------|-------------|
| xg1 | Improve relationships | Deeper connections with family/friends |
| xg2 | Save more money | Build savings and financial security |
| xg3 | Travel more | See new places and have adventures |
| xg4 | Learn something new | Pick up a new skill or hobby |
| xg5 | Move to a new place | Relocate to a better city or home |

### 5.4 Storage Format

```json
{
  "career": ["cg1", "cg3"],
  "health": ["hg4", "hg5"],
  "custom": ["xg1", "xg2"]
}
```

Store as `onboarding_responses['goals']`. User selects up to 5 per category (or fewer if desired).

---

## 6. Simulate Page – Data Source Change

**Current:** User manually enters time horizon, path type, current role, company, salary in `/career-sim/setup`.

**Target:** Use existing profile/journey data; no extra form for basic simulation.

### Logic

1. **Current role:** `core_json.primary_role` or `career_entries[0].title` or `onboarding_responses['career']`
2. **Company:** `career_entries[0].company` or from career text
3. **Salary:** Optional; allow "Skip" and use placeholder if missing
4. **Path type:** Default `stay`; allow quick toggle to `switch` / `startup`
5. **Time horizon:** Default 10 years; allow 5/10/15 selector

**Implementation:** Pre-fill setup form from profile. Add "Use my profile" as default; user can edit if needed. For users with minimal career data, show simplified form (role + company only).

---

## 7. Implementation Checklist

- [ ] Add clarification chat phase to Decision flow (`/decision/new`, `/decision/[id]`)
- [ ] Add clarification chat phase to Architect flow (`/chat/life/[id]`)
- [ ] Create `classifyArchitectTopic()` and question templates
- [ ] Implement tool teaser screen (3 lines) before paywall
- [ ] Implement journey generation (prompt + schema + save to `onboarding_responses['journey']`)
- [ ] Update `buildCorePack()` for new keys: `career`, `health`, `goals`, `journey`
- [ ] Add `isNewOnboardingUser()` / `isLegacyOnboardingUser()` helpers
- [ ] Build "Journey" view on Home (button + screen)
- [ ] Implement `getJourneyForUser()` and `buildLegacyJourney()`
- [ ] Create new onboarding steps: career, health, goals, journey-gen, signature, tool-teaser
- [ ] Add routing: new users → new flow; old users → skip new onboarding
- [ ] Pre-fill career sim from profile

---

*End of spec*
