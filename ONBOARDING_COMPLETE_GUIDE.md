# Complete Onboarding Flow Documentation

## Table of Contents
1. [Sign Up Process](#sign-up-process)
2. [Onboarding Flow Overview](#onboarding-flow-overview)
3. [Manual Onboarding Flow](#manual-onboarding-flow)
4. [AI Voice Onboarding Flow](#ai-voice-onboarding-flow)
5. [Profile Data Structure](#profile-data-structure)
6. [Core JSON Structure](#core-json-structure)
7. [Database Schema](#database-schema)
8. [Profile Creation Process](#profile-creation-process)

---

## Sign Up Process

### 1. Entry Point
- **File**: `app/auth/index.tsx`
- **Flow**: User enters email → password → authentication

### 2. Sign Up Methods

#### A. Email/Password Sign Up
**Location**: `store/useAuth.ts` → `signUp()`

**Process**:
1. User enters email and password on auth screen
2. System attempts sign-in first (to handle existing users)
3. If sign-in fails, attempts sign-up
4. On successful sign-up:
   - Creates Supabase auth user
   - Assigns A/B test group (A or B)
   - Tracks sign-up event in Mixpanel
   - Routes to `/onboarding/choose-method`

**Code Flow**:
```typescript
// app/auth/index.tsx (lines 132-216)
async function handleAuth() {
  // Try sign in first
  try {
    await signIn(email, password);
    router.replace('/');
  } catch (signInError) {
    // If fails, try sign up
    await signUp(email, password);
    router.replace('/onboarding/choose-method');
  }
}
```

#### B. Apple Sign In
**Location**: `store/useAuth.ts` → `appleSignIn()`

**Process**:
1. User taps "Continue with Apple"
2. Apple authentication flow completes
3. System checks if profile exists (new vs existing user)
4. For new users:
   - Assigns A/B test group
   - Saves Apple-provided name to profile (if available)
   - Routes to onboarding
5. For existing users:
   - Routes to home

**Special Handling**:
- Apple only provides full name on first sign-in
- Name is saved to both user metadata and profile `first_name` field
- If name provided, skips name step in onboarding

#### C. Phone Sign Up
**Location**: `store/useAuth.ts` → `verifyPhoneOtp()`

**Process**:
1. User enters phone number
2. System sends OTP via SMS
3. User enters OTP code
4. On verification:
   - Checks if profile exists (new vs existing)
   - For new users: assigns A/B test group
   - Routes accordingly

### 3. A/B Test Group Assignment
**Location**: `lib/storage.ts` → `assignABTestGroup()`

**Logic**:
- Balances users between groups A and B
- If equal counts, alternates based on last assignment
- Stored in `profiles.ab_test_group`
- Tracked in Mixpanel as user property

---

## Onboarding Flow Overview

### Entry Point
**File**: `app/index.tsx`

**Routing Logic**:
1. Check if user has seen welcome screen
2. If not authenticated → `/auth`
3. If authenticated but onboarding incomplete → `/onboarding/choose-method`
4. If onboarding complete → `/(tabs)/home`

### Onboarding Completion Check
**Location**: `store/useTwin.ts` → `checkOnboardingStatus()`

**Method**: `lib/storage.ts` → `isOnboardingComplete()`
- Checks `profiles.core_json.onboarding_complete === true`

---

## Manual Onboarding Flow

### Step 0: Choose Method Screen
**File**: `app/onboarding/choose-method.tsx`

**Purpose**: Currently just shows intro text, then routes to manual onboarding

**Flow**: 
- Displays typewriter animation with intro text
- User clicks "Continue"
- Routes to `/onboarding/00-name`

### Step 1: Name
**File**: `app/onboarding/00-name.tsx`

**Data Collected**:
- `first_name` (stored in `profiles.first_name` column)

**Special Cases**:
- Apple sign-in users: Auto-populates from Apple metadata, skips step
- Loads existing data if user returns

**Save Method**: `updateProfileFields(userId, { first_name })`

### Step 2: Birth Year
**File**: `app/onboarding/00-birth-year.tsx`

**Data Collected**:
- Birth year (stored in `core_json.onboarding_responses['birth-year']`)

**UI**: Dropdown picker with years 1950-2012

**Save Method**: `saveOnboardingResponse(userId, 'birth-year', year)`

### Step 3: Values (Multi-select)
**File**: `app/onboarding/01-values-multiselect.tsx`

**Data Collected**:
- Selected values array (stored in `profiles.values_json`)

**Save Method**: `upsertProfileCore()` with `values_json` array

### Step 4: Current Life Situation
**File**: `app/onboarding/01-now.tsx`

**Data Collected**:
- Free-form text about current situation
- Stored in `core_json.onboarding_responses['01-now']`

**Save Method**: `saveOnboardingResponse(userId, '01-now', text)`

### Step 5: Life Journey
**File**: `app/onboarding/02-path.tsx`

**Data Collected**:
- Free-form text about life journey/path
- Stored in `core_json.onboarding_responses['02-path']`

**Save Method**: `saveOnboardingResponse(userId, '02-path', text)`

**Next Step**: Routes to `/relationships/add?onboarding=true`

### Additional Steps (in order):
- **03-values**: Additional values questions
- **04-style**: Decision-making style
- **05-day**: Typical day routine
- **06-stress**: Stress handling
- **07-clarifier**: Additional clarifications
- **interests**: Interest preferences
- **politics**: Political views
- **challenges**: Life challenges

### Completion
**File**: `app/onboarding/complete.tsx`

**Process**:
1. Calls `completeOnboarding()` to mark `onboarding_complete: true`
2. Generates twin code if not exists
3. Shows completion screen with options:
   - "Decide for me" - Creates first decision
   - "Simulate your life" - Routes to simulation

---

## AI Voice Onboarding Flow

### Entry Point
**File**: `app/ai-onboarding/call.tsx`

### Pre-Call Screen
1. Shows "Ready to chat with Sol?" message
2. User must enable microphone permission
3. Once permission granted, shows "Start Conversation" button

### Active Call Screen
**Features**:
- Real-time voice conversation with AI agent "Sol"
- Live transcript display (last 3 messages)
- Visual status indicators (listening/speaking/connecting)
- Animated orb visualization

**Questions Asked** (in order):
1. First name
2. Current life situation
3. Life journey (validates minimum 50 words)
4. Stress handling
5. Hometown
6. College/University
7. Important relationships

**Data Extraction**:
- Extracts data from user responses
- Stores in local state during conversation
- Validates completion before allowing review

### Review Screen
**File**: `app/ai-onboarding/review.tsx`

**Process**:
1. Displays all collected data in editable form
2. Extracts relationships from conversation text using AI
3. User can edit any field
4. User selects which relationships to save
5. On save:
   - Saves structured fields (`first_name`, `hometown`, `university`)
   - Saves narrative responses to `core_json.onboarding_responses`
   - Saves relationships to `relationships` table
   - Marks onboarding complete
   - Routes to `/onboarding/complete`

**Save Method**: 
```typescript
// Save structured fields
await updateProfileFields(userId, {
  first_name, hometown, university
});

// Save narrative responses
await saveOnboardingResponse(userId, '01-now', lifeSituation);
await saveOnboardingResponse(userId, '02-path', lifeJourney);
await saveOnboardingResponse(userId, '06-stress', stressHandling);

// Save relationships
await upsertRelationships(userId, selectedRelationships);

// Mark complete
await completeOnboarding(userId, {...});
```

---

## Profile Data Structure

### Database Table: `profiles`

**Primary Key**: `user_id` (UUID, references `auth.users.id`)

**Columns**:

#### Structured Fields
- `first_name` (text, nullable)
- `hometown` (text, nullable)
- `family_relationship` (enum: 'supportive' | 'strained' | 'mixed' | 'unknown', nullable)
- `university` (text, nullable)
- `major` (text, nullable)
- `career_entrypoint` (text, nullable)
- `current_location` (text, nullable)
- `net_worth` (text, nullable)
- `political_views` (text, nullable)

#### JSON Fields
- `core_json` (jsonb) - Flexible key facts and onboarding responses
- `values_json` (jsonb array) - Array of core values like `["freedom", "growth", "relationships"]`

#### Metadata Fields
- `twin_code` (text, nullable) - Unique 6-digit code for sharing
- `is_premium` (boolean, default: false)
- `ab_test_group` ('A' | 'B' | null)
- `simulation_credits` (number, nullable, default: 5)

#### Narrative Fields
- `narrative_summary` (text, nullable) - 3-6 sentence summary of user
- `narrative_embedding` (vector(1536), nullable) - Embedding for semantic search

#### Timestamps
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

## Core JSON Structure

### Type Definition
**Location**: `types/database.ts` → `CoreJsonData`

```typescript
export interface CoreJsonData {
  age_range?: string;
  city?: string;
  country?: string;
  primary_role?: string;
  job_sentiment?: string;
  employment_type?: string;
  side_projects?: string;
  motivation?: string;
  onboarding_responses?: {
    [step: string]: string;
  };
  onboarding_complete?: boolean;
  [key: string]: any; // Flexible for additional fields
}
```

### Onboarding Responses Structure

The `onboarding_responses` object stores responses from each onboarding step:

```json
{
  "onboarding_responses": {
    "birth-year": "1990",
    "01-now": "I'm a software engineer at a tech startup...",
    "02-path": "I grew up in a small town, went to college...",
    "01-values": "freedom, growth, relationships",
    "03-values": "...",
    "04-style": "...",
    "05-day": "...",
    "06-stress": "...",
    "07-clarifier": "...",
    "interests": "...",
    "politics": "...",
    "challenges": "..."
  },
  "onboarding_complete": true,
  "age_range": "30-35",
  "city": "San Francisco",
  "country": "USA",
  "primary_role": "Software Engineer",
  "job_sentiment": "satisfied",
  "employment_type": "full-time"
}
```

### Example Complete Core JSON

```json
{
  "age_range": "30-35",
  "city": "San Francisco",
  "country": "USA",
  "primary_role": "Software Engineer",
  "job_sentiment": "satisfied",
  "employment_type": "full-time",
  "side_projects": "Building a side project",
  "motivation": "Want to build something meaningful",
  "onboarding_responses": {
    "birth-year": "1990",
    "01-now": "I'm a software engineer at a tech startup, recently moved to SF...",
    "02-path": "I grew up in a small town, went to college for CS, landed first job...",
    "01-values": "freedom, growth",
    "03-values": "creativity, autonomy",
    "04-style": "analytical",
    "05-day": "Wake up at 7am, work 9-5, gym after work...",
    "06-stress": "I handle stress by going for runs and talking to friends...",
    "07-clarifier": "...",
    "interests": "...",
    "politics": "moderate",
    "challenges": "..."
  },
  "onboarding_complete": true
}
```

---

## Database Schema

### Profiles Table
**Migration**: `supabase/migrations/20251030205352_create_twin_schema.sql`

```sql
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hometown text,
  family_relationship text CHECK (family_relationship IN ('supportive','strained','mixed','unknown')),
  university text,
  major text,
  career_entrypoint text,
  core_json jsonb DEFAULT '{}'::jsonb,
  values_json jsonb DEFAULT '[]'::jsonb,
  narrative_summary text,
  narrative_embedding vector(1536),
  first_name text,
  current_location text,
  net_worth text,
  political_views text,
  twin_code text,
  is_premium boolean DEFAULT false,
  ab_test_group text CHECK (ab_test_group IN ('A', 'B')),
  simulation_credits integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Relationships Table
```sql
CREATE TABLE relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship_type text NOT NULL,
  years_known numeric,
  contact_frequency text,
  influence numeric CHECK (influence >= 0 AND influence <= 1),
  location text,
  created_at timestamptz DEFAULT now()
);
```

---

## Profile Creation Process

### Initial Profile Creation

**Trigger**: On first data save during onboarding

**Process**:
1. User completes sign-up → Auth user created in Supabase
2. First onboarding step saves data → Profile row created/updated
3. A/B test group assigned (if not already)
4. Twin code generated when onboarding completes

### Profile Update Functions

#### `updateProfileFields()`
**Location**: `lib/storage.ts`

**Purpose**: Update structured profile fields while preserving `core_json` and `values_json`

**Usage**:
```typescript
await updateProfileFields(userId, {
  first_name: "John",
  hometown: "New York",
  university: "MIT"
});
```

#### `saveOnboardingResponse()`
**Location**: `lib/storage.ts`

**Purpose**: Save onboarding step responses to `core_json.onboarding_responses`

**Usage**:
```typescript
await saveOnboardingResponse(userId, '01-now', "I'm a software engineer...");
```

**Process**:
1. Gets existing profile
2. Preserves existing `core_json` and `values_json`
3. Updates `core_json.onboarding_responses[step] = response`
4. Upserts profile with updated `core_json`

#### `upsertProfileCore()`
**Location**: `lib/storage.ts`

**Purpose**: Update core JSON, values JSON, narrative summary, and embedding

**Usage**:
```typescript
await upsertProfileCore(
  userId,
  coreJson,      // CoreJsonData object
  valuesJson,    // string[] array
  narrativeSummary, // string
  embedding      // number[] (1536 dimensions)
);
```

#### `completeOnboarding()`
**Location**: `lib/storage.ts`

**Purpose**: Mark onboarding as complete and finalize profile

**Process**:
1. Updates `core_json.onboarding_complete = true`
2. Updates structured fields if provided
3. Ensures twin code is generated
4. Returns updated profile

**Usage**:
```typescript
await completeOnboarding(userId, {
  first_name: "John",
  hometown: "New York",
  university: "MIT"
});
```

### Twin Code Generation

**Location**: `lib/storage.ts` → `generateUniqueTwinCode()`

**Process**:
1. Calls database function `generate_unique_twin_code()`
2. Updates profile with generated code
3. Verifies code was saved
4. Returns code

**Auto-generation**: Triggered when:
- Onboarding completes (if not exists)
- First onboarding response saved (if not exists)

---

## Data Flow Summary

### Sign Up → Profile Creation Flow

```
1. User signs up (email/password, Apple, or Phone)
   ↓
2. Supabase auth user created
   ↓
3. A/B test group assigned
   ↓
4. User routed to onboarding
   ↓
5. First onboarding step saves data
   ↓
6. Profile row created/upserted in database
   ↓
7. Subsequent steps update core_json.onboarding_responses
   ↓
8. Onboarding completion:
   - Sets onboarding_complete: true
   - Generates twin_code
   - Finalizes profile
   ↓
9. User routed to completion screen
```

### Profile Data Storage Strategy

**Structured Data** → Direct columns (`first_name`, `hometown`, etc.)
**Narrative Data** → `core_json.onboarding_responses[step]`
**Values** → `values_json` array
**Relationships** → Separate `relationships` table
**Career** → Separate `career_entries` table

### Key Functions Reference

| Function | Purpose | Location |
|----------|---------|----------|
| `signUp()` | Create auth user | `store/useAuth.ts` |
| `assignABTestGroup()` | Assign A/B test | `lib/storage.ts` |
| `updateProfileFields()` | Update structured fields | `lib/storage.ts` |
| `saveOnboardingResponse()` | Save step response | `lib/storage.ts` |
| `upsertProfileCore()` | Update core JSON | `lib/storage.ts` |
| `completeOnboarding()` | Mark complete | `lib/storage.ts` |
| `generateUniqueTwinCode()` | Generate twin code | `lib/storage.ts` |
| `isOnboardingComplete()` | Check completion | `lib/storage.ts` |

---

## Example: Complete Profile Record

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "first_name": "John",
  "hometown": "New York",
  "university": "MIT",
  "major": "Computer Science",
  "current_location": "San Francisco",
  "net_worth": "100000-500000",
  "political_views": "moderate",
  "family_relationship": "supportive",
  "twin_code": "123456",
  "is_premium": false,
  "ab_test_group": "A",
  "simulation_credits": 5,
  "values_json": ["freedom", "growth", "relationships"],
  "core_json": {
    "age_range": "30-35",
    "city": "San Francisco",
    "country": "USA",
    "primary_role": "Software Engineer",
    "job_sentiment": "satisfied",
    "employment_type": "full-time",
    "onboarding_responses": {
      "birth-year": "1990",
      "01-now": "I'm a software engineer...",
      "02-path": "I grew up in...",
      "06-stress": "I handle stress by..."
    },
    "onboarding_complete": true
  },
  "narrative_summary": "John is a 30-year-old software engineer...",
  "narrative_embedding": [0.123, 0.456, ...], // 1536 dimensions
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T01:00:00Z"
}
```

---

## Notes

1. **Profile Creation**: Profile row is created lazily on first data save, not immediately on sign-up
2. **Data Preservation**: All update functions preserve existing `core_json` and `values_json` data
3. **Twin Code**: Generated automatically when onboarding completes (if not already exists)
4. **A/B Testing**: Assigned on sign-up, balanced between groups A and B
5. **Onboarding Completion**: Checked via `core_json.onboarding_complete` flag
6. **Apple Sign-In**: Auto-populates name and may skip name step
7. **Phone Sign-In**: Checks if profile exists to determine new vs existing user






