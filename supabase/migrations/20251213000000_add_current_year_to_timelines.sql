-- Add current_year field to track simulation year (starts at 1 for each simulation)
ALTER TABLE timelines ADD COLUMN IF NOT EXISTS current_year integer DEFAULT 1;

-- Update existing timelines to have current_year = 1 if null
UPDATE timelines SET current_year = 1 WHERE current_year IS NULL;



