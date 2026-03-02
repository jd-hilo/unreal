CREATE TABLE IF NOT EXISTS life_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE life_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own life chats" ON life_chats FOR ALL USING (auth.uid() = user_id);
CREATE INDEX life_chats_user_id_idx ON life_chats(user_id);
CREATE INDEX life_chats_updated_at_idx ON life_chats(updated_at DESC);
