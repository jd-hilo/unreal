-- Migration: add_dream_self.sql
-- Description: Adds dream_vision column to profiles and creates daily_tasks table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dream_vision JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.dream_vision IS 'Stores the user''s dream self vision and goals';

-- Create daily_tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_content TEXT NOT NULL,
    category TEXT,
    is_completed BOOLEAN DEFAULT false,
    scheduled_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own daily tasks"
    ON daily_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily tasks"
    ON daily_tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily tasks"
    ON daily_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily tasks"
    ON daily_tasks FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_id ON daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_scheduled_date ON daily_tasks(scheduled_date);
