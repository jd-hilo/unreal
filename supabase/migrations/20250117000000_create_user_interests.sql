/*
  # User Interests Table (Multi-Select)

  Creates a table to store user's multi-select interests (food, music artists, movies, fashion, etc.)
  This replaces the "This or That" format with a simpler multi-select approach.
*/

-- User Interests: Multi-select interests with optional external API IDs
CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_name text NOT NULL,
  item_id text, -- External API ID (e.g., TMDB movie ID, Spotify artist ID)
  item_metadata jsonb, -- Additional data like images, descriptions, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category, item_name) -- Prevent duplicate selections
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_interests_category ON user_interests(category);
CREATE INDEX IF NOT EXISTS idx_user_interests_item_name ON user_interests(item_name);

-- Enable Row Level Security
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_interests
-- Users can only read their own interests
CREATE POLICY "Users can view their own interests"
  ON user_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own interests
CREATE POLICY "Users can insert their own interests"
  ON user_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own interests
CREATE POLICY "Users can update their own interests"
  ON user_interests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interests
CREATE POLICY "Users can delete their own interests"
  ON user_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


