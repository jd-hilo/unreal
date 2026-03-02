CREATE TABLE IF NOT EXISTS dream_self_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE dream_self_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dream self chats" ON dream_self_chats FOR ALL USING (auth.uid() = user_id);
CREATE INDEX dream_self_chats_user_id_idx ON dream_self_chats(user_id);
CREATE INDEX dream_self_chats_updated_at_idx ON dream_self_chats(updated_at DESC);
