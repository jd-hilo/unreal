# Career Simulation Web App — Implementation Prompt

> Hand this to a developer or AI coding assistant to build the career simulation as a standalone web app.

---

## WHAT WE'RE BUILDING

A web app that simulates a user's career trajectory over 5, 10, or 15 years. The user goes through a short onboarding (5 steps, ~90 seconds), then we call Claude AI to generate a deeply personalized career projection. The result page is a long scroll of rich, narrative-driven sections showing their future career, daily life, regrets, impact, and alternate timelines they can branch into.

There is NO existing profile database. Everything is collected fresh during the onboarding. The onboarding must be fast enough that users don't drop off, but rich enough that the AI produces specific, personal results — not generic filler.

---

## TECH STACK

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **AI**: Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`) via API
- **State**: React state (no external state library needed)
- **Storage**: localStorage for saving past simulations, optional Supabase/Postgres for persistence
- **Deployment**: Vercel

---

## ONBOARDING FLOW (5 Steps)

Each step is its own page/view with a progress bar at the top. One question per page. Back button on each. "Continue" button at bottom.

Design: Clean, minimal, lots of whitespace. Card-based selection where applicable. No clutter.

### Step 1: "Are you a student?"
- Two large cards side by side: "Yes, I'm a student" / "No, I'm working"
- If student → branch to Step 1b (student details), then skip to Step 4
- If working → continue to Step 2

### Step 1b: Student Details (only if student)
- **Grade level**: Dropdown or card selector — "High School", "Freshman", "Sophomore", "Junior", "Senior", "Graduate Student"
- **School name**: Text input
- **What are you studying / planning to study?**: Text input
- After this, skip to Step 4 (time horizon)

### Step 2: Your Current Role
- **Job title**: Text input with placeholder "e.g., Software Engineer, Product Manager, Nurse"
- **Company**: Text input with placeholder "e.g., Google, Local Hospital, Self-employed"
- Both required

### Step 3: Your Compensation
- **Annual salary**: Number input with dollar formatting, placeholder "$85,000"
- Helper text: "Base salary before taxes. An estimate is fine."

### Step 4: Time Horizon
- Three large selectable cards stacked vertically:
  - **5 Years** — "Near-term outlook"
  - **10 Years** — "Mid-career view" (default selected)
  - **15 Years** — "Long-term vision"

### Step 5: What matters to you?
- This is the KEY differentiator step. It replaces the old app's entire core_json/onboarding.
- **Single text area** with the prompt: "In a few sentences, tell us what matters most in your career. What are you optimizing for?"
- Placeholder: "e.g., I want to maximize my earning potential but I also care about work-life balance. I've been thinking about switching to management but I'm not sure if I'd miss coding..."
- Helper text: "The more specific you are, the more personalized your simulation will be."
- **Optional** — user can skip, but results will be more generic
- Character limit: 500

This single free-text field replaces ALL of the following from the old app's core pack:
- Values
- Motivation
- Decision style
- Onboarding responses (01-now, 02-path, 03-values, 04-style, 05-day, 06-stress)
- Career history context
- Narrative summary

One thoughtful paragraph from the user gives the AI more to work with than 6 structured checkboxes.

---

## FORM DATA COLLECTED

```typescript
interface OnboardingData {
  // Everyone
  timeHorizon: 5 | 10 | 15;
  careerPriorities: string;       // Free-text from Step 5 (optional)

  // Students only
  isStudent: boolean;
  gradeLevel?: string;            // "High School" | "Freshman" | ... | "Graduate Student"
  school?: string;
  studying?: string;

  // Working professionals only
  currentRole?: string;           // "Software Engineer"
  company?: string;               // "Google"
  salary?: string;                // "150000"
}
```

---

## GENERATING SCREEN

After onboarding, navigate to a loading/generating page.

**UI:**
- Centered content
- Title: "Generating Your Career Simulation"
- Rotating subtitle that cycles every 3-4 seconds:
  1. "Analyzing your profile..."
  2. "Building career trajectory model..."
  3. "Simulating industry trends..."
  4. "Calculating compensation progression..."
  5. "Generating timeline milestones..."
  6. "Analyzing global comparisons..."
  7. "Finalizing simulation..."
- Animated progress bar underneath (fills over ~30s, just cosmetic)
- Optional: fun interactive mini-game or animation to keep user engaged

**Behind the scenes:**
1. Build the user context string from onboarding data
2. Call Claude API via server-side API route (`/api/generate-simulation`)
3. Parse JSON response
4. Store in localStorage
5. Navigate to result page

---

## USER CONTEXT STRING (Replaces "Core Pack")

Build this string from the onboarding data to inject into the AI prompt:

```typescript
function buildUserContext(data: OnboardingData): string {
  const sections: string[] = [];

  if (data.isStudent) {
    sections.push('USER PROFILE');
    sections.push(`Status: Student`);
    if (data.gradeLevel) sections.push(`Grade: ${data.gradeLevel}`);
    if (data.school) sections.push(`School: ${data.school}`);
    if (data.studying) sections.push(`Studying: ${data.studying}`);
  } else {
    sections.push('USER PROFILE');
    sections.push(`Current Role: ${data.currentRole}`);
    sections.push(`Company: ${data.company}`);
    sections.push(`Salary: $${data.salary}/year`);
  }

  if (data.careerPriorities?.trim()) {
    sections.push('');
    sections.push('CAREER PRIORITIES & VALUES');
    sections.push(data.careerPriorities);
  }

  return sections.join('\n');
}
```

---

## AI PROMPT (Server-Side API Route)

Create `/api/generate-simulation/route.ts`:

### System Prompt:

```
You are a career trajectory simulator. Generate a deeply realistic, specific career simulation based on the user's profile and situation.

⚠️ ABSOLUTE CRITICAL REQUIREMENT:
The user's CURRENT ROLE is: "${currentRole}"

YOU MUST:
- Start Year 1 of the timeline with "${currentRole}" or a logical immediate next step from this exact role
- NEVER generate roles that are unrelated to "${currentRole}"
- If they're an "App Developer": App Developer → Senior App Developer → Lead Developer → Engineering Manager → Director
- If they're a "Marketing Manager": Marketing Manager → Senior Marketing Manager → Marketing Director → VP Marketing
- If they're a "Nurse": Nurse → Charge Nurse → Nurse Manager → Director of Nursing → VP of Patient Care
- If they're a STUDENT studying "${studying}": Start with entry-level role in their field of study after graduation
- The final outcome title at year ${timeHorizon} must be a logical career progression from "${currentRole}"

REQUIREMENTS:
1. Use SECOND PERSON (you/your) throughout — this should feel like reading YOUR future
2. Be BRUTALLY SPECIFIC with numbers, percentages, dollar amounts, and concrete details
3. Base predictions on realistic industry data and career progression patterns
4. Generate realistic outcomes reflecting real opportunities AND real challenges
5. Include key milestones, compensation changes, and role changes
6. NO brand names for companies — use realistic-sounding generic names
7. ALL fields in the JSON structure MUST be present — never omit any field
8. Arrays should have meaningful content (3+ items for most, 4+ for feedback)
9. Make regret moments genuinely emotionally resonant — not generic
10. The "honest assessment" in societal impact should be genuinely honest, not flattering
11. For alternatePaths: Generate 2-3 specific decision points from your generated timeline. Each should reference a real moment you created in the timeline.

${data.careerPriorities ? `
USER'S STATED PRIORITIES:
"${data.careerPriorities}"
Factor these priorities heavily into:
- Which regret moments you generate (regrets should conflict with their stated values)
- The satisfaction score
- Work-life balance metrics
- The reflection text
- What the "honest assessment" says
- The tone of team feedback
` : ''}

Path Type: For this simulation, generate the "stay at current trajectory" path (the most likely outcome if they keep doing what they're doing).

Time Horizon: ${timeHorizon} years.
```

### User Prompt:

```
User Profile Context:
${userContext}

Current Career Situation:
- STARTING ROLE: ${currentRole}
- Company: ${company}
- Current Salary: $${salary}/year
- Time Horizon: ${timeHorizon} years

Generate a comprehensive career simulation. Return valid JSON matching this EXACT format. Every single field must be present.

${FULL_JSON_SCHEMA}
```

### Full JSON Schema (include in prompt):

```json
{
  "id": "generated-stay-${timeHorizon}y",
  "timeHorizon": ${timeHorizon},
  "pathName": "Most Likely Path",
  "confidence": 75,
  "outcome": {
    "title": "Final role title — MUST be logical progression from ${currentRole}",
    "company": "Company name",
    "totalComp": 250000,
    "location": "City, State",
    "satisfaction": 4.2
  },
  "stats": {
    "compensation": { "base": 200000, "equity": 50000 },
    "growth": { "promotions": 2, "yearsToSenior": 3, "teamSize": 8 },
    "workLife": {
      "hoursPerWeek": 50,
      "burnoutRisk": "Medium",
      "flexibility": "High"
    },
    "skills": {
      "technical": "Specific technical skills developed",
      "leadership": "Leadership capabilities gained",
      "expertise": "Domain expertise areas"
    }
  },
  "timeline": {
    "milestones": [
      {
        "year": 1,
        "title": "Current role or natural next step",
        "company": "Company name",
        "salary": 150000,
        "description": "What happens this year"
      }
    ]
  },
  "globalComparison": {
    "income": {
      "yourComp": 250000,
      "globalPercentile": 8,
      "globalAverage": 120000,
      "usAverage": 195000,
      "topEarners": { "range": "$450k-$650k", "group": "Top performers in field" },
      "developingMarkets": { "min": 45000, "max": 80000 }
    },
    "careerProgression": {
      "yourLevel": "Senior Manager level",
      "globalPercentile": 12,
      "mostCommon": "Most common outcome for people in this role",
      "fastest": "Fastest progression path",
      "many": "What many people end up at"
    },
    "workLife": {
      "yourHours": 50,
      "globalPercentile": 55,
      "range": { "min": 35, "minLabel": "Europe", "max": 80, "maxLabel": "startup hubs" },
      "bestBalance": "Who has the best balance",
      "worstBalance": "Who has the worst"
    },
    "equity": {
      "yourEquity": 180000,
      "globalPercentile": 25,
      "mostEngineers": "$0-$30k equity",
      "lotteryWinners": { "range": "$5M-$50M", "percentage": 0.1 },
      "note": "Context about your equity position"
    },
    "geographic": {
      "northAmerica": 12000,
      "europe": 8500,
      "asia": 45000,
      "latinAmerica": 3200,
      "note": "Geographic context"
    },
    "globalReality": "A raw, honest paragraph comparing the user's trajectory to global workers in same field. Include specific salary comparisons by region. Make it hit hard."
  },
  "zoomIns": {
    "regretMoments": [
      {
        "year": 2029,
        "title": "Specific missed opportunity",
        "description": "Detailed, emotionally resonant description. Include specific numbers — what the alternative would have been worth. Make the reader feel the weight of the road not taken."
      }
    ],
    "reflection": "A 2-3 sentence reflection that acknowledges both what was gained and what was lost. Should feel like something you'd think at 2am. End with something that's true but uncomfortable.",
    "cards": [
      { "id": "tuesday", "title": "A Random Tuesday", "icon": "📱" },
      { "id": "email", "title": "The Email That Changed Everything", "icon": "📧" },
      { "id": "calendar", "title": "Your Calendar Evolution", "icon": "📅" },
      { "id": "feedback", "title": "What Your Team Says About You", "icon": "💬" },
      { "id": "inbox", "title": "Your Inbox: Then vs Now", "icon": "📬" }
    ],
    "randomTuesday": {
      "date": "Tuesday, March 15, 2034",
      "notifications": [
        { "app": "App Name", "icon": "💬", "title": "Notification title", "body": "Preview text", "time": "9:30 AM" }
      ],
      "timeline": [
        { "time": "7:30 AM", "icon": "☕", "title": "Activity", "description": "What you're doing and why" }
      ],
      "stats": { "decisionsMade": 23, "imposterSyndromeMoments": 2 }
    },
    "theEmail": {
      "from": "sender name <email>",
      "to": "you@company.com",
      "subject": "Email subject — should be a career-defining moment",
      "timestamp": "Mon, Apr 12, 2028 at 2:34 PM",
      "body": "Full email body. Should feel real — include compensation details, specific praise, concrete next steps. This is the email you screenshot and send to your mom.",
      "metadata": {
        "folder": "Career Milestones",
        "timesOpened": 47,
        "lastUpdate": "You starred this message"
      }
    },
    "calendar": {
      "current": {
        "year": 2026,
        "events": [
          { "day": "Mon", "time": "9:00 AM", "title": "Meeting name", "color": "#4285F4", "duration": 30 }
        ]
      },
      "future": {
        "year": 2034,
        "events": [
          { "day": "Mon", "time": "9:00 AM", "title": "Meeting name", "color": "#DB4437", "duration": 60 }
        ]
      },
      "stats": {
        "meetingsPerWeek": { "current": 8, "future": 18 },
        "stressLevel": { "current": "Moderate", "future": "High" },
        "controlLevel": { "current": "Medium", "future": "High" },
        "lastOpenedFigma": { "current": "2 hours ago", "future": "3 weeks ago" }
      }
    },
    "teamFeedback": {
      "messages": [
        {
          "author": "Anonymous Teammate A",
          "avatar": "👤",
          "timestamp": "2:14 PM",
          "message": "Specific feedback about working with you",
          "reactions": [{ "emoji": "❤️", "count": 8 }, { "emoji": "💯", "count": 5 }]
        }
      ],
      "finalMessage": "What they don't say: [something uncomfortable but true]"
    },
    "inbox": {
      "current": {
        "year": 2026,
        "emails": [
          { "sender": "Name", "subject": "Subject", "time": "9:42 AM", "unread": true }
        ]
      },
      "future": {
        "year": 2034,
        "emails": [
          { "sender": "Name", "subject": "Subject", "time": "10:15 AM", "unread": true, "important": true }
        ],
        "filteredCount": 23
      },
      "stats": {
        "responseTime": { "current": "2 hours", "future": "4 hours" },
        "stressLevel": { "current": "Low", "future": "Medium-High" }
      }
    }
  },
  "societalImpact": {
    "productsShipped": ["Specific product/project with scale numbers", "Another with impact metrics"],
    "peopleInfluenced": ["Direct reports and what happened to them", "Mentees and their outcomes"],
    "industryContributions": ["Conferences, blog posts, open source with specific numbers"],
    "rippleEffect": "Paragraph describing cascading impact — direct reports → their reports → users affected → broader influence. Use specific numbers.",
    "honestAssessment": "Brutally honest 2-3 sentences. Not flattering. Not self-deprecating. Just true. End with something that sits with you."
  },
  "alternatePaths": [
    { "id": "alt-1", "label": "What if you [specific decision from timeline]?", "year": 3, "decision": "decision_key" },
    { "id": "alt-2", "label": "What if you [another decision]?", "year": 6, "decision": "decision_key" },
    { "id": "alt-3", "label": "What if you [another decision]?", "year": 9, "decision": "decision_key" }
  ]
}
```

---

## API ROUTE IMPLEMENTATION

```typescript
// /api/generate-simulation/route.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();

  // Build user context
  const userContext = buildUserContext(body);

  // Build prompts
  const systemPrompt = buildSystemPrompt(body);
  const userPrompt = buildUserPrompt(body, userContext);

  // Call Claude with retries for 529
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0.7,
        system: systemPrompt + '\n\nIMPORTANT: Respond with valid JSON only. No text outside the JSON object.',
        messages: [{ role: 'user', content: userPrompt }],
      });

      let content = response.content.find(b => b.type === 'text')?.text || '';

      // Clean markdown code blocks if present
      content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];

      const simulation = JSON.parse(content);
      return Response.json(simulation);

    } catch (error: any) {
      lastError = error;
      if (error?.status === 529 && attempt < 2) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }

  return Response.json({ error: 'Failed to generate simulation' }, { status: 500 });
}
```

**Important**: Use `max_tokens: 8192` (not 4096). The full simulation JSON with all zoom-in sections is large. 4096 will truncate.

---

## RESULT PAGE — UI SECTIONS (Top to Bottom)

The result page is a single long scroll. All sections should animate in as the user scrolls.

### Header
- Back button (left)
- Center: "CAREER PROJECTION" in small caps, with badge showing "10 YEAR HORIZON"

### Section 1: Career Outcome Card
- Large card with:
  - App icon/logo top-left
  - "Career Outcome" label
  - **Final role title** in large bold text (e.g., "Senior Engineering Manager")
  - Company name with building icon
  - **Total compensation** in huge text (e.g., "$285K") with "+12% vs Market" badge
  - **Location** with map pin
  - **Satisfaction** as star rating (e.g., ★★★★☆ 4.2)

### Section 2: Zoom-In Cards
- Horizontal scroll of 5 interactive cards:
  1. "A Random Tuesday" 📱
  2. "The Email That Changed Everything" 📧
  3. "Your Calendar Evolution" 📅
  4. "What Your Team Says About You" 💬
  5. "Your Inbox: Then vs Now" 📬
- Each card opens a modal/sheet with full content
- **Modal details:**
  - **Random Tuesday**: Phone lock-screen mockup with notifications at top, then hour-by-hour timeline, stats at bottom
  - **The Email**: Full email UI — from, to, subject, timestamp, body, metadata (folder, times opened)
  - **Calendar Evolution**: Side-by-side week view (current year vs future year), stats comparison below
  - **Team Feedback**: Slack-style message thread with anonymous authors, reactions (emoji + count), uncomfortable "final message" at bottom
  - **Inbox Evolution**: Side-by-side inbox (current vs future), response time and stress stats

### Section 3: Career Timeline
- Vertical timeline with dots/lines connecting milestones
- Each milestone shows: Year, Title, Company, Salary
- Salary formatted as $XXXk
- Optional description text

### Section 4: Global Comparison
- Multiple stat blocks showing:
  - Income percentile with visual bar
  - Career progression percentile
  - Work-life hours percentile
  - Equity comparison
  - Geographic salary comparison
  - "Global Reality" paragraph at the bottom (this is the gut-punch text)

### Section 5: Regret Moments
- Cards for each regret (2-3 regrets)
  - Year badge
  - Title (e.g., "The Google Offer")
  - Description paragraph
- Reflection text below in italic/muted style

### Section 6: Societal Impact
- Bulleted lists:
  - Products Shipped
  - People Influenced
  - Industry Contributions
- Ripple Effect paragraph
- Honest Assessment at the bottom (distinct styling — slightly muted, contemplative)

### Section 7: Alternate Paths
- 2-3 cards, each showing a "What if..." question
- Each card is clickable → triggers a NEW simulation with that decision as the branch point
- When clicked: navigate back to generating screen with `alternateFrom` params, then to a new result page

---

## ALTERNATE PATH (BRANCHING) FLOW

When a user clicks an alternate path:

1. Store the current simulation in localStorage
2. Navigate to generating screen with extra params:
   ```typescript
   {
     ...originalOnboardingData,
     alternateFrom: {
       decisionLabel: "Accept the startup CTO offer",
       decisionYear: 5,
       decisionKey: "join_startup",
       baseSimulation: currentSimulation  // Full JSON of current sim
     }
   }
   ```
3. AI prompt gets additional ALTERNATE TIMELINE section:
   ```
   ALTERNATE TIMELINE MODE:
   Creating alternate timeline from decision: "${decisionLabel}" at Year ${decisionYear}.

   BASE TIMELINE MILESTONES (keep years BEFORE decision consistent):
   ${JSON.stringify(baseSimulation.timeline.milestones)}

   Rules:
   1. Years BEFORE decision year = same as base timeline
   2. AT decision year = reflect the alternate choice
   3. AFTER decision year = logically diverge from base
   4. Outcome should realistically differ from base timeline
   ```
4. Display new result page (user can keep branching)

---

## TYPESCRIPT TYPES

```typescript
interface CareerSimulation {
  id: string;
  timeHorizon: 5 | 10 | 15;
  pathName: string;
  confidence: number;
  outcome: CareerOutcome;
  stats: CareerStats;
  timeline: { milestones: TimelineNode[] };
  globalComparison: GlobalComparison;
  zoomIns: ZoomIns;
  societalImpact: SocietalImpact;
  alternatePaths: AlternatePath[];
}

interface CareerOutcome {
  title: string;
  company: string;
  totalComp: number;
  location: string;
  satisfaction: number; // 0-5
}

interface CareerStats {
  compensation: { base: number; equity: number };
  growth: { promotions: number; yearsToSenior: number; teamSize: number };
  workLife: {
    hoursPerWeek: number;
    burnoutRisk: 'Low' | 'Medium' | 'High';
    flexibility: 'Low' | 'Medium' | 'High';
  };
  skills: { technical: string; leadership: string; expertise: string };
}

interface TimelineNode {
  year: number;
  title: string;
  company: string;
  salary: number;
  description?: string;
}

interface GlobalComparison {
  income: {
    yourComp: number;
    globalPercentile: number;
    globalAverage: number;
    usAverage: number;
    topEarners: { range: string; group: string };
    developingMarkets: { min: number; max: number };
  };
  careerProgression: {
    yourLevel: string;
    globalPercentile: number;
    mostCommon: string;
    fastest: string;
    many: string;
  };
  workLife: {
    yourHours: number;
    globalPercentile: number;
    range: { min: number; minLabel: string; max: number; maxLabel: string };
    bestBalance: string;
    worstBalance: string;
  };
  equity: {
    yourEquity: number;
    globalPercentile: number;
    mostEngineers: string;
    lotteryWinners: { range: string; percentage: number };
    note: string;
  };
  geographic: {
    northAmerica: number;
    europe: number;
    asia: number;
    latinAmerica: number;
    note: string;
  };
  globalReality: string;
}

interface ZoomIns {
  regretMoments: RegretMoment[];
  reflection: string;
  cards: Array<{ id: string; title: string; icon: string }>;
  randomTuesday: RandomTuesdayData;
  theEmail: EmailData;
  calendar: CalendarData;
  teamFeedback: FeedbackData;
  inbox: InboxData;
}

interface RegretMoment {
  year: number;
  title: string;
  description: string;
}

interface RandomTuesdayData {
  date: string;
  notifications: Array<{
    app: string;
    icon: string;
    title: string;
    body: string;
    time: string;
  }>;
  timeline: Array<{
    time: string;
    icon: string;
    title: string;
    description: string;
  }>;
  stats: { decisionsMade: number; imposterSyndromeMoments: number };
}

interface EmailData {
  from: string;
  to: string;
  subject: string;
  timestamp: string;
  body: string;
  metadata: { folder: string; timesOpened: number; lastUpdate: string };
}

interface CalendarData {
  current: CalendarView;
  future: CalendarView;
  stats: {
    meetingsPerWeek: { current: number; future: number };
    stressLevel: { current: string; future: string };
    controlLevel: { current: string; future: string };
    lastOpenedFigma: { current: string; future: string };
  };
}

interface CalendarView {
  year: number;
  events: Array<{
    day: string;
    time: string;
    title: string;
    color: string;
    duration: number;
  }>;
}

interface FeedbackData {
  messages: Array<{
    author: string;
    avatar: string;
    timestamp: string;
    message: string;
    reactions: Array<{ emoji: string; count: number }>;
  }>;
  finalMessage: string;
}

interface InboxData {
  current: InboxView;
  future: InboxView;
  stats: {
    responseTime: { current: string; future: string };
    stressLevel: { current: string; future: string };
  };
}

interface InboxView {
  year: number;
  emails: Array<{
    sender: string;
    subject: string;
    time: string;
    unread: boolean;
    important?: boolean;
  }>;
  filteredCount?: number;
}

interface SocietalImpact {
  productsShipped: string[];
  peopleInfluenced: string[];
  industryContributions: string[];
  rippleEffect: string;
  honestAssessment: string;
}

interface AlternatePath {
  id: string;
  label: string;
  year?: number;
  decision?: string;
}
```

---

## PAGES / ROUTES

```
/                         → Landing page (optional) or redirect to /onboarding
/onboarding               → Step 1: Student check
/onboarding/student       → Step 1b: Student details
/onboarding/role          → Step 2: Current role + company
/onboarding/salary        → Step 3: Salary
/onboarding/horizon       → Step 4: Time horizon
/onboarding/priorities    → Step 5: What matters to you
/generating               → Loading screen while AI generates
/result                   → Full simulation result page
/result?branch=true       → Alternate path result
```

---

## DESIGN GUIDELINES

- **Colors**: Light background (#F9FAFB), white cards, dark text (#1a1a1a), accent gradient (teal #25729f → green #62edb9)
- **Typography**: Clean sans-serif (Inter or similar). Large bold headings, small muted labels.
- **Cards**: White background, subtle border (rgba(0,0,0,0.05)), soft shadow, rounded corners (16-24px)
- **Animations**: Fade-in on scroll for each section. Smooth page transitions.
- **Modals**: Slide-up sheet for zoom-in cards. Dark overlay. Close button top-right.
- **Mobile-first**: Must work great on mobile. Cards stack vertically. Modals become full-screen sheets.

---

## COST & RATE LIMITING

- **Cost per simulation**: ~$0.05-$0.15 (with 8192 max tokens output)
- **Rate limiting**: Implement on API route — max 3 simulations per IP per hour for anonymous users
- **Optional**: Add authentication for unlimited access or paid tier

---

## WHAT NOT TO BUILD

- No user authentication (for v1 — optional later)
- No database (localStorage is fine for v1)
- No profile system / core_json
- No premium/paywall gating
- No cooldown system
- No analytics (for v1)
- No relationship simulation
- No social simulation
- No twin system

Keep it focused: Onboarding → Generate → View Results → Branch.
