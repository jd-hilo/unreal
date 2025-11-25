/*
  # User Recommendations Table

  Creates a table to store AI-generated personalized recommendations for users.
  Recommendations are cached per category and can be regenerated on demand.
*/

-- User Recommendations: Cached AI-generated recommendations
CREATE TABLE IF NOT EXISTS user_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  recommendation_title text NOT NULL,
  recommendation_description text,
  rank int NOT NULL DEFAULT 1,
  location text, -- For local recommendations (city/coordinates)
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_category_rank UNIQUE(user_id, category, rank)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_category ON user_recommendations(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_generated_at ON user_recommendations(generated_at);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_category ON user_recommendations(category);

-- Enable Row Level Security
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_recommendations
-- Users can only view their own recommendations
CREATE POLICY "Users can view their own recommendations"
  ON user_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own recommendations
CREATE POLICY "Users can insert their own recommendations"
  ON user_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recommendations
CREATE POLICY "Users can update their own recommendations"
  ON user_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recommendations
CREATE POLICY "Users can delete their own recommendations"
  ON user_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_recommendations_updated_at
  BEFORE UPDATE ON user_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_recommendations_updated_at();



