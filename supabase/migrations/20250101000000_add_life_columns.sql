-- Add dedicated columns for life situation, life journey, and core values
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS life_situation TEXT,
ADD COLUMN IF NOT EXISTS life_journey TEXT,
ADD COLUMN IF NOT EXISTS core_value TEXT;

-- Comments on columns
COMMENT ON COLUMN profiles.life_situation IS 'AI-generated paragraph summarizing current life situation';
COMMENT ON COLUMN profiles.life_journey IS 'AI-generated paragraph summarizing life journey and path';
COMMENT ON COLUMN profiles.core_value IS 'AI-generated paragraph summarizing core values';





