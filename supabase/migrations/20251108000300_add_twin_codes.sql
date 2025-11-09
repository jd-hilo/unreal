/*
  # Add Twin Code Sharing

  ## Changes
  - Add twin_code column to profiles table for sharing digital twins
  - Create decision_participants table to track which twins are added to decisions
  - Add function to generate unique 6-digit codes
  - Add RLS policies for decision_participants
  - Add indexes for performance

  ## Security
  - RLS policies ensure users can only view participants for their own decisions
  - Twin codes are unique and randomly generated
*/

-- Add twin_code column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twin_code text UNIQUE;

-- Create index on twin_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_twin_code ON profiles(twin_code);

-- Function to generate unique 6-digit code
CREATE OR REPLACE FUNCTION generate_unique_twin_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate random 6-digit code
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE twin_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Decision participants table
CREATE TABLE IF NOT EXISTS decision_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  participant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(decision_id, participant_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_participants_decision_id ON decision_participants(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_participants_participant_user_id ON decision_participants(participant_user_id);
CREATE INDEX IF NOT EXISTS idx_decision_participants_added_by_user_id ON decision_participants(added_by_user_id);

-- Enable RLS
ALTER TABLE decision_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decision_participants
-- Users can view participants for decisions they own or are participating in
CREATE POLICY "Users can view decision participants they're involved with"
  ON decision_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = added_by_user_id 
    OR auth.uid() = participant_user_id
    OR EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_participants.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can add participants to their own decisions
CREATE POLICY "Users can add participants to own decisions"
  ON decision_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = added_by_user_id
    AND EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can remove participants from their own decisions
CREATE POLICY "Users can delete participants from own decisions"
  ON decision_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_participants.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Allow users to view other profiles by twin_code (for adding to decisions)
CREATE POLICY "Users can view profiles by twin code"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

