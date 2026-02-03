/*
  # Add Points System to Daily Tasks
  
  ## Description
  Adds a points column to daily_tasks to track difficulty/reward for each task.
  Points scale based on user progress and task difficulty.
  
  ## Changes
  - Add points column to daily_tasks table (default 10 points)
  - Points range: 10-50 based on difficulty and user progress
*/

-- Add points column to daily_tasks
ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS points integer DEFAULT 10;

COMMENT ON COLUMN daily_tasks.points IS 'Points awarded for completing this task (10-50 based on difficulty)';
