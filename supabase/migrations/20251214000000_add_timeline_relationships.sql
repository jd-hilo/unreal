-- Add relationships column to timelines table
ALTER TABLE timelines ADD COLUMN IF NOT EXISTS relationships jsonb[] DEFAULT '{}'::jsonb[];








