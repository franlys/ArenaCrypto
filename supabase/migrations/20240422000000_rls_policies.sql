-- ArenaCrypto: Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Wallets (Strict)
CREATE POLICY "Users can only see their own wallet balance" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Note: No Direct Insert/Update/Delete for users. Handled via Service Role/Functions.

-- 3. Matchmaking Queue
CREATE POLICY "Users can see their own queue entries" ON matchmaking_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own queue entries" ON matchmaking_queue
  FOR ALL USING (auth.uid() = user_id);

-- 4. Matches (Participant Access)
CREATE POLICY "Participants can view their matches" ON matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- 5. Chat Messages
CREATE POLICY "Participants can view match messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = chat_messages.match_id 
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send match messages" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = chat_messages.match_id 
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );

-- 6. Submissions
CREATE POLICY "Participants can view match submissions" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = submissions.match_id 
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );

CREATE POLICY "Participants can upload evidence" ON submissions
  FOR INSERT WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = submissions.match_id 
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );
