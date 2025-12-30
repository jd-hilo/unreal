-- Add avatar fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_variant TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_colors JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_reason TEXT;

