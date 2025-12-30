-- Add local preferences fields to profiles table
-- Note: food_preferences and fun_preferences are stored in core_json.onboarding_responses['local-preferences']
-- These columns are kept for potential future use but are not currently used
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_preferences JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fun_preferences JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_known_latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_known_longitude DECIMAL(11, 8);

