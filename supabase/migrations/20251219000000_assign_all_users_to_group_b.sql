-- Assign all users to group B
-- This migration updates all existing users to be in test group B
UPDATE profiles 
SET ab_test_group = 'B' 
WHERE ab_test_group IS NULL OR ab_test_group = 'A';


