-- Add simulation_credits column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS simulation_credits integer DEFAULT 5;

-- Set default value of 5 for existing users who don't have credits set
UPDATE profiles 
SET simulation_credits = 5 
WHERE simulation_credits IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_simulation_credits ON profiles(simulation_credits);



