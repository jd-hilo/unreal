# Career simulation — UI only

What users **see and touch** for **Simulate Your Career** (`app/(tabs)/simulate.tsx` → `app/career-sim/*`). Styling uses `constants/Theme` (`Colors`, `Fonts`): light background, dark primary text, purple gradients for premium accents, secondary type for labels.

---

## 1. Simulate tab

- **Header (left):** Large **“Simulate”** title next to a **Zap** icon; subtitle **“Experience possible futures.”**
- **Header (right, signed in):** Pill-shaped **“Recent”** control with a soft teal-to-lavender gradient fill, thin border, small **ChevronDown** that rotates when open. Tapping toggles a **floating dropdown** over a full-screen dim overlay; inside, a scrollable list of past runs (title = branch name or “Career Sim”, horizon, role `@` company, relative date). Empty state: “No recent simulations.”
- **Main area:** **Horizontal paging carousel** (one card per “simulation type”). Each card is a **tall white tile** with faux **3D bevels** (top/left/right/bottom edge strips), inner **white → very light violet** vertical gradient, soft shadow.
  - **Career (active):** Briefcase in a **rounded icon well** with a pink–purple wash; title **“Simulate Your Career”** (line break in title); body copy about cloning the twin; bottom row = **“Start Simulation”** label + circular **chevron** on a filled button. Tappable.
  - **Relationship / Social:** Heart and Brain icons with red/pink and blue/purple washes; **“Coming Soon”**; controls **disabled** (muted text and button).
- **Below carousel:** **Pagination dots** (active dot emphasized vs gray inactive).
- **Motion:** Tab focus runs a **fade-in** on the main container; swiping cards triggers **selection haptics**.

---

## 2. Career wizard (multi-step)

Shared across `01-time-horizon`, `01b-student-check`, `01c-student-details`, `02-current-role`, `03-company`, `04-salary`:

- **Layout:** Full-screen **SafeAreaView**, dark status bar, **KeyboardAvoidingView** on forms.
- **Top bar:** Back **chevron** in a light circular hit target; beside it a **thin ProgressBar** (teal `#25729f` → mint `#62edb9`, ~4px height) whose fill steps through the flow (roughly 25% → 33% → 50% → 100%).
- **Content:** Scrollable column with **section title** and **subtitle**; choices are **large rounded cards** with the same 3D edge motif as the Simulate tab for time horizon, or simpler bordered tiles for yes/no (student).
- **Inputs:** Role / company use **`Input`** with icons (Briefcase, Building2); salary uses a **numeric** field with **DollarSign** in an icon rail and an **info box** (modeling note; salary optional).
- **Footer:** Full-width **Continue** or **Run Simulation**: **vertical linear gradient** teal → mint, white label, **ChevronRight**; salary step may briefly show disabled gray while navigating.

Overall: **calm, card-based, progress-aware**—not a dense form.

---

## 3. Generating screen

- Centered **stack:** title **“Generating Your Career Simulation”**, rotating **subtitle** (e.g. “Building career trajectory model…”).
- **Dino game:** Full-width **chromeless runner**; screen is **pressable** to jump.
- **Progress:** Full-width **8px** rounded track, **purple** fill animating slowly (decorative).
- **Errors:** Centered message + underlined **“Go Back”** in brand purple.

---

## 4. Result screen (“Career Projection”)

- **Top bar:** Back chevron; centered **“CAREER PROJECTION”** and a **pill**: **“{N} YEAR HORIZON”**.
- **Body:** Long **ScrollView**, generous spacing between sections.

**Blocks (in order):**

1. **Outcome card** — App icon, final role, company, **formatted comp** (e.g. `$285K`), location, **star row**. Non-premium: **blur + lock** where implemented.
2. **Zoom-ins** — **Horizontal scroll** of **preview tiles** (mini phone, skeleton email, calendar, chat, inbox). Titles, **Maximize2** / arrows; tap → **full-screen modal** (realistic OS / app chrome).
3. **Timeline** — **“Your Career Journey.”** Vertical rail: **purple gradient dots** + connector lines; **Year N**, salary **pill**, title, company, optional description.
4. **Global comparison** — **Icon-led** blocks (trophy, trending, clock, dollar); percentiles + short copy; premium blur/lock + upgrade where applicable.
5. **Regret moments** — Year-labeled items + **reflection** paragraph.
6. **Societal impact** — Lists + **ripple / honest assessment** prose.
7. **Alternate paths** — **GitBranch** badge (“Branch at Year X” / “Alternate timeline”); **wide tappable rows** in horizontal scroll; cooldown shows **timer** + **mora+** link; chevron.

**Modals:** Realistic **status bar, signal, notifications** so zoom-ins feel like **day-in-the-life** surfaces, not abstract charts.

---

## 5. Legacy setup (`career-sim/setup.tsx`)

Single scroll: **section headers** + Lucide icons (Clock, Briefcase, Building2, DollarSign); **three horizon chips** with colored icons (red target, teal rocket, purple sparkles) and **selected dot**; stacked inputs; **purple gradient** primary CTA—denser than the wizard, same visual family.
