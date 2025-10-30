/*
  # Twin App - Core Schema with pgvector

  ## Overview
  Creates the complete database schema for the Twin decision-making and life simulation app.
  Uses pgvector for semantic search over user narratives and a lean data model focused on
  key facts + narrative summaries.

  ## New Tables
  
  ### `profiles`
  Core user profile with lean structured fields and narrative summary with embeddings:
  - `user_id` (uuid, FK to auth.users) - Primary key
  - `hometown` (text) - Where user grew up
  - `family_relationship` (text) - supportive/strained/mixed/unknown
  - `university` (text) - College/university attended
  - `major` (text) - Field of study
  - `career_entrypoint` (text) - First significant role
  - `core_json` (jsonb) - Flexible key facts: age_range, city, country, role, job_sentiment, etc.
  - `values_json` (jsonb) - Array of core values like ["freedom","growth","relationships"]
  - `narrative_summary` (text) - Compact 3-6 sentence summary of who they are
  - `narrative_embedding` (vector(1536)) - Embedding for semantic search (text-embedding-3-small)
  - `created_at`, `updated_at` timestamps

  ### `relationships`
  Tracks important people with duration and frequency:
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Owner
  - `name` (text) - Person's name or label
  - `relationship_type` (text) - partner, friend, family, mentor, coworker, boss, etc.
  - `years_known` (numeric) - Duration of relationship, null if unknown
  - `contact_frequency` (text) - daily/weekly/monthly/rarely/unknown
  - `influence` (numeric) - 0 to 1 scale of decision influence
  - `location` (text) - Where they are based
  - `created_at` timestamp

  ### `career_entries`
  Professional timeline with satisfaction tracking:
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Owner
  - `title` (text) - Job title
  - `company` (text) - Organization name
  - `start_date` (date) - When started
  - `end_date` (date) - When ended, null if current
  - `satisfaction` (int) - 1 to 5 rating
  - `notes` (text) - Additional context
  - `source` (text) - 'manual' or 'linkedin'
  - `created_at` timestamp

  ### `decisions`
  User decisions with AI predictions and probabilities:
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Owner
  - `question` (text) - The decision question
  - `options` (jsonb) - Array of option strings
  - `context_summary` (text) - Optional additional context
  - `prediction` (jsonb) - AI prediction with probabilities, rationale, uncertainty
  - `status` (text) - draft/pending/completed
  - `created_at`, `updated_at` timestamps

  ### `simulations`
  Outcome simulations for decisions (premium feature):
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Owner
  - `decision_id` (uuid, FK) - Related decision
  - `scenarios` (jsonb) - Outcome projections for each option
  - `summary` (text) - Overall simulation notes
  - `created_at` timestamp

  ### `what_if`
  Counterfactual life trajectory analysis:
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Owner
  - `counterfactual_type` (text) - education/move/job/relationship/etc.
  - `payload` (jsonb) - Original vs alternate details
  - `metrics` (jsonb) - Happiness/money/relationship/freedom/growth comparisons
  - `summary` (text) - Narrative comparison
  - `created_at` timestamp

  ### `journals`
  Brief daily mood and text entries:
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Owner
  - `mood` (int) - 0 to 5 scale
  - `text` (text) - Optional journal entry
  - `created_at` timestamp

  ## Security
  - Enable RLS on all tables
  - Policies restrict access to auth.uid() = user_id
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Indexes
  - Vector similarity search index on narrative_embedding using IVFFlat
  - Standard indexes on foreign keys and frequently queried columns

  ## Important Notes
  - Using 1536-dimensional embeddings (text-embedding-3-small) to stay within pgvector limits
  - IVFFlat index supports efficient similarity search at scale
  - All timestamps use timestamptz for proper timezone handling
  - Updated_at triggers automatically maintain modification timestamps
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles: Lean columns + narrative summary + embedding
CREATE TABLE IF NOT EXISTS profiles (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relationships: with years known & frequency
CREATE TABLE IF NOT EXISTS relationships (
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

-- Career timeline
CREATE TABLE IF NOT EXISTS career_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text,
  start_date date,
  end_date date,
  satisfaction int CHECK (satisfaction >= 1 AND satisfaction <= 5),
  notes text,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'linkedin')),
  created_at timestamptz DEFAULT now()
);

-- Decisions (input, options, prediction)
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  context_summary text,
  prediction jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft','pending','completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Simulations (results for a decision)
CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES decisions(id) ON DELETE CASCADE,
  scenarios jsonb DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- What-If scenarios
CREATE TABLE IF NOT EXISTS what_if (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterfactual_type text,
  payload jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- Journals (optional, brief)
CREATE TABLE IF NOT EXISTS journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood int CHECK (mood >= 0 AND mood <= 5),
  text text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_career_entries_user_id ON career_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_decision_id ON simulations(decision_id);
CREATE INDEX IF NOT EXISTS idx_what_if_user_id ON what_if(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_user_id ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_created_at ON journals(user_id, created_at DESC);

-- Create IVFFlat index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_profiles_narrative_embedding 
  ON profiles USING ivfflat (narrative_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE what_if ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for relationships
CREATE POLICY "Users can view own relationships"
  ON relationships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relationships"
  ON relationships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationships"
  ON relationships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationships"
  ON relationships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for career_entries
CREATE POLICY "Users can view own career entries"
  ON career_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career entries"
  ON career_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career entries"
  ON career_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own career entries"
  ON career_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for decisions
CREATE POLICY "Users can view own decisions"
  ON decisions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decisions"
  ON decisions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decisions"
  ON decisions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own decisions"
  ON decisions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for simulations
CREATE POLICY "Users can view own simulations"
  ON simulations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
  ON simulations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
  ON simulations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON simulations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for what_if
CREATE POLICY "Users can view own what-if scenarios"
  ON what_if FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own what-if scenarios"
  ON what_if FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own what-if scenarios"
  ON what_if FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own what-if scenarios"
  ON what_if FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for journals
CREATE POLICY "Users can view own journals"
  ON journals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journals"
  ON journals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journals"
  ON journals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journals"
  ON journals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
