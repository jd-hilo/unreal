/*
  # Create Compatibility Tests Table

  ## Changes
  - Create compatibility_tests table to store compatibility test results
  - Add indexes for performance
  - Add RLS policies for security

  ## Security
  - RLS policies ensure users can only view compatibility tests they're involved in
  - Users can create compatibility tests involving themselves
*/

-- Compatibility tests table
CREATE TABLE IF NOT EXISTS compatibility_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compatibility_score numeric NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id_1, user_id_2, created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compatibility_tests_user_id_1 ON compatibility_tests(user_id_1);
CREATE INDEX IF NOT EXISTS idx_compatibility_tests_user_id_2 ON compatibility_tests(user_id_2);
CREATE INDEX IF NOT EXISTS idx_compatibility_tests_created_at ON compatibility_tests(created_at DESC);

-- Enable RLS
ALTER TABLE compatibility_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compatibility_tests
-- Users can view compatibility tests they're involved in
CREATE POLICY "Users can view compatibility tests they're involved with"
  ON compatibility_tests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id_1 
    OR auth.uid() = user_id_2
  );

-- Users can create compatibility tests involving themselves
CREATE POLICY "Users can create compatibility tests"
  ON compatibility_tests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id_1 
    OR auth.uid() = user_id_2
  );





