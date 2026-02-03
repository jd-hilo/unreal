/*
  # Decision Chats Schema
  
  ## Description
  Creates a table to store chat conversations between users and the Architect about specific decisions.
  Each decision can have one chat session with multiple messages stored as JSONB.
  
  ## Changes
  - Create decision_chats table with messages stored as JSONB array
  - Add indexes for performance
  - Add RLS policies for security
  
  ## Security
  - RLS policies ensure users can only view/manage their own decision chats
*/

-- Create decision_chats table
CREATE TABLE IF NOT EXISTS decision_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(decision_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_chats_decision_id ON decision_chats(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_chats_user_id ON decision_chats(user_id);

-- Enable RLS
ALTER TABLE decision_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own decision chats"
  ON decision_chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decision chats"
  ON decision_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decision chats"
  ON decision_chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decision chats"
  ON decision_chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE decision_chats IS 'Stores chat conversations between users and the Architect about specific decisions';
COMMENT ON COLUMN decision_chats.messages IS 'Array of message objects: [{role: "user"|"architect", content: string, timestamp: number}]';
