/*
  # Create Onboarding Tasks Table
  
  ## Description
  Creates a table to track onboarding tasks for new users.
  Users must complete 3 tasks before accessing daily path:
  1. Ask a decision
  2. Simulate their career
  3. Invite a friend
  
  ## Changes
  - Create onboarding_tasks table
  - Add RLS policies
  - Create helper function to initialize tasks for new users
  - Create function to check if all tasks are complete
*/

-- Create onboarding_tasks table
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN ('ask_decision', 'simulate_career', 'invite_friend')),
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_user_id ON onboarding_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_user_type ON onboarding_tasks(user_id, task_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_completed ON onboarding_tasks(user_id, is_completed);

-- Enable Row Level Security
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own onboarding tasks"
  ON onboarding_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding tasks"
  ON onboarding_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding tasks"
  ON onboarding_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding tasks"
  ON onboarding_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Helper function to initialize onboarding tasks for a user
CREATE OR REPLACE FUNCTION initialize_onboarding_tasks(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert the 3 onboarding tasks if they don't exist
  INSERT INTO onboarding_tasks (user_id, task_type)
  VALUES 
    (p_user_id, 'ask_decision'),
    (p_user_id, 'simulate_career'),
    (p_user_id, 'invite_friend')
  ON CONFLICT (user_id, task_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if all onboarding tasks are complete
CREATE OR REPLACE FUNCTION are_onboarding_tasks_complete(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  total_tasks integer;
  completed_tasks integer;
BEGIN
  -- Count total tasks
  SELECT COUNT(*) INTO total_tasks
  FROM onboarding_tasks
  WHERE user_id = p_user_id;
  
  -- If no tasks exist, return false
  IF total_tasks = 0 THEN
    RETURN false;
  END IF;
  
  -- Count completed tasks
  SELECT COUNT(*) INTO completed_tasks
  FROM onboarding_tasks
  WHERE user_id = p_user_id AND is_completed = true;
  
  -- Return true if all 3 tasks are completed
  RETURN completed_tasks >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to auto-complete tasks based on existing data
CREATE OR REPLACE FUNCTION check_and_complete_onboarding_tasks(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user has any decisions and mark task complete
  UPDATE onboarding_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = p_user_id 
    AND task_type = 'ask_decision'
    AND is_completed = false
    AND EXISTS (SELECT 1 FROM decisions WHERE user_id = p_user_id LIMIT 1);
  
  -- Check if user has any career simulations and mark task complete
  UPDATE onboarding_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = p_user_id 
    AND task_type = 'simulate_career'
    AND is_completed = false
    AND EXISTS (SELECT 1 FROM career_simulations WHERE user_id = p_user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE onboarding_tasks IS 'Tracks completion of onboarding tasks for new users';
COMMENT ON COLUMN onboarding_tasks.task_type IS 'Type of onboarding task: ask_decision, simulate_career, or invite_friend';
COMMENT ON COLUMN onboarding_tasks.is_completed IS 'Whether the task has been completed';
COMMENT ON COLUMN onboarding_tasks.completed_at IS 'Timestamp when the task was completed';
