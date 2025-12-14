-- Add ab_test_group column to profiles table
-- This column stores the A/B test group assignment ('A' or 'B')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ab_test_group text CHECK (ab_test_group IN ('A', 'B'));

-- Create index on ab_test_group for faster lookups and analytics
CREATE INDEX IF NOT EXISTS idx_profiles_ab_test_group ON profiles(ab_test_group);

-- Assign all existing users to group A
-- This ensures all current users are in the control group
UPDATE profiles 
SET ab_test_group = 'A' 
WHERE ab_test_group IS NULL;


