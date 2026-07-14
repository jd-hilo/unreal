# Career Simulation Feature

This document describes the **Simulate Your Career** product surface: user flows, UI, data model, AI prompting, persistence, and how it differs from other “simulation” routes in the app.

---

## 1. Purpose and positioning

The career simulation answers: *“If I stay on this trajectory (with a specific path flavor and time horizon), what might my career look like?”* It produces a structured, scrollable **Career Projection** report: outcome card, “zoom-in” vignettes, year-by-year milestones, global comparisons, regret moments, societal impact, and **alternate paths** that can branch into new generations.

Copy on the Simulate tab frames it as cloning a digital twin to explore probable futures; the **implemented** career path is the wizard under `app/career-sim/*` backed by `generateCareerSimulation` in `lib/ai.ts`.

---

## 2. User interface (detailed)

This section describes what users **see and touch**, screen by screen. Styling pulls from `constants/Theme` (`Colors`, `Fonts`): light app background, dark primary text, purple gradients for premium accents, secondary typography for labels.

### 2.1 Simulate tab

- **Header (left):** Large **“Simulate”** title next to a **Zap** icon; subtitle **“Experience possible futures.”**
- **Header (right, signed in):** Pill-shaped **“Recent”** control with a soft teal-to-lavender gradient fill, thin border, small **ChevronDown** that rotates when open. Tapping toggles a **floating dropdown** over a full-screen dim overlay; inside, a scrollable list of past runs (title = branch name or “Career Sim”, horizon, role `@` company, relative date). Empty state: “No recent simulations.”
- **Main area:** **Horizontal paging carousel** (one card per “simulation type”). Each card is a **tall white tile** with faux **3D bevels** (top/left/right/bottom edge strips), inner **white → very light violet** vertical gradient, soft shadow.
  - **Career (active):** Briefcase in a **rounded icon well** with a pink–purple wash; title **“Simulate Your Career”** (line break in title); body copy about cloning the twin; bottom row = **“Start Simulation”** label + circular **chevron** on a filled button. Tappable.
  - **Relationship / Social:** Heart and Brain icons with red/pink and blue/purple washes; **“Coming Soon”**; controls **disabled** (muted text and button).
- **Below carousel:** **Pagination dots** (active dot emphasized vs gray inactive).
- **Motion:** Tab focus runs a **fade-in** on the main container; swiping cards triggers **selection haptics**.

### 2.2 Career wizard (multi-step)

Shared patterns across `01-time-horizon`, `01b-student-check`, `01c-student-details`, `02-current-role`, `03-company`, `04-salary`:

- **Layout:** Full-screen **SafeAreaView**, dark status bar, **KeyboardAvoidingView** on forms.
- **Top bar:** Back **chevron** in a light circular hit target; beside it a **thin ProgressBar** (teal `#25729f` → mint `#62edb9`, ~4px height) whose fill fraction steps up through the flow (roughly 25% → 33% → 50% → 100%).
- **Content:** Scrollable column with a **section title** and **subtitle** in large / secondary text; choices are **large rounded cards** with the same 3D edge motif as the Simulate tab for time horizon, or simpler bordered tiles for yes/no (student).
- **Inputs:** Role / company use the shared **`Input`** component with icons (Briefcase, Building2); salary uses a **numeric** field with **DollarSign** in an icon rail and an **info box** explaining modeling and that salary is optional.
- **Footer:** Full-width **Continue** or **Run Simulation** button: **vertical linear gradient** teal → mint, white label, **ChevronRight**; salary step shows **“Run Simulation”** and may briefly show a disabled/gray state while navigating.

Overall the wizard reads as **calm, card-based, and progress-aware**—not a dense form.

### 2.3 Generating screen

- Centered **stack:** large title **“Generating Your Career Simulation”**, rotating **subtitle** line (analytic steps like “Building career trajectory model…”).
- **Dino game:** Full-width **chromeless mini-game** (Chrome-style runner); the whole screen is **pressable** to jump—playful wait state.
- **Progress:** Full-width **8px rounded track** with a **purple** fill whose width animates slowly (decorative, not tied to real API %).
- **Errors:** Centered message + underlined **“Go Back”** in brand purple.

### 2.4 Result screen (“Career Projection”)

- **Top bar:** Back chevron; centered column with small caps–style **“CAREER PROJECTION”** and a **pill badge**: **“{N} YEAR HORIZON”**.
- **Body:** Long **ScrollView** with generous vertical spacing between **sections** (each in a loose “card” region).

**Section-by-section UI:**

1. **Career outcome card** — Prominent summary: app icon, final role, company, **formatted total comp** (e.g. `$285K`), location, **star row** for satisfaction. Non-premium areas can show **blur + lock** affordances (`BlurView`, `Lock` icon) where implemented.
2. **Zoom-ins** — Section presents **horizontally scrollable** “device / surface” **preview tiles** (each zoom-in type has a **distinct miniature UI**: fake phone with status bar for “Random Tuesday”, skeleton email for “The Email”, calendar bars, chat bubbles, inbox rows). Titles, subtitles, **Maximize2** / arrow cues; tapping opens a **full-screen modal** styled like the real surface (email client, phone OS, calendar app, Slack-like thread, mail inbox split).
3. **Career timeline** — Heading **“Your Career Journey.”** Vertical **timeline rail**: each year has a **purple gradient dot** and **vertical connector line** to the next; right side shows **Year N**, salary **pill**, role title, company, optional one-line description.
4. **Global comparison** — **Icon-led sub-blocks** (trophy, trending, clock, dollar) for income, progression, hours, equity, geography; percentile-style stats and short explanatory copy. Premium gating similar to outcome (blur/lock + upgrade path).
5. **Regret moments** — Narrative list of **year-titled regrets** plus a **reflection** paragraph (tone: thoughtful, not judgmental).
6. **Societal impact** — Bulleted or listed **contributions** (products, people, industry) and longer **ripple / honest assessment** text.
7. **Alternate paths** — **“Compare paths”** style block: **GitBranch** badge text **“Branch at Year X”** or **“Alternate timeline”**; each path is a **wide tappable row** (~75% screen width in horizontal scroll) with cleaned label text. If **cooldown** applies for free users, row shows **timer text** and link-style copy to **mora+** for unlimited sims; chevron on the right.

**Modals:** Slide up or center as implemented per modal; they reuse realistic **OS chrome** (times, signal icons, notification stacks) so zoom-ins feel like **peeking into a day in the life** rather than abstract charts.

### 2.5 Legacy setup screen (`career-sim/setup.tsx`)

Single scroll: **section headers** with Lucide icons (Clock, Briefcase, Building2, DollarSign), **three-column-style time horizon chips** with colored icons (red target, teal rocket, purple sparkles), selected state with **colored underline dot**, then stacked inputs and a **purple gradient** primary CTA—denser than the wizard but same **family** of typography and icons.

---

## 3. Entry points

### 3.1 Simulate tab (`app/(tabs)/simulate.tsx`)

- **Carousel cards**: “Simulate Your Career” (active), plus “Simulate your Relationship” and “Simulate your Social Life” (coming soon).
- **Active career card**: Tracks Mixpanel (`Simulate - career-clicked`), haptics, then `router.push('/career-sim/01-time-horizon')`.
- **Recent simulations**: Loads up to 10 rows from `getCareerSimulations(user.id)`. Dropdown lets users reopen a saved run by writing `simulation_data` to AsyncStorage under `career_sim_<userId>_saved_<simId>` and navigating to `/career-sim/result` with `generated: 'true'` and `simulationKey`.
- **Visual language**: 3D-styled cards, white/light gradients, Lucide icons (Briefcase / Heart / Brain), teal–mint progress accents on later wizard screens.

### 3.2 Legacy single-screen setup (`app/career-sim/setup.tsx`)

- Combined time horizon + role + company + salary on one screen; prefills via `getCareerSimPrefill`.
- “Run” pushes to `/career-sim/generating` with **`pathType: 'stay'`** fixed. Useful for deep links or older entry; the tab flow uses the multi-step wizard instead.

### 3.3 Not the same feature: “Life simulation” (`app/simulate/*`)

- **New Life Simulation** (`simulate/new.tsx`, `simulate/index.tsx`) creates a **timeline** via `createTimeline` (profile-derived age, relationships, etc.). It navigates to `/simulate/[id]` and is a separate game-like life timeline—not the JSON career projection described here.

### 3.4 Not the same feature: Decision simulate (`app/decision/simulate/[id].tsx`)

- Uses **`generateTimelineSimulation`** and decision context from storage. It is decision-option simulation UI, not `CareerSimulation` JSON.

---

## 4. User flow (career wizard)

Routes live under `app/career-sim/`; stack layout in `app/career-sim/_layout.tsx` (headers off, slide animation, gestures disabled).

| Step | Screen | What the user does |
|------|--------|---------------------|
| 1 | `01-time-horizon.tsx` | Chooses **5, 10, or 15 years** (near-term / mid-career / long-term). Progress ~25%. |
| 2 | `01b-student-check.tsx` | Answers **Are you a student?** Progress ~33%. |
| 3a | `01c-student-details.tsx` | If student: grade, school, field of study (params flow forward). |
| 3b | `02-current-role.tsx` | If not student: **current role** (prefill from `getCareerSimPrefill`). Progress ~50%. |
| 4 | `03-company.tsx` | **Company** name. |
| 5 | `04-salary.tsx` | **Annual salary** (optional; empty defaults to `100000` for generation). Info copy explains industry-style modeling. **Run Simulation** → generating. Progress 100%. |

**Path type in the main wizard today:** `04-salary.tsx` passes **`pathType: 'stay'`** into generating. The AI still accepts `stay` | `switch` | `startup`; branching from the result screen can remap to `switch` or `startup` via `ComparePathsSection` + `handleAlternatePathPress` in `result.tsx`.

---

## 5. Generating screen (`app/career-sim/generating.tsx`)

- **Requires** signed-in user (`user.id`); otherwise shows an error.
- **Pipeline:**
  1. `buildCorePack(user.id, [user.id])` from `lib/relevance.ts` — rich text context from profile, relationships, careers, etc.
  2. Optional **base simulation** from AsyncStorage when `baseSimulationKey` is present (alternate-path runs).
  3. `generateCareerSimulation(corePack, { timeHorizon, pathType, currentRole, company, salary, alternateFrom? })` from `lib/ai.ts`.
  4. Writes JSON to AsyncStorage: `career_sim_<userId>_<timestamp>`.
  5. `router.replace` to `/career-sim/result` with params including `generated: 'true'`, `simulationKey`.

- **UX while waiting:** Title “Generating Your Career Simulation”, rotating **LOADING_STEPS** (profile → trajectory → trends → comp → milestones → global compare → finalize), a **decorative progress bar** (animated over ~60s), and an embedded **DinoGame** (tap to jump) as a lightweight distraction.

---

## 6. Result screen (`app/career-sim/result.tsx`)

### 6.1 Loading data

1. If `generated === 'true'` and `simulationKey` set: read AsyncStorage; validate `timeline` / `outcome` / `stats`.
2. **Auto-save**: If the key does **not** include `saved_`, after load the app calls `saveCareerSimulation` (Supabase). Student runs map `studying` → role and `school` → company for metadata.
3. If key contains `saved_`: can fall back to `getCareerSimulation(simId)` and rehydrate AsyncStorage.
4. Else: falls back to **`MOCK_SIMULATIONS`** keyed by `pathType` (`stay-current-10y`, `switch-faang-10y`, `startup-cto-10y`).

### 6.2 Scroll order (sections)

1. **CareerOutcomeCard** — final role, company, total comp, location, satisfaction stars. Respects **`isPremium`** (blur/lock patterns for non-premium where implemented).
2. **ZoomInCard** — grid driven by `simulation.zoomIns.cards` (The Email, Random Tuesday, Calendar Evolution, Team Feedback, Inbox Evolution). Taps open modals.
3. **CareerTimeline** — `timeline.milestones`.
4. **GlobalComparison** — income / progression / work-life / equity / geographic story. Premium-aware.
5. **RegretMoments** — `zoomIns.regretMoments` + `zoomIns.reflection`.
6. **SocietalImpact** — products, people influenced, industry contributions, ripple, honest assessment.
7. **ComparePathsSection** — `alternatePaths`; tap runs a **new** generation with `alternatePathLabel`, `alternatePathYear`, `alternatePathDecision`, optional `baseSimulationKey`, and a mapped `pathType`.

**Header:** “CAREER PROJECTION” + “{N} YEAR HORIZON” badge.

**Modals:** `TheEmailModal`, `RandomTuesdayModal`, `CalendarEvolutionModal`, `TeamFeedbackModal`, `InboxEvolutionModal` — each bound to the corresponding `zoomIns` subtree.

**Manual save:** `handleSave` duplicates the auto-save path for users who want explicit confirmation.

**New simulation:** Routes to `/career-sim/setup` (single-screen setup), not the tab wizard.

---

## 7. Data model (`lib/career-sim/types.ts`)

Top-level **`CareerSimulation`** includes:

- `id`, `timeHorizon`, `pathName`, `confidence`
- **`outcome`**: title, company, `totalComp`, location, satisfaction (0–5)
- **`stats`**: compensation (base/equity), growth (promotions, yearsToSenior, teamSize), workLife (hours, burnoutRisk, flexibility), skills (technical, leadership, expertise)
- **`timeline.milestones[]`**: year, title, company, salary, optional description
- **`globalComparison`**: income percentiles, career progression, work hours vs global, equity “lottery” copy, geographic breakdown, `globalReality` string
- **`zoomIns`**: `regretMoments`, `reflection`, `cards` (exactly five UI slots), `randomTuesday`, `theEmail`, `calendar` (current vs future week + stats), `teamFeedback` (Slack-style thread), `inbox` (current vs future + stats)
- **`societalImpact`**: string arrays + ripple + honest assessment
- **`alternatePaths[]`**: `id`, `label`, optional `year`, `decision`

The AI prompt’s JSON template is aligned with this shape so the UI can render without ad-hoc parsing.

---

## 8. AI prompting (`lib/ai.ts` — `generateCareerSimulation`)

### 8.1 Inputs

- **`corePack`**: output of `buildCorePack` — narrative/context about the user (profile, careers, relationships, etc.).
- **`options`**: `timeHorizon`, `pathType` (`stay` | `switch` | `startup`), `currentRole`, `company`, `salary`, optional **`alternateFrom`** `{ decisionLabel, decisionYear, decisionKey?, baseSimulation? }`.

### 8.2 System prompt (summary)

- Role: **career trajectory simulator**.
- **Hard constraint:** timeline and outcome must **anchor to `currentRole`** — Year 1 must be that role or an immediate, credible next step; no random jumps (e.g. App Developer → unrelated VP BD). Examples given for engineer / marketing / design ladders.
- **Style:** second person, specific numbers, realistic industry patterns, **no real brand names** (generic descriptors).
- **Completeness:** every JSON field must exist; nested objects (e.g. email `metadata`) must be filled.
- **Path semantics:** stay = same company trajectory; switch = new employer; startup = own or early-stage company.
- **`alternatePaths`:** 2–3 decision points **grounded in the generated timeline**, with `id`, `label`, `year`, `decision`.

### 8.3 User prompt (summary)

- Injects **corePack** and explicit bullets: starting role, company, salary, chosen path name, horizon.
- Repeats the “do not jump roles” warning.
- If **alternate timeline**: injects decision metadata + **JSON-stringified base milestones**; rules: pre-decision years match base; at decision year pivot; post-decision diverge realistically.

### 8.4 JSON spec in the prompt

- Large inline example JSON (outcome, stats, milestones, globalComparison, full `zoomIns`, societalImpact, alternatePaths).
- **Counts:** e.g. milestone count tied to horizon; minimum items for arrays (notifications, calendar Mon–Fri events, inbox emails, etc.); `zoomIns.cards` exactly five entries with fixed ids (`email`, `tuesday`, `calendar`, `feedback`, `inbox`).
- **Calendar rules:** `day` must be `Mon`–`Fri`; `color` hex; `duration` in minutes.
- **Output:** JSON only — no markdown fences (parser strips them if present).

### 8.5 Model call and validation

- **`callClaude`** with `responseFormat: { type: 'json_object' }`, temperature **0.6** on first pass, **`maxTokens: 16384`**.
- **`parseSimulationFromContent`**: trim, strip ``` fences, extract `{...}`, `JSON.parse`, fallback attempt to fix unquoted keys.
- **`isRoleAligned`**: tokenizes `currentRole` (length > 2) and checks first milestone title or outcome title contains a token; if false, **retry** same API with appended validation failure text and temperature **0.4**.

### 8.6 Dev mode

- If `DEV_MODE` is true, **no LLM**: returns `getSimulation(pathType, timeHorizon)` from `lib/career-sim/mockData`.

---

## 9. Profile prefill (`lib/careerSimPrefill.ts`)

`getCareerSimPrefill(userId)` resolves:

- **Role:** `core_json.primary_role` → first `career_entries[].title` → parsed onboarding `career` string (“X at Y” → X).
- **Company:** first career entry company → “X at Y” → Y.
- **Salary:** from profile when available (may be null).

Used by `02-current-role` and the combined `setup` screen.

---

## 10. Persistence

### 10.1 Supabase (`career_simulations`)

Migration `supabase/migrations/20260131000000_create_career_simulations.sql`:

- Columns: `user_id`, `time_horizon` (5|10|15), `path_type` (stay|switch|startup), `role_title`, `company`, `salary`, **`simulation_data` JSONB**, timestamps.
- RLS: per-user select/insert/update/delete.

`saveCareerSimulation` in `lib/storage.ts` inserts a row and attempts **`completeOnboardingTask(userId, 'simulate_career')`**.

### 10.2 AsyncStorage

- **Fresh runs:** `career_sim_<userId>_<timestamp>` until saved / reopened.
- **Reopen saved:** `career_sim_<userId>_saved_<uuid>`.

### 10.3 Branch metadata

Alternate runs can embed `alternatePathLabel` inside `simulation_data` for display naming in recent lists (`getSimulationName` on the tab).

---

## 11. Analytics

Simulate tab tracks Mixpanel events such as `Simulate - career-clicked`, `Simulate - relationships-clicked`, `Simulate - decisions-clicked`, and `Simulate - recent-simulation-loaded` with simulation id and path/time metadata.

---

## 12. Premium and credits

- **Result UI** passes `isPremium` from `useTwin()` into outcome, zoom-ins, and global comparison components for gating/blur.
- **Life-sim** path (`simulate/new`) references simulation credits and `INSUFFICIENT_CREDITS` → premium; the **career-sim generating** screen does not debit credits in the same file—credits table exists for broader simulation features (`simulation_credits` migration). Treat premium/credits as product-specific when extending career sim.

---

## 13. Implementation map (quick reference)

| Concern | Location |
|--------|----------|
| Tab hub + recent list | `app/(tabs)/simulate.tsx` |
| Wizard steps | `app/career-sim/01-time-horizon.tsx` … `04-salary.tsx`, `01b`, `01c` |
| Generate + Dino loading | `app/career-sim/generating.tsx` |
| Report + modals + branch | `app/career-sim/result.tsx` |
| LLM + prompts + retry | `lib/ai.ts` → `generateCareerSimulation` |
| User context string | `lib/relevance.ts` → `buildCorePack` |
| Types | `lib/career-sim/types.ts` |
| Dev fixtures | `lib/career-sim/mockData.ts` |
| Prefill | `lib/careerSimPrefill.ts` |
| DB API | `lib/storage.ts` → `saveCareerSimulation`, `getCareerSimulations`, `getCareerSimulation` |
| UI building blocks | `components/career-sim/*`, `modals/career-sim/*` |

---

## 14. Known product/tech notes

1. **Main wizard path type** is currently hard-coded to **`stay`** at salary → generating; “switch” and “startup” are primarily exercised via **alternate path** navigation from the result screen or legacy mocks.
2. **Two setups** exist: multi-step wizard (tab) vs `career-sim/setup` (single page); “New simulation” on result goes to the latter.
3. **Schema discipline** is enforced in the prompt; malformed JSON is mitigated by parsing heuristics and a single role-alignment retry.
4. For **field-level** JSON requirements used by designers or QA, see also `CAREER_SIMULATION_DATA_REQUIREMENTS.md` in the repo if present.

---

*Document generated from the codebase structure and prompts as of the repository state when authored.*
