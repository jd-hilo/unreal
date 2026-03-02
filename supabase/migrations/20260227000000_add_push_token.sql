-- Add push notification token and timezone to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_token_tz TEXT;
