-- Year Predictions table for 2026 prediction feature
CREATE TABLE IF NOT EXISTS year_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_type text NOT NULL CHECK (scenario_type IN ('estimated', 'best_case', 'worst_case')),
  probability_percentage integer, -- For estimated scenario
  prediction_data jsonb NOT NULL, -- Stores the full prediction content
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_year_predictions_user_id ON year_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_year_predictions_scenario_type ON year_predictions(user_id, scenario_type);

-- Enable RLS
ALTER TABLE year_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own predictions
CREATE POLICY "Users can view their own year predictions"
  ON year_predictions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own predictions
CREATE POLICY "Users can insert their own year predictions"
  ON year_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "Users can update their own year predictions"
  ON year_predictions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own predictions
CREATE POLICY "Users can delete their own year predictions"
  ON year_predictions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_year_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_year_predictions_updated_at
  BEFORE UPDATE ON year_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_year_predictions_updated_at();












