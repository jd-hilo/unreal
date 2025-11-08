-- Add first_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;

-- Create index on first_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);

