-- Migration: add_architect_feedback.sql
-- Description: Adds feedback column to daily_tasks and creates a table for architect sessions

ALTER TABLE daily_tasks 
ADD COLUMN IF NOT EXISTS feedback_journal TEXT;

COMMENT ON COLUMN daily_tasks.feedback_journal IS 'User feedback after completing daily tasks';

-- Table to track architect sessions/feedback history
CREATE TABLE IF NOT EXISTS architect_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    feedback TEXT NOT NULL,
    completed_tasks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE architect_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own architect feedback"
    ON architect_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own architect feedback"
    ON architect_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_architect_feedback_user_id ON architect_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_architect_feedback_date ON architect_feedback(date);
