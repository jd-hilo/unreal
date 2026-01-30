ALTER TABLE profiles ADD COLUMN IF NOT EXISTS est_days_remaining TEXT;

-- Migration: update_dream_self_progress_to_jsonb.sql
-- Description: Changes dream_self_progress to JSONB to track multiple areas

-- First, drop the existing numeric column
ALTER TABLE profiles DROP COLUMN IF EXISTS dream_self_progress;

-- Add it back as JSONB with default values for the 5 areas
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dream_self_progress JSONB DEFAULT '{
    "Financial": 0,
    "Personal": 0,
    "Lifestyle": 0,
    "Health": 0,
    "Growth": 0
}'::jsonb;

COMMENT ON COLUMN profiles.dream_self_progress IS 'Progress tracking for each of the 5 dream self areas';
