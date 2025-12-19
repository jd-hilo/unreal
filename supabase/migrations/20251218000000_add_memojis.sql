-- Create user_memojis table
CREATE TABLE IF NOT EXISTS user_memojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, url)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_memojis_user_id ON user_memojis(user_id);

-- Add selected_memoji_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_memoji_url TEXT;

-- Enable RLS on user_memojis table
ALTER TABLE user_memojis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_memojis
-- Users can only see their own memojis
CREATE POLICY "Users can view their own memojis"
  ON user_memojis FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own memojis
CREATE POLICY "Users can insert their own memojis"
  ON user_memojis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own memojis
CREATE POLICY "Users can delete their own memojis"
  ON user_memojis FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for memojis (if it doesn't exist)
-- Note: This needs to be run manually in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('memojis', 'memojis', true)
-- ON CONFLICT (id) DO NOTHING;
