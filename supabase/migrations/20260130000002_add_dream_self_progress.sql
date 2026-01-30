-- Migration: add_dream_self_progress.sql
-- Description: Adds dream_self_progress column to profiles

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dream_self_progress NUMERIC DEFAULT 0;

COMMENT ON COLUMN profiles.dream_self_progress IS 'Progress percentage (0-100) towards becoming the dream self';
