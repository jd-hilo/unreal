-- Add is_premium field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Create index for faster premium user queries
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(is_premium) WHERE is_premium = true;

-- Comment on the column
COMMENT ON COLUMN profiles.is_premium IS 'Whether the user has an active premium subscription';

