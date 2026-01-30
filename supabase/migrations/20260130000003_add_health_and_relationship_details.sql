-- Migration: add_health_and_relationship_details.sql
-- Description: Adds current_health and relationship_details columns to profiles

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_health JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS relationship_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.current_health IS 'Array of health and fitness status markers';
COMMENT ON COLUMN profiles.relationship_details IS 'Detailed relationship info (years, partner name, etc.)';
