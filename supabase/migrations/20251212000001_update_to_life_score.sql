-- Update twin_score fields to life_score
-- This migration updates the existing twin_score system to use life_score instead

-- Rename columns (if they exist, otherwise create new ones)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS twin_score,
  DROP COLUMN IF EXISTS twin_score_previous,
  DROP COLUMN IF EXISTS twin_score_last_updated,
  DROP COLUMN IF EXISTS twin_score_events;

-- Add new life_score columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS life_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS life_score_previous INTEGER,
  ADD COLUMN IF NOT EXISTS life_score_last_updated DATE,
  ADD COLUMN IF NOT EXISTS life_score_events JSONB,
  ADD COLUMN IF NOT EXISTS life_score_net_delta INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS life_score_peak INTEGER DEFAULT 100; -- Track highest score ever

-- Add check constraint for life_score to be >= 0 (no upper limit)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS twin_score_range,
  ADD CONSTRAINT life_score_min CHECK (life_score >= 0);

COMMENT ON COLUMN profiles.life_score IS 'The user''s current Life Score (starts at 100, can exceed 100).';
COMMENT ON COLUMN profiles.life_score_previous IS 'The user''s Life Score from the previous day.';
COMMENT ON COLUMN profiles.life_score_last_updated IS 'The date when the Life Score was last updated (daily refresh at midnight user timezone).';
COMMENT ON COLUMN profiles.life_score_events IS 'JSONB array of daily event cards that influenced the Life Score.';
COMMENT ON COLUMN profiles.life_score_net_delta IS 'Net delta from today''s events.';
COMMENT ON COLUMN profiles.life_score_peak IS 'Highest Life Score the user has ever achieved.';

