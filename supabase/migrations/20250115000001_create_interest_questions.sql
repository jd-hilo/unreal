/*
  # Interest Questions Table

  Creates a table to store pre-populated "This or That" question pairs.
  Questions are pre-loaded with images and descriptions, similar to Couple Joy.
*/

-- Interest Questions: Pre-populated question pairs with images
CREATE TABLE IF NOT EXISTS interest_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_a_image_url text NOT NULL,
  option_b_image_url text NOT NULL,
  option_a_description text,
  option_b_description text,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interest_questions_category ON interest_questions(category, is_active);
CREATE INDEX IF NOT EXISTS idx_interest_questions_display_order ON interest_questions(category, display_order);

-- Enable Row Level Security (public read, admin write)
ALTER TABLE interest_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interest_questions
-- Allow anyone to read active questions
CREATE POLICY "Anyone can view active interest questions"
  ON interest_questions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can insert/update (you'll need to create admin role or use service role)
-- For now, we'll allow authenticated users to insert (you can restrict this later)
CREATE POLICY "Authenticated users can insert interest questions"
  ON interest_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update interest questions"
  ON interest_questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);






