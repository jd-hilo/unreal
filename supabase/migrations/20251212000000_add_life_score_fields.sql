-- Add life score fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS life_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS life_score_previous INTEGER,
ADD COLUMN IF NOT EXISTS life_score_last_updated DATE,
ADD COLUMN IF NOT EXISTS life_score_events JSONB,
ADD COLUMN IF NOT EXISTS life_score_peak INTEGER DEFAULT 100;

-- No cap constraint - life score is open-ended (typically 70-130, but can go higher/lower)

-- Create index for faster queries on last updated date
CREATE INDEX IF NOT EXISTS idx_profiles_life_score_updated ON profiles(life_score_last_updated);

-- Comments on columns
COMMENT ON COLUMN profiles.life_score IS 'Current Life Score (open-ended integer, typically 70-130) for Life Sim Daily feature';
COMMENT ON COLUMN profiles.life_score_previous IS 'Previous day''s Life Score for comparison';
COMMENT ON COLUMN profiles.life_score_last_updated IS 'Date when Life Score was last updated';
COMMENT ON COLUMN profiles.life_score_events IS 'JSON array of today''s event cards with deltas and messages';
COMMENT ON COLUMN profiles.life_score_peak IS 'Highest Life Score ever achieved by the user';

