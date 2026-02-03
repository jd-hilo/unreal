/*
  # Leaderboard & Friends System

  ## Changes
  - Create friendships table for reciprocal friend relationships
  - Add current_streak and total_points columns to profiles
  - Create RPC function to add friends by twin_code
  - Create RPC function to get leaderboard data (user + friends)
  - Add RLS policies for friendships table

  ## Security
  - RLS policies ensure users can only view/manage their own friendships
  - Friendships are reciprocal (A->B and B->A)
*/

-- Add leaderboard tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 != user_id_2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_1 ON friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_2 ON friendships(user_id_2);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can insert their own friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id_1);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id_1);

-- RPC: Add friend by twin code
CREATE OR REPLACE FUNCTION add_friend_by_code(code text)
RETURNS jsonb AS $$
DECLARE
  friend_user_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Find user by twin_code
  SELECT user_id INTO friend_user_id
  FROM profiles
  WHERE twin_code = code;
  
  -- Check if user exists
  IF friend_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with that code'
    );
  END IF;
  
  -- Check if trying to add self
  IF friend_user_id = current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot add yourself as a friend'
    );
  END IF;
  
  -- Check if friendship already exists
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id_1 = current_user_id AND user_id_2 = friend_user_id)
       OR (user_id_1 = friend_user_id AND user_id_2 = current_user_id)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already friends with this user'
    );
  END IF;
  
  -- Insert reciprocal friendships (A->B and B->A)
  INSERT INTO friendships (user_id_1, user_id_2)
  VALUES 
    (current_user_id, friend_user_id),
    (friend_user_id, current_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'friend_user_id', friend_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get leaderboard (current user + friends)
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  total_points integer,
  current_streak integer,
  created_at timestamptz,
  is_current_user boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.first_name,
    p.total_points,
    p.current_streak,
    p.created_at,
    (p.user_id = auth.uid()) as is_current_user
  FROM profiles p
  WHERE p.user_id = auth.uid()
     OR p.user_id IN (
       SELECT f.user_id_2 
       FROM friendships f 
       WHERE f.user_id_1 = auth.uid()
     )
  ORDER BY p.total_points DESC, p.current_streak DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN profiles.current_streak IS 'Current consecutive day streak for the user';
COMMENT ON COLUMN profiles.total_points IS 'Total points earned by the user for leaderboard ranking';
