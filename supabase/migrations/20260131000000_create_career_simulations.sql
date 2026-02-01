-- Create career_simulations table for saving career simulation results
CREATE TABLE IF NOT EXISTS career_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_horizon integer NOT NULL CHECK (time_horizon IN (5, 10, 15)),
  path_type text NOT NULL CHECK (path_type IN ('stay', 'switch', 'startup')),
  role_title text,
  company text,
  salary text,
  simulation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_simulations_user_id ON career_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_career_simulations_created_at ON career_simulations(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE career_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_simulations
CREATE POLICY "Users can view own career simulations"
  ON career_simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career simulations"
  ON career_simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career simulations"
  ON career_simulations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own career simulations"
  ON career_simulations FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_career_simulations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_career_simulations_updated_at
  BEFORE UPDATE ON career_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_career_simulations_updated_at();
