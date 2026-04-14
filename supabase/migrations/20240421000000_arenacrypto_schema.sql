-- ArenaCrypto: Core Database Schema
-- Focus: Real-time matchmaking, secure fund handling, and AI evidence tracking.

-- 1. Profiles & Metadata
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE, -- Controls Ads visibility
  total_won DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Internal Wallets (Ledger)
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  balance_stablecoin DECIMAL DEFAULT 0 CHECK (balance_stablecoin >= 0),
  last_tx_sync_hash TEXT, -- Last on-chain Polygon TX hash synced
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Matchmaking Queue (Real-time)
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  stake_amount DECIMAL NOT NULL CHECK (stake_amount > 0),
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matches (Gaming Arena)
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES profiles(id) NOT NULL,
  player2_id UUID REFERENCES profiles(id) NOT NULL,
  stake_amount DECIMAL NOT NULL,
  house_commission DECIMAL NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'evidence_pending', 'validating', 'resolved', 'disputed')),
  winner_id UUID REFERENCES profiles(id),
  chat_id UUID, -- Optional: Link to a specific chat resource
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_players CHECK (player1_id <> player2_id)
);

-- 5. Match Chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Evidence Submissions (AI Validation)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES profiles(id) NOT NULL,
  evidence_url TEXT NOT NULL, -- Storage link
  ai_status TEXT DEFAULT 'pending' CHECK (ai_status IN ('pending', 'processing', 'completed', 'failed')),
  ai_data JSONB, -- Details from Gemini Vision (Winner, Score, Confidence)
  ai_confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Security) - Initial thought:
-- Wallets: user_id = auth.uid()
-- Matchmaking Queue: user_id = auth.uid()
-- Matches: auth.uid() IN (player1_id, player2_id)
-- Chat: auth.uid() IN (participants of the match)
